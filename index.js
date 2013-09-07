var level = require('level'),
    util = require('util'),
    through = require('through'),
    timestamp = require('monotonic-timestamp'),
    sublevel = require('level-sublevel');

/**
 * Main Microblog Class
 */

function LevelMicroBlog(dbPath) {
  if (!(this instanceof LevelMicroBlog)) return new LevelMicroBlog(dbPath);
  this.db = sublevel(level(dbPath, { valueEncoding: 'json' }));
  this.Users = new Users(this);
  this.Messages = new Messages(this);
}

LevelMicroBlog.prototype.close = function(cb) {
  if (this.db) return this.db.close(cb);
  this.db = null;
  cb(null);
}

/**
 * Model
 */

function Models(mblog, name, key) {
  this.name = name;
  this.key = key;
  this.mblog = mblog;
  this[this.name] = this.mblog.db.sublevel(name);
}

Models.prototype.all = function(cb) {
  var models = [];
  this[this.name].createReadStream().pipe(through(write, end));
  function write(model) {
    models.push(model.value);
  }
  function end() {
    cb(null, models);
  }
};

Models.prototype.save = function(model, cb) {
  var key = this.getKey(model);
  this[this.name].put(key, model, function (err) {
    if (err) return cb(err);
    cb(null, key);
  });
};


Models.prototype.get = function(key, cb) {
  this[this.name].get(key, function (err, data) {
    if (err) return cb(err);
    cb(null, data);
  });
};

Models.prototype.del = function(key, cb) {
  this[this.name].del(key, cb);
};

Models.prototype.getKey = function(model) {
  if (typeof model[this.key] === 'undefined' && this.keyfn) {
    return this.keyfn(model);
  } else {
    return model[this.key];
  }
};

/**
 * User
 */

function Users(mblog) {
  Models.call(this, mblog, 'users', 'handle');
}
util.inherits(Users, Models);

Users.prototype.message = function(handle, msg, cb) {
  process.nextTick(function () {
    cb(null, {});
  });
};

/**
 * Message
 */

function Messages(mblog) {
  Models.call(this, mblog, 'messages', 'id');
}
util.inherits(Messages, Models);

Messages.prototype.keyfn = timestamp;

module.exports = LevelMicroBlog;
