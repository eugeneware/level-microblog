var level = require('level'),
    util = require('util'),
    through = require('through'),
    bytewise = require('bytewise-hex'),
    timestamp = require('monotonic-timestamp'),
    sublevel = require('level-sublevel');

module.exports = LevelMicroBlog;

/**
 * Main Microblog Class
 */

function LevelMicroBlog(dbPath) {
  if (!(this instanceof LevelMicroBlog)) return new LevelMicroBlog(dbPath);
  this.db = sublevel(level(dbPath, { keyEncoding: bytewise, valueEncoding: 'json' }));
  this.Users = new Users(this);
  this.Messages = new Messages(this);
  this.Feed = new Feed(this);
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
    var key = this.keyfn(model);
    model[this.key] = key;
    return key;
  } else if (Array.isArray(this.key)) {
    return this.key.map(function (prop) {
      return model[prop];
    });
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
  var self = this;
  this.get(handle, function (err, user) {
    if (err) return cb(err);
    var message = { handle: user.handle, message: msg };
    self.mblog.Messages.save(message, cb);
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

/**
 * Feed
 */
function Feed(mblog) {
  Models.call(this, mblog, 'feed', ['handle', 'id']);
}
util.inherits(Feed, Models);

