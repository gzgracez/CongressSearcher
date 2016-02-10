var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var fs = require('fs');
var path = require('path');
var path = require('ejs');
var flash = require('express-flash');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({secret: 'CongressSearcherYay'}));
app.use(flash());
var content = fs.readFileSync("static/index.html", 'utf8');
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
  else if (req.session.user.userType == "admin") {
    var users = fs.readFileSync('data/users.json', 'utf8');
    var userJSON = JSON.parse(users);
    res.render('index', {title: 'Congress Searcher', users: userJSON});
  }
  else {
    res.render('index', {title: 'Congress Searcher'});
  }
});

app.get('/dashboard', function (req, res) {
  if (req.session.user) {
    req.session.returnTo = req.path;
    res.render('dashboard', {title: 'My Dashboard'});
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

app.get('/register',function(req,res) {
  res.render('account/register', {title: 'Register'});
});

app.post('/register',function(req,res) {
  var taken = false;
  var users = fs.readFileSync('data/users.json', 'utf8');
  var userJSON = JSON.parse(users);
  for (var i = 0; i < userJSON.length; i++) {
    if (req.body.rUser.username == userJSON[i]["username"]) {
      taken = true;
      req.flash("notification", "Username already taken.");
      res.redirect('/register');
      break;
    }
    else if (req.body.rUser.email == userJSON[i]["email"]) {
      taken = true;
      req.flash("notification", "Email already in use.");
      res.redirect('/register');
      break;
    }
  }
  if (!taken) {
    var newUser = {
      "id": userJSON[userJSON.length - 1].id + 1,
      "userType": "student",
      "username": req.body.rUser.username,
      "password": req.body.rUser.password,
      "firstName": req.body.rUser.firstName,
      "lastName": req.body.rUser.lastName,
      "email": req.body.rUser.email,
      "clubs_member": [],
      "clubs_leader": []
    };
    userJSON.push(newUser);
    var jsonString = JSON.stringify(userJSON, null, 2);
    fs.writeFile("data/users.json", jsonString);
    req.flash("notification", "New Account Added");
    res.redirect('/');
  }
});

app.post('/login',function(req,res) {
  var users = fs.readFileSync('data/users.json', 'utf8');
  var userJSON = JSON.parse(users);
  for (var i = 0; i < userJSON.length; i++) {
    if (req.body.lUser.username == userJSON[i]["username"] && req.body.lUser.password == userJSON[i]["password"]) {
      req.session.user = userJSON[i];
      req.session.uid = i;
      break;
    }
  }
  if (req.session.user) {
    req.flash("notification", "Successfully logged in!");
  }
  else {
    req.flash("notification", "Could not log in - username or password was incorrect");
  }
  res.redirect('/');
});

app.get('/logout',function(req,res) {
  req.session.user = null;
  req.session.uid = null;
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
    var users = fs.readFileSync('data/users.json', 'utf8');
    var userJSON = JSON.parse(users);
    res.render('account/allusers', {title: 'All Users', users: userJSON});
  }
  else {
    res.render('notLoggedInAdmin', {title: 'All Users'});
  }
});

app.get('/roster/:id', function(req,res) {
  if (!req.session.user) {
    res.render('notLoggedInAdmin', {title: 'Club Roster'});
  }
  else {
    var clubID = parseInt(req.params.id);
    var clubs = fs.readFileSync('data/clubs.json', 'utf8');
    var clubsJSON = JSON.parse(clubs);
    var users = fs.readFileSync('data/users.json', 'utf8');
    var userJSON = JSON.parse(users);
    var members = [];
    for (var i = 0; i < userJSON.length; i++) {
      if (userJSON[i]["clubs_member"].indexOf(clubID) > -1) {
        var tempUser = {
          "fullname": userJSON[i]["firstName"] + " " + userJSON[i]["lastName"],
          "username": userJSON[i]["username"],
          "email": userJSON[i]["email"],
          "type": "Club Member",
          "uid": userJSON[i]["id"]
        }
        members.push(tempUser);
      }
      else if (userJSON[i]["clubs_leader"].indexOf(clubID) > -1) {
        var tempUser = {
          "fullname": userJSON[i]["firstName"] + " " + userJSON[i]["lastName"],
          "username": userJSON[i]["username"],
          "email": userJSON[i]["email"],
          "type": "Club Leader",
          "uid": userJSON[i]["id"]
        }
        members.push(tempUser);
      }
    }
    var club = clubsJSON[clubID];
    req.session.returnTo = req.path;
    res.render('clubs/roster', {title: club["clubname"] + ' Roster', club: club, members: members});
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