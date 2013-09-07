var expect = require('expect.js'),
    path = require('path'),
    rimraf = require('rimraf'),
    after = require('after'),
    through = require('through'),
    range = require('range').range,
    levelMicroblog = require('..');

describe('microblog', function() {
  var users, dbPath = path.join(__dirname, '..', 'data', 'testdb'), mblog;
  beforeEach(function(done) {
    rimraf.sync(dbPath); 
    mblog = levelMicroblog(dbPath);
    users = require('./fixture/users.json');
    var next = after(users.length, done);
    users.forEach(function (user) {
      mblog.Users.save(user, next);
    });
  });

  afterEach(function(done) {
    mblog.close(done);
  });

  describe('users', function() {
    it('should be able to store a user', function(done) {
      mblog.Users.save({ 
        handle: 'susanware',
        name: 'Susan Ware'
      }, done);
    });

    it('should be able to retrieve a user', function(done) {
      mblog.Users.get('eugeneware', function (err, user) {
        if (err) return done(err);
        expect(user.handle).to.equal('eugeneware');
        expect(user.name).to.equal('Eugene Ware');
        done();
      });
    });

    it('should be able to delete a user', function(done) {
      mblog.Users.del('eugeneware', get);
      function get(err) {
        if (err) return done(err);
        mblog.Users.get('eugeneware', check);
      }
      function check(err, user) {
        if (err && err.name === 'NotFoundError') return done();
        done(new Error('Problem deleting user'));
      }
    });

    it('should be able to have users', function(done) {
      mblog.Users.all(function (err, users) {
        if (err) return done(err);
        expect(users.length).to.equal(3);
        users.forEach(function (user) {
          expect(user.handle).to.be.ok();
          expect(user.name).to.be.ok();
        });
        done();
      });
    });

    it('should be able to get a list of followers', function(done) {
      mblog.Users.all(function (err, users) {
        if (err) return done(err);
        expect(users.length).to.equal(3);
        users.forEach(function (user) {
          expect(user.followers.length).to.be.above(0);
        });
        done();
      });
    });
  });

  describe('Messages', function() {
    var msgCount = 10;

    beforeEach(function(done) {
      var num = msgCount;
      var next = after(num, done);
      range(0, num).forEach(function (i) {
        mblog.Messages.save({ message: 'This is message ' + i }, next);
      });
    });

    it('should be able to create a new message', function(done) {
      mblog.Messages.save({ message: 'Hello, world!' }, function (err, id) {
        if (err) return done(err);
        expect(id).to.be.above(0);
        done();
      });
    });

    it('should be able to get a list of messages', function(done) {
      mblog.Messages.all(function (err, messages) {
        if (err) return done(err);
        expect(messages.length).to.equal(msgCount);
        messages.forEach(function (message) {
          expect(message.message).to.match(/^This is message [0-9]+$/);
          expect(message.id).to.be.above(0);
        });
        done();
      });
    });

    it('should be able to send a status update', function(done) {
      mblog.Users.message('eugeneware', 'Wazzup?', function (err, id) {
        if (err) return done(err);
        expect(id).to.be.above(0);
        mblog.Messages.get(id, function (err, msg) {
          if (err) return done(err);
          expect(msg.handle).to.equal('eugeneware');
          expect(msg.message).to.equal('Wazzup?');
          expect(msg.id).to.be.above(0);
          done();
        });
      });
    });
  });

  describe('Feed', function() {
    var msgCount = 3;

    beforeEach(function(done) {
      var num = msgCount;
      var next = after(num*users.length, done);
      function prop(name) {
        return function (obj) {
          return obj[name];
        };
      }
      range(0, num).forEach(function (i) {
        users.map(prop('handle')).forEach(function (user) {
          mblog.Users.message(user, 'This is message ' + i, next);
        });
      });
    });

    it('should be able to send a status update to followers', function(done) {
      mblog.Users.message('eugeneware', 'Wazzup?', function (err, id) {
        if (err) return done(err);
        mblog.Feed.get(['rvagg', id], function (err, msg) {
          if (err) return done(err);
          expect(msg.handle).to.equal('eugeneware');
          expect(msg.message).to.equal('Wazzup?');
          expect(msg.id).to.be.above(0);
          expect(msg.to).to.equal('rvagg');
          done();
        });
      });
    });

    it('should be able to get the feed for a user', function(done) {
      mblog.Feed.byUser('eugeneware', function (err, msgs) {
        if (err) return done(err);
        msgs.forEach(function (msg) {
          expect(msg.to).to.equal('eugeneware');
        });
        done();
      });
    });

    it('should be able to get a stream feed for a user', function(done) {
      mblog.Feed.createReadStreamByUser('eugeneware')
        .pipe(through(write, done));
      function write(msg) {
        expect(msg.to).to.equal('eugeneware');
      }
    });
  });
});
