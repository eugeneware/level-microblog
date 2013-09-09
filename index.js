var level = require('level'),
    util = require('util'),
    through = require('through'),
    bytewise = require('bytewise/hex'),
    timestamp = require('monotonic-timestamp'),
    sublevel = require('level-sublevel'),
    Models = require('level-orm'),
    after = require('after');

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
 * User
 */

function Users(container) {
  Models.call(this, container, 'users', 'handle');
}
util.inherits(Users, Models);

Users.prototype.message = function(handle, msg, cb) {
  var self = this;
  this.get(handle, function (err, user) {
    if (err) return cb(err);
    var message = { handle: user.handle, message: msg };
    self.container.Messages.save(message, function (err, id) {
      if (err) return cb(err);
      var next = after(user.followers.length, done);
      user.followers.forEach(function (follower) {
        message.to = follower;
        self.container.Feed.save(message, next);
      });
      function done(err) {
        if (err) return cb(err);
        cb(null, id);
      }
    });
  });
};

/**
 * Message
 */

function Messages(container) {
  Models.call(this, container, 'messages', 'id');
}
util.inherits(Messages, Models);

Messages.prototype.keyfn = timestamp;

/**
 * Feed
 */
function Feed(container) {
  Models.call(this, container, 'feed', ['to', 'id']);
}
util.inherits(Feed, Models);

Feed.prototype.byUser = function (handle, cb) {
  var msgs = [];
  this.feed.createReadStream({
      start: [handle, -Infinity], end: [handle, +Infinity]
    }).pipe(through(write, end));
  function write(msg) {
    msgs.push(msg.value);
  }
  function end() {
    cb(null, msgs);
  }
};

Feed.prototype.createReadStreamByUser = function (handle, cb) {
  return this.feed.createReadStream(
    { start: [handle, -Infinity], end: [handle, +Infinity], keys: false });
};
