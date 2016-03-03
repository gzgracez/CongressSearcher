var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var fs = require('fs');
var path = require('path');
var path = require('ejs');
var flash = require('express-flash');
var sqlite3 = require('sqlite3').verbose();
var http = require('http');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({secret: 'CongressSearcherYay'}));
app.use(flash());
var db = new sqlite3.Database('data/congress.db');
app.use("/static", express.static('static'));
app.use('/bower_components',  express.static('/bower_components'));
app.set('view engine', 'ejs');
app.use(function(req,res,next){
  res.locals.session = req.session;
  next();
});

app.get('/', function (req, res) {
  if (!req.session.user) {
    db.all('SELECT * FROM users;', function(err, rows) {
      if (err) { throw err;}
    });
    res.render('index', {title: 'Congress Searcher'});
  }
  else {
    db.all('SELECT * FROM users;', function(err, rows) {
      if (err) { throw err;}
    });
    // res.render('index', {title: 'Congress Searcher', user: names});
    res.render('index', {title: 'Congress Searcher'});
  }
});

app.get('/dashboard', function (req, res) {
  if (req.session.user) {
    req.session.returnTo = req.path;
    var returnedJSON;
    var str = "SELECT * FROM userLegs WHERE idUser=" + req.session.user.uid + ";";
    db.all(str, function(err, result) {
          if (err) { throw err;}
          else { 
          res.render('dashboard', {title: 'My Dashboard', json: result});
          }
        }
      );
  }
  else
    res.render('notLoggedIn', {title: 'My Dashboard'});
});

app.get('/users',function(req,res) {
  if (req.session.user["userType"] == "admin") {
    var users = fs.readFileSync('data/users.json', 'utf8');
    JSON.parse(users);
    res.send(users);
  }
  else {
    res.render('notLoggedInAdmin', {title: 'All Users'});
  }
});

app.get('/myaccount', function (req, res) {
  if (req.session.user)
    res.render('account/myaccount', {title: 'My Account'});
  else
    res.render('notLoggedIn', {title: 'My Account'});
});

app.get('/editaccount', function (req, res) {
  if (req.session.user)
    res.render('account/editaccount', {title: 'Edit Account'});
  else
    res.render('notLoggedIn', {title: 'Edit Account'});
});

app.post('/editaccount', function (req, res) {
  var i = req.session.uid;
  var users = fs.readFileSync('data/users.json', 'utf8');
  var userJSON = JSON.parse(users);
  var taken = false;
  for (var j = 0; j < userJSON.length; j++) {
    if (req.body.eUser.username == userJSON[j]["username"]) {
      if (!(userJSON[j]["username"] == userJSON[i]["username"])) {
        taken = true;
        req.flash("notification", "Username already taken.");
        res.redirect('/editaccount');
        break;
      }
    }
    else if (req.body.eUser.email == userJSON[j]["email"]) {
      if (!(userJSON[j]["email"] == userJSON[i]["email"])) {
        taken = true;
        req.flash("notification", "Email already in use.");
        res.redirect('/editaccount');
        break;
      }
    }
  }
  if (!taken) {
    userJSON[i]["firstName"] = req.body.eUser.firstName;
    userJSON[i]["lastName"] = req.body.eUser.lastName;
    userJSON[i]["email"] = req.body.eUser.email;
    userJSON[i]["username"] = req.body.eUser.username;
    userJSON[i]["password"] = req.body.eUser.password;
    req.session.user = userJSON[i];
    var jsonString = JSON.stringify(userJSON, null, 2);
    fs.writeFile("data/users.json", jsonString);
    req.flash("notification", "Account Information Edited!");
    res.redirect('/');
  }
});

app.get('/search',function(req,res) {
  if (req.session.user) {
    req.session.returnTo = req.path;
    if (req.session.search != null) {
      var returnedJSON;
      var options = {
        host: 'congress.api.sunlightfoundation.com',
        path: '/legislators/locate?zip=' + req.session.search + '&apikey=618aca255b0e4f2ea13ad073a3fe3856'
      };
      callback = function(response) {
        var str = '';
        response.on('data', function (chunk) {
          str += chunk;
        });
        response.on('end', function () {
          returnedJSON = JSON.parse(str);
          console.log(returnedJSON["results"]);
          res.render('search', {title: 'Search', json: returnedJSON["results"], zipcode: parseInt(req.session.search)});
        });
      };
      http.request(options, callback).end();
    }
    else {
      res.render('search', {title: 'Search', json: undefined});
    }
  }
  else
    res.render('notLoggedIn', {title: 'Search'});
});

app.post('/search', function (req, res) {
  req.session.returnTo = req.path;
  req.session.search = req.body.uSearch["zipcode"];
  res.redirect('/search');
});

app.get('/search/:id',function(req,res) {
  if (req.session.user) {
    req.session.returnTo = req.path;
    var options = {
      host: 'congress.api.sunlightfoundation.com',
      path: '/bills/search?apikey=618aca255b0e4f2ea13ad073a3fe3856&sponsor_id=' + req.params.id
    };
    callback = function(response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });
      response.on('end', function () {
        returnedJSON = JSON.parse(str);
        console.log(returnedJSON["results"]);
        res.render('legislatorInfo', {title: returnedJSON["results"][0]["sponsor"]["first_name"] + " " + returnedJSON["results"][0]["sponsor"]["last_name"] + "'s Bills", json: returnedJSON["results"]});
      });
    };
    http.request(options, callback).end();
  }
  else
    res.render('notLoggedIn', {title: 'Legislator Info'});
});

app.post('/saveleg/:id/:first/:last',function(req,res) {
  if (req.session.user) {
    req.session.returnTo = req.path;
    var str = "SELECT * FROM userLegs WHERE idUser=" + req.session.user.uid + " AND idLeg='" + req.params.id + "';";
    db.all(str, function(err, result) {
          if (err) { throw err;}
          else { 
            if (result.length > 0) {
              req.flash("notification", "Legislator already saved");
              res.redirect('/search');
            }
            else {
              var name = req.params.first + " " + req.params.last;
              db.run("INSERT INTO userLegs (idUser, idLeg, name) VALUES (?, ?, ?)",
                req.session.user.uid, req.params.id, name,
                function(err) {
                  if (err) { throw err;}
                }
              );
              req.flash("notification", "New Legislator Saved");
              res.redirect('/search');
            }
          }
        }
      );
  }
  else
    res.render('notLoggedIn', {title: 'Save Legislator'});
});

app.get('/register',function(req,res) {
  res.render('account/register', {title: 'Register'});
});

app.post('/register',function(req,res) {
  var taken = false;
  db.all("SELECT * FROM users WHERE username='" + req.body.rUser.username + "';",
    function(err, result) {
      if (err) { throw err;}
      else { 
        console.log(result);
        if (result.length > 0) {
          taken = true;
          req.flash("notification", "Username already taken.");
          res.redirect('/register');
        }
        else {
          db.run("INSERT INTO users (username, password, firstname, lastname) VALUES (?, ?, ?, ?)",
            req.body.rUser.username, req.body.rUser.password, req.body.rUser.firstName, req.body.rUser.lastName,
            function(err) {
              if (err) { throw err;}
            }
          );
          req.flash("notification", "New Account Added");
          res.redirect('/');
        }
      }
    }
  );
});

app.post('/login',function(req,res) {
  var str = "SELECT * FROM users WHERE username=\'" + req.body.lUser.username + "\' AND password=\'" + req.body.lUser.password + "\';";
  db.all(str, function(err, result) {
      if (err) { throw err;}
      else {
        if (result.length > 0) {
          req.session.user = {};
          req.session.user.uid = result[0]["id"];
          req.session.user.username = result[0]["username"];
          req.session.user.password = result[0]["password"];
          req.session.user.firstname = result[0]["firstname"];
          req.session.user.lastname = result[0]["lastname"];
          req.flash("notification", "Successfully logged in!");
        }
        else {
          req.flash("notification", "Could not log in - username or password was incorrect");
        }
        res.redirect('/');
      }
    }
  );
});

app.get('/logout',function(req,res) {
  req.session.user = null;
  req.session.search = null;
  // req.session.destroy();
  req.flash("notification", "Successfully Logged Out!");
  res.redirect('/');
});

app.get('/users',function(req,res) {
  if (req.session.user["userType"] == "admin") {
    var users = fs.readFileSync('data/users.json', 'utf8');
    JSON.parse(users);
    res.send(users);
  }
  else {
    res.render('notLoggedInAdmin', {title: 'All Users'});
  }
});

app.get('/allusers',function(req,res) {
  if (!req.session.user) {
    res.render('notLoggedInAdmin', {title: 'All Users'});
  }
  else if (req.session.user.userType == "admin") {
    db.all('SELECT * FROM users;', function(err, rows) {
      if (err) { throw err;}
    });
    var users = fs.readFileSync('data/users.json', 'utf8');
    var userJSON = JSON.parse(users);
    res.render('account/allusers', {title: 'All Users', users: userJSON});
  }
  else {
    res.render('notLoggedInAdmin', {title: 'All Users'});
  }
});

app.use(function(req, res) {
    res.status(400);
   res.render('404', {title: '404 File Not Found'});
});

if (app.get('env') !== 'development') {
  app.use(function(error, req, res, next) {
      res.status(500);
     res.render('500', {title:'500 Internal Server Error', error: error});
  });
}

var server = app.listen(process.env.PORT || 4000, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});