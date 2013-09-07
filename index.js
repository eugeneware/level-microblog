var level = require('level'),
    through = require('through'),
    sublevel = require('level-sublevel');

function LevelMicroBlog(dbPath) {
  if (!(this instanceof LevelMicroBlog)) return new LevelMicroBlog(dbPath);
  this.db = sublevel(level(dbPath, { valueEncoding: 'json' }));
  this.Users = new Users(this);
}

LevelMicroBlog.prototype.close = function(cb) {
  if (this.db) return this.db.close(cb);
  this.db = null;
  cb(null);
}

function Users(mblog) {
  this.mblog = mblog;
  this.users = this.mblog.db.sublevel('users');
}

Users.prototype.all = function(cb) {
  var users = [];
  this.users.createReadStream().pipe(through(write, end));
  function write(user) {
    users.push(user);
  }
  function end() {
    cb(null, users);
  }
};

Users.prototype.save = function(user, cb) {
  this.users.put(user.handle, user, cb);
}

module.exports = LevelMicroBlog;
