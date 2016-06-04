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


    it('stores a passed logger on the instance', () => {
      let logger = new Logger();
      let es = new EasySauce({}, logger);
      assert.equal(es.logger, logger);
    });


    it('creates a new logger if none is passed', () => {
      let es = new EasySauce({});
      assert(es.logger instanceof Logger);
    });

  });


  //
  // EasySauce::runTests()
  // -------------------------------------------------------------------------


  describe('runTests', (done) => {

    beforeEach(() => {
      let jobsStart = getFixture('jobs-start')
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


    it('returns a promise', (done) => {
      let es = new EasySauce(opts);
      es.POLL_INTERVAL = 0;

      let returnValue = es.runTests();
      assert(returnValue instanceof Promise);
      returnValue.then(() => done())
    });


    it('resolves with the test pass/fail status', (done) => {
      let es = new EasySauce(opts);
      es.POLL_INTERVAL = 0;
      es.runTests().then((status) => {
        assert.equal(status, 0);
        assert(Logger.prototype.log.calledWith('All tests pass!'));
        done();
      })
      .catch(console.error.bind(console));
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
    })

    it('resolves if there are no validation errors', (done) => {
      let es = new EasySauce(opts);
      es.validateInput().then(() => {
        assert(es.opts);
        done();
      })
      .catch(console.error.bind(console));
    });


    it('rejects if no platforms option is passed', (done) => {
      let es = new EasySauce();
      es.validateInput().catch((err) => {
        assert.equal(err.message, messages.BROWSERS_REQUIRED);
        done();
      })
      .catch(console.error.bind(console));
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
      })
      .catch(console.error.bind(console));
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
      })
      .catch(console.error.bind(console));
    });


    it('resolves once the server has started', (done) => {
      let es = new EasySauce(opts);
      es.startServer().then(() => {
        assert(es.server.listening);
        es.server.close();
        done();
      })
      .catch(console.error.bind(console));
    });


    it('logs a message upon success', (done) => {
      let es = new EasySauce(opts);
      es.startServer().then(() => {
        assert(Logger.prototype.log.calledOnce);
        assert(Logger.prototype.log.calledWith(
            messages.SERVER_STARTED + es.opts.port));
        es.server.close();
        done();
      })
      .catch(console.error.bind(console));
    });


    it('rejects if there is an error starting the server', (done) => {
      let es1 = new EasySauce(opts);
      es1.startServer().then(() => {
        let es2 = new EasySauce(opts);
        es2.startServer().catch((err) => {
          es1.server.close();
          done();
        })
        .catch(console.error.bind(console));
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
      })
      .catch(console.error.bind(console));
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
      })
      .catch(console.error.bind(console));
    });


    it('rejects if there is an error creating the tunnel', (done) => {
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(new Error()), 0);
      });

      let es = new EasySauce(opts);
      es.createTunnel().catch((err) => {
        assert(err);
        done();
      })
      .catch(console.error.bind(console));
    });

  });


  //
  // EasySauce::startJobs()
  // -------------------------------------------------------------------------


  describe('startJobs', () => {

    let jobsStartJson = getFixture('jobs-start');
    let jobsStartErrorJson = getFixture('jobs-start-error');

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
          cb(null, {body: jobsStartJson}, jobsStartJson)
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
          cb(null, {body: jobsStartJson}, jobsStartJson)
        }, 0);
      });

      let es = new EasySauce(opts);
      es.startJobs().then((jobs) => {
        assert.deepEqual(jobs, jobsStartJson['js tests']);
        done();
      })
      .catch(console.error.bind(console));
    });


    it('Logs a message on success', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {body: jobsStartJson}, jobsStartJson)
        }, 0);
      });

      let es = new EasySauce(opts);
      es.baseUrl = 'http://xxx.ngrok.com'; // Stubs baseUrl.
      es.startJobs().then((jobs) => {
        assert(Logger.prototype.log.calledOnce);
        assert(Logger.prototype.log.calledWith(
            messages.JOBS_STARTED + es.baseUrl + es.opts.tests));

        done();
      })
      .catch(console.error.bind(console));
    });


    it('rejects if the API returns an error', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {statusCode: 401}, jobsStartErrorJson)
        }, 0);
      });

      let es = new EasySauce(opts);
      es.baseUrl = 'http://xxx.ngrok.com'; // Stubs baseUrl.
      es.startJobs().catch((err) => {
        assert.equal(err.message,
            messages.JOBS_ERROR + '(401) Not authorized');

        done();
      })
      .catch(console.error.bind(console));
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
      })
      .catch(console.error.bind(console));
    });

  });


  //
  // EasySauce::waitForJobsToFinish()
  // -------------------------------------------------------------------------


  describe('waitForJobsToFinish', () => {

    let jobsStart = getFixture('jobs-start')
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
          cb(null, {body: jobsFinishPass}, jobsFinishPass)
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
      })
      .catch(console.error.bind(console));

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
      es.waitForJobsToFinish(jobs).then((jobs) => {
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
      })
      .catch(console.error.bind(console));

    });

    it('rejects if any of the tests are not found');
    it('rejects if the API returns an error');
    it('rejects if there is an error making the request');

  });


  //
  // EasySauce::reportResults()
  // -------------------------------------------------------------------------


  describe('reportResults', () => {

    it('logs passed test results', () => {
      sinon.stub(Logger.prototype, 'log');

      let es = new EasySauce(opts);
      let jobs = getFixture('jobs-finish-pass')['js tests'];
      let results = es.reportResults(jobs);

      assert.equal(Logger.prototype.log.callCount, 1);
      assert(Logger.prototype.log.calledWith('All tests pass!'));

      Logger.prototype.log.restore();
    });


    it('logs failed test results', () => {
      sinon.stub(Logger.prototype, 'log');

      let es = new EasySauce(opts);
      let jobs = getFixture('jobs-finish-fail')['js tests'];
      let results = es.reportResults(jobs);

      assert.equal(Logger.prototype.log.callCount, 1);
      assert(Logger.prototype.log.calledWith('Oops! There were 2 failures!'));

      Logger.prototype.log.restore();
    });

  });

});


function getFixture(name) {
  return fs.readJsonSync(`./test/fixtures/${name}.json`);
}
