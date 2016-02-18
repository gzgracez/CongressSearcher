var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('congress.db');
// db.run("INSERT INTO tomcrud (character, movie, year) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)",
//   "Maverick", "Top Gun", 1986,
//   "Cage","Edge of Tomorrow", 2014,
//   "Ethan Hunt",  "Mission Impossible", 1996,
//   "Joel Goodson", "Risky Business",  1983,
//   "Lt. Daniel Kaffee", "A Few Good Men", 1992,
//   function(err) {
//     if (err) { throw err;}
//   }
// );