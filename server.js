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
    res.render('index', {title: 'Congress Searcher'});
  }
  else {
    res.render('index', {title: 'Congress Searcher'});
  }
});

app.get('/dashboard', function (req, res) {
  if (req.session.user) {
    req.session.returnTo = req.path;
    var returnedJSON;
    var str1 = "SELECT * FROM userLegs WHERE idUser=" + req.session.user.uid + " ORDER BY name ASC;";
    var str2 = "SELECT * FROM userBills WHERE idUser=" + req.session.user.uid + " ORDER BY name ASC;";
    db.all(str1, function(err, result) {
          if (err) { throw err;}
          else { 
            db.all(str2, function(err, result2) {
                if (err) { throw err;}
                else { 
                res.render('dashboard', {title: 'My Dashboard', json: result, bills: result2});
                }
              }
            );
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
  var i = req.session.user.uid;
  db.all("SELECT * FROM users WHERE username='" + req.body.eUser.username + "';",
    function(err, result) {
      if (err) { throw err;}
      else { 
        console.log(result);
        if (result.length > 0 && result[0].username != req.session.user.username) {
          req.flash("notification", "Username already taken.");
          res.redirect('/editaccount');
        }
        else {
          var str = "UPDATE users SET username=?, password=?, firstname=?, lastname=? WHERE id=" + i;
          db.run(str,
            req.body.eUser.username, req.body.eUser.password, req.body.eUser.firstName, req.body.eUser.lastName,
            function(err) {
              if (err) { throw err;}
              else {
                req.session.user.uid = result[0]["id"];
                req.session.user.username = req.body.eUser.username;
                req.session.user.password = req.body.eUser.password;
                req.session.user.firstname = req.body.eUser.firstName;
                req.session.user.lastname = req.body.eUser.lastName;
                req.flash("notification", "Account Information Edited!");
                res.redirect('/');
              }
            }
          );
        }
      }
    }
  );
});

app.get('/search',function(req,res) {
  if (req.session.user) {
    req.session.returnTo = req.path;
    if (req.session.search != null) {
      var returnedJSON;
      var options = {
        host: 'congress.api.sunlightfoundation.com',
        path: '/legislators/locate?apikey=618aca255b0e4f2ea13ad073a3fe3856&zip=' + req.session.search
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

app.post('/savebill/:id/:official',function(req,res) {
  if (req.session.user) {
    var str = "SELECT * FROM userBills WHERE idUser=" + req.session.user.uid + " AND idBill='" + req.params.id + "';";
    db.all(str, function(err, result) {
          if (err) { throw err;}
          else { 
            if (result.length > 0) {
              req.flash("notification", "Bill already saved");
              res.redirect('/search');
            }
            else {
              var name = req.params.official;
              db.run("INSERT INTO userBills (idUser, idBill, name) VALUES (?, ?, ?)",
                req.session.user.uid, req.params.id, name,
                function(err) {
                  if (err) { throw err;}
                }
              );
              req.flash("notification", "New Bill Saved");
              res.redirect(req.session.returnTo);
            }
          }
        }
      );
  }
  else
    res.render('notLoggedIn', {title: 'Save Bill'});
});

app.post('/removelegislator/:id',function(req,res) {
  if (req.session.user) {
    var str = "SELECT * FROM userLegs WHERE idUser=" + req.session.user.uid + " AND idLeg='" + req.params.id + "';";
    db.all(str, function(err, result) {
          if (err) { throw err;}
          else { 
            if (result.length > 0) {
              var str = "DELETE FROM userLegs WHERE idLeg='" + req.params.id + "'";
              db.run(str, function(err) {
                  if (err) { throw err;}
                }
              );
              req.flash("notification", "Legislator Removed!");
              res.redirect('/dashboard');
            }
            else {
              req.flash("notification", "Legislator Not Found");
              res.redirect('/dashboard');
            }
          }
        }
      );
  }
  else
    res.render('notLoggedIn', {title: 'Remove Legislator'});
});

app.post('/removebill/:id',function(req,res) {
  if (req.session.user) {
    var str = "SELECT * FROM userBills WHERE idUser=" + req.session.user.uid + " AND idBill='" + req.params.id + "';";
    db.all(str, function(err, result) {
          if (err) { throw err;}
          else { 
            if (result.length > 0) {
              var str = "DELETE FROM userBills WHERE idBill='" + req.params.id + "'";
              db.run(str, function(err) {
                  if (err) { throw err;}
                }
              );
              req.flash("notification", "Bill Removed!");
              res.redirect('/dashboard');
            }
            else {
              req.flash("notification", "Bill Not Found");
              res.redirect('/dashboard');
            }
          }
        }
      );
  }
  else
    res.render('notLoggedIn', {title: 'Remove Legislator'});
});

app.get('/register',function(req,res) {
  res.render('account/register', {title: 'Register'});
});

app.post('/register',function(req,res) {
  db.all("SELECT * FROM users WHERE username='" + req.body.rUser.username + "';",
    function(err, result) {
      if (err) { throw err;}
      else { 
        console.log(result);
        if (result.length > 0) {
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
  else {
    db.all('SELECT * FROM users;', function(err, rows) {
      if (err) { throw err;}
      else {
        res.render('account/allusers', {title: 'All Users', users: rows});
      }
    });
  }
});

app.get('/ausers',function(req,res) {
  if (!req.session.user) {
    res.render('notLoggedInAdmin', {title: 'All Users'});
  }
  else {
    db.all('SELECT * FROM users;', function(err, rows) {
      if (err) { throw err;}
      else {
        res.send(rows);
      }
    });
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