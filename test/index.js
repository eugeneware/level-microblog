var expect = require('expect.js'),
    path = require('path'),
    rimraf = require('rimraf'),
    after = require('after'),
    levelMicroblog = require('..');

describe('microblog', function() {
  var dbPath = path.join(__dirname, '..', 'data', 'testdb'), mblog;
  beforeEach(function(done) {
    rimraf.sync(dbPath); 
    mblog = levelMicroblog(dbPath);
    var users = require('./fixture/users.json');
    var next = after(users.length, done);
    users.forEach(function (user) {
      mblog.Users.save(user, next);
    });
  });

  afterEach(function(done) {
    mblog.close(done);
  });

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

  it('should be able to send a status update', function(done) {
    mblog.Users.message('eugeneware', 'Wazzup?', function (err, message) {
      if (err) return done(err);
      console.log(message);
      done();
    });
  });
});
