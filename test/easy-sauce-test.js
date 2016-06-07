const assert = require('assert');
const fs = require('fs-extra');
const ngrok = require('ngrok');
const request = require('request');
const sinon = require('sinon');
const EasySauce = require('../lib/easy-sauce');
const messages = require('../lib/messages');
const Logger = require('../lib/logger');


var opts = {
  username: 'me',
  key: 'secret',
  platforms: [
    ['Windows 10', 'chrome', 'latest'],
    ['OS X 10.11', 'firefox', 'latest'],
    ['OS X 10.11', 'safari', '9']
  ]
};


describe('EasySauce', () => {

  //
  // EasySauce::constructor()
  // -------------------------------------------------------------------------


  describe('constructor', () => {

    it('merges the default options with the override options', () => {
      let es = new EasySauce({
        username: 'me',
        key: 'secret',
        port: 1979,
        platforms: [
          ['Windows 10', 'chrome', 'latest'],
          ['OS X 10.11', 'firefox', 'latest'],
          ['OS X 10.11', 'safari', '9']
        ],
        build: 1
      });

      assert.deepEqual(es.opts, {
        username: 'me',
        key: 'secret',
        port: 1979,
        tests: '/test/',
        platforms: [
          ['Windows 10', 'chrome', 'latest'],
          ['OS X 10.11', 'firefox', 'latest'],
          ['OS X 10.11', 'safari', '9']
        ],
        build: 1,
        name: 'JS Unit Tests',
        framework: 'mocha'
      });
    });


    it('creates a new logger based on the verbose/quiet options', () => {
      assert.equal(new EasySauce({}).logger.logLevel,
                   Logger.logLevel.NORMAL);

      assert.equal(new EasySauce({verbose: true}).logger.logLevel,
                   Logger.logLevel.VERBOSE);

      assert.equal(new EasySauce({quiet: true}).logger.logLevel,
                   Logger.logLevel.QUIET);
    });

  });


  //
  // EasySauce::runTestsAndLogResults()
  // -------------------------------------------------------------------------


  describe('runTestsAndLogResults', () => {

    beforeEach(() => {
      let jobsStart = getFixture('jobs-start');
      let jobsFinishPass = getFixture('jobs-finish-pass');

      sinon.stub(Logger.prototype, 'log');
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          switch (request.post.callCount) {
            case 1:
              cb(null, {body: jobsStart}, jobsStart);
              break;
            case 2:
              cb(null, {body: jobsFinishPass}, jobsFinishPass);
              break;
          }
        }, 0);
      });
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(null, 'http://xxx.ngrok.com'), 0);
      });
    });

    afterEach(() => {
      Logger.prototype.log.restore();
      request.post.restore();
      ngrok.connect.restore();
    });


    it('returns a Logger instance', (done) => {
      let es = new EasySauce();
      let returnValue = es.runTestsAndLogResults();
      assert(returnValue instanceof Logger);

      // Unhandled errors cause problems, so handler must be registered.
      returnValue.on('error', (err) => assert(err));
      returnValue.on('end', done);

      // Puts the stream into flowing mode.
      returnValue.resume();
    });

  });


  //
  // EasySauce::validateInput()
  // -------------------------------------------------------------------------


  describe('validateInput', () => {

    it('returns a promise', () => {
      let es = new EasySauce(opts);
      let returnValue = es.validateInput();
      assert(returnValue instanceof Promise);
    });

    it('resolves if there are no validation errors', (done) => {
      let es = new EasySauce(opts);
      es.validateInput().then(() => {
        assert(es.opts);
        done();
      });
    });


    it('rejects if no platforms option is passed', (done) => {
      let es = new EasySauce();
      es.validateInput().catch((err) => {
        assert.equal(err.message, messages.BROWSERS_REQUIRED);
        done();
      });
    });


    it('throws if no username or access key is passed', (done) => {
      let es = new EasySauce({
        platforms: [
          ['Windows 10', 'chrome', 'latest'],
          ['OS X 10.11', 'firefox', 'latest'],
          ['OS X 10.11', 'safari', '9']
        ]
      });
      es.validateInput().catch((err) => {
        assert.equal(err.message, messages.CREDENTIALS_REQUIRED);
        done();
      });
    });

  });


  //
  // EasySauce::startServer()
  // -------------------------------------------------------------------------


  describe('startServer', () => {

    beforeEach(() => sinon.stub(Logger.prototype, 'log'));
    afterEach(() => Logger.prototype.log.restore());

    it('returns a promise', (done) => {
      let es = new EasySauce(opts);
      let returnValue = es.startServer();
      assert(returnValue instanceof Promise);
      returnValue.then(() => {
        es.server.close();
        done();
      });
    });


    it('resolves once the server has started', (done) => {
      let es = new EasySauce(opts);
      es.startServer().then(() => {
        assert(es.server.listening);
        es.server.close();
        done();
      });
    });


    it('logs a message upon success', (done) => {
      let es = new EasySauce(opts);
      es.startServer().then(() => {
        assert(Logger.prototype.log.calledOnce);
        assert(Logger.prototype.log.calledWith(
            messages.SERVER_STARTED + es.opts.port));
        es.server.close();
        done();
      });
    });


    it('rejects if there is an error starting the server', (done) => {
      let es1 = new EasySauce(opts);
      es1.startServer().then(() => {
        let es2 = new EasySauce(opts);
        es2.startServer().catch((err) => {
          assert(err);
          es1.server.close();
          done();
        });
      });
    });

  });


  //
  // EasySauce::createTunnel()
  // -------------------------------------------------------------------------


  describe('createTunnel', () => {

    beforeEach(() => {
      sinon.stub(Logger.prototype, 'log');
    });


    afterEach(() => {
      ngrok.connect.restore();
      Logger.prototype.log.restore();
    });


    it('returns a promise', () => {
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(null, 'http://xxx.ngrok.com'), 0);
      });

      let es = new EasySauce(opts);
      let returnValue = es.createTunnel();
      assert(returnValue instanceof Promise);
    });


    it('resolves once the ngrok tunnel is created', (done) => {
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(null, 'http://xxx.ngrok.com'), 0);
      });

      let es = new EasySauce(opts);
      es.createTunnel().then(() => {
        assert(es.baseUrl);
        assert(ngrok.connect.calledOnce);
        done();
      });
    });


    it('logs a message on success', (done) => {
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(null, 'http://xxx.ngrok.com'), 0);
      });

      let es = new EasySauce(opts);
      es.createTunnel().then(() => {
        assert(Logger.prototype.log.calledOnce);
        assert(Logger.prototype.log.calledWith(
            messages.TUNNEL_CREATED + es.opts.port));

        done();
      });
    });


    it('rejects if there is an error creating the tunnel', (done) => {
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(new Error()), 0);
      });

      let es = new EasySauce(opts);
      es.createTunnel().catch((err) => {
        assert(err);
        done();
      });
    });

  });


  //
  // EasySauce::startJobs()
  // -------------------------------------------------------------------------


  describe('startJobs', () => {

    let jobsStart = getFixture('jobs-start');
    let jobsError = getFixture('jobs-error');

    beforeEach(() => {
      sinon.stub(Logger.prototype, 'log');
    });

    afterEach(() => {
      request.post.restore();
      Logger.prototype.log.restore();
    });


    it('returns a promise', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {body: jobsStart}, jobsStart);
        }, 0);
      });

      let es = new EasySauce(opts);
      let returnValue = es.startJobs().then(() => {
        assert(returnValue instanceof Promise);
        done();
      });
    });


    it('resolves with the result of the API call', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {body: jobsStart}, jobsStart);
        }, 0);
      });

      let es = new EasySauce(opts);
      es.startJobs().then((jobs) => {
        assert.deepEqual(jobs, jobsStart['js tests']);
        done();
      });
    });


    it('Logs a message on success', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {body: jobsStart}, jobsStart);
        }, 0);
      });

      let es = new EasySauce(opts);
      es.baseUrl = 'http://xxx.ngrok.com'; // Stubs baseUrl.
      es.startJobs().then(() => {
        assert(Logger.prototype.log.calledOnce);
        assert(Logger.prototype.log.calledWith(
            messages.JOBS_STARTED + es.baseUrl + es.opts.tests));

        done();
      });
    });


    it('rejects if the API returns an error', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {statusCode: 401}, jobsError);
        }, 0);
      });

      let es = new EasySauce(opts);
      es.baseUrl = 'http://xxx.ngrok.com'; // Stubs baseUrl.
      es.startJobs().catch((err) => {
        assert.equal(err.message,
            messages.JOBS_START_ERROR + '(401) Not authorized');

        done();
      });
    });


    it('rejects if there is an error making the request', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => cb(new Error()));
      });

      let es = new EasySauce(opts);
      es.baseUrl = 'http://xxx.ngrok.com'; // Stubs baseUrl.
      es.startJobs().catch((err) => {
        assert(err instanceof Error);
        done();
      });
    });

  });


  //
  // EasySauce::waitForJobsToFinish()
  // -------------------------------------------------------------------------


  describe('waitForJobsToFinish', () => {

    let jobsStart = getFixture('jobs-start');
    let jobsError = getFixture('jobs-error');
    let jobsProgressPass1 = getFixture('jobs-progress-pass-1');
    let jobsProgressPass2 = getFixture('jobs-progress-pass-2');
    let jobsProgressPass3 = getFixture('jobs-progress-pass-3');
    let jobsFinishPass = getFixture('jobs-finish-pass');

    beforeEach(() => {
      sinon.stub(Logger.prototype, 'log');
    });

    afterEach(() => {
      request.post.restore();
      Logger.prototype.log.restore();
    });

    it('returns a promise', () => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {body: jobsFinishPass}, jobsFinishPass);
        }, 0);
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      let returnValue = es.waitForJobsToFinish(jobs);
      assert(returnValue instanceof Promise);
    });


    it('resolves with the results when all tests have completed', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          switch (request.post.callCount) {
            case 1:
              cb(null, {body: jobsProgressPass1}, jobsProgressPass1);
              break;
            case 2:
              cb(null, {body: jobsProgressPass2}, jobsProgressPass2);
              break;
            case 3:
              cb(null, {body: jobsProgressPass3}, jobsProgressPass3);
              break;
            case 4:
              cb(null, {body: jobsFinishPass}, jobsFinishPass);
              break;
          }
        }, 0);
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).then((jobs) => {
        assert.deepEqual(jobs, jobsFinishPass['js tests']);
        done();
      });

    });


    it('logs progress to the console', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          switch (request.post.callCount) {
            case 1:
              cb(null, {body: jobsProgressPass1}, jobsProgressPass1);
              break;
            case 2:
              cb(null, {body: jobsProgressPass2}, jobsProgressPass2);
              break;
            case 3:
              cb(null, {body: jobsProgressPass3}, jobsProgressPass3);
              break;
            case 4:
              cb(null, {body: jobsFinishPass}, jobsFinishPass);
              break;
          }
        }, 0);
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).then(() => {
        assert.equal(Logger.prototype.log.callCount, 8);
        assert(Logger.prototype.log.getCall(0).calledWith(
            'chrome (latest) on Windows 10 : test session in progress'));
        assert(Logger.prototype.log.getCall(1).calledWith(
            'firefox (latest) on Linux : test queued'));
        assert(Logger.prototype.log.getCall(2).calledWith(
            'safari (9) on OS X 10.11 : test queued'));
        assert(Logger.prototype.log.getCall(3).calledWith(
            'firefox (latest) on Linux : test session in progress'));
        assert(Logger.prototype.log.getCall(4).calledWith(
            'chrome (latest) on Windows 10 : test finished ' +
            '30 tests, 29 passes, 0 failures'));
        assert(Logger.prototype.log.getCall(5).calledWith(
            'firefox (latest) on Linux : test finished ' +
            '30 tests, 29 passes, 0 failures'));
        assert(Logger.prototype.log.getCall(6).calledWith(
            'safari (9) on OS X 10.11 : test session in progress'));
        assert(Logger.prototype.log.getCall(7).calledWith(
            'safari (9) on OS X 10.11 : test finished ' +
            '30 tests, 29 passes, 0 failures'));

        done();
      });

    });

    it('rejects if the API returns an error', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {statusCode: 401}, jobsError);
        }, 0);
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).catch((err) => {
        assert.equal(err.message,
            messages.JOBS_PROGRESS_ERROR + '(401) Not authorized');

        done();
      });
    });


    it('rejects if there is an error making the request', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => cb(new Error()));
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).catch((err) => {
        assert(err instanceof Error);
        done();
      });
    });

  });


  //
  // EasySauce::reportResults()
  // -------------------------------------------------------------------------


  describe('reportResults', () => {

    it('logs passed test results', () => {
      sinon.stub(Logger.prototype, 'log');

      let es = new EasySauce(opts);
      let jobs = getFixture('jobs-finish-pass')['js tests'];

      es.reportResults(jobs);
      assert.equal(Logger.prototype.log.callCount, 1);
      assert(Logger.prototype.log.calledWith('All tests pass!'));

      Logger.prototype.log.restore();
    });


    it('stores the results on the logger', () => {
      sinon.stub(Logger.prototype, 'log');
      sinon.spy(EasySauce.prototype, 'reportResults');

      let es = new EasySauce(opts);
      let jobsPass = getFixture('jobs-finish-pass')['js tests'];
      let jobsFail = getFixture('jobs-finish-fail')['js tests'];

      es.reportResults(jobsPass);
      assert.equal(EasySauce.prototype.reportResults.callCount, 1);

      let passCall = EasySauce.prototype.reportResults.lastCall;
      assert.equal(passCall.thisValue.logger.results, jobsPass);

      assert.throws(() => {
        es.reportResults(jobsFail);
        assert.equal(EasySauce.prototype.reportResults.callCount, 2);

        let failCall = EasySauce.prototype.reportResults.lastCall;
        assert.equal(failCall.thisValue.logger.results, jobsFail);
      });

      Logger.prototype.log.restore();
      EasySauce.prototype.reportResults.restore();
    });


    it('throws with failed test results', () => {
      let es = new EasySauce(opts);
      let jobs = getFixture('jobs-finish-fail')['js tests'];

      assert.throws(() => {
        es.reportResults(jobs);
      }, /failures/);
    });

  });

});


function getFixture(name) {
  return fs.readJsonSync(`./test/fixtures/${name}.json`);
}
