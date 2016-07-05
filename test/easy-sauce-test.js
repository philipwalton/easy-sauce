const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs-extra');
const ngrok = require('ngrok');
const request = require('request');
const sinon = require('sinon');
const EasySauce = require('../lib/easy-sauce');
const messages = require('../lib/messages');


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

  });


  //
  // EasySauce::runTestsAndLogResults()
  // -------------------------------------------------------------------------


  describe('runTestsAndLogResults', () => {

    beforeEach(() => {
      let jobsStart = getFixture('jobs-start');
      let jobsFinishPass = getFixture('jobs-finish-pass');

      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
          switch (request.post.callCount) {
            case 1:
              cb(null, {body: jobsStart}, jobsStart);
              break;
            case 2:
              cb(null, {body: jobsFinishPass}, jobsFinishPass);
              break;
          }
        });
      });
      sinon.stub(ngrok, 'connect', (port, cb) => {
        process.nextTick(() => cb(null, 'http://xxx.ngrok.com'));
      });
    });

    afterEach(() => {
      request.post.restore();
      ngrok.connect.restore();
    });


    it('returns an EventEmitter instance', (done) => {
      let es = new EasySauce(opts);
      es.POLL_INTERVAL = 0;

      let returnValue = es.runTestsAndLogResults();
      assert(returnValue instanceof EventEmitter);

      returnValue.on('done', () => done());
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
      sinon.spy(es.logger, 'emit');

      es.startServer().then(() => {
        assert(es.logger.emit.calledOnce);
        assert(es.logger.emit.calledWith(
            'message', messages.SERVER_STARTED + es.opts.port));

        es.logger.emit.restore();
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

    it('returns a promise', () => {
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(null, 'http://xxx.ngrok.com'), 0);
      });

      let es = new EasySauce(opts);
      let returnValue = es.createTunnel();
      assert(returnValue instanceof Promise);

      ngrok.connect.restore();
    });


    it('resolves once the ngrok tunnel is created', (done) => {
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(null, 'http://xxx.ngrok.com'), 0);
      });

      let es = new EasySauce(opts);
      es.createTunnel().then(() => {
        assert(es.baseUrl);
        assert(ngrok.connect.calledOnce);

        ngrok.connect.restore();
        done();
      });
    });


    it('logs a message on success', (done) => {
      let es = new EasySauce(opts);

      sinon.stub(es.logger, 'emit');
      sinon.stub(ngrok, 'connect', (port, cb) => {
        setTimeout(() => cb(null, 'http://xxx.ngrok.com'), 0);
      });

      es.createTunnel().then(() => {
        assert(es.logger.emit.calledOnce);
        assert(es.logger.emit.calledWith(
            'message', messages.TUNNEL_CREATED + es.opts.port));

        es.logger.emit.restore();
        ngrok.connect.restore();
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

        ngrok.connect.restore();
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

    it('returns a promise', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {body: jobsStart}, jobsStart);
        }, 0);
      });

      let es = new EasySauce(opts);
      let returnValue = es.startJobs().then(() => {
        assert(returnValue instanceof Promise);

        request.post.restore();
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

        request.post.restore();
        done();
      });
    });


    it('Logs a message on success', (done) => {
      let es = new EasySauce(opts);

      sinon.stub(es.logger, 'emit');
      sinon.stub(request, 'post', (opts, cb) => {
        setTimeout(() => {
          cb(null, {body: jobsStart}, jobsStart);
        }, 0);
      });

      es.baseUrl = 'http://xxx.ngrok.com'; // Stubs baseUrl.
      es.startJobs().then(() => {
        assert(es.logger.emit.calledOnce);
        assert(es.logger.emit.calledWith('message',
            messages.JOBS_STARTED + es.baseUrl + es.opts.tests));

        es.logger.emit.restore();
        request.post.restore();
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

        request.post.restore();
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

        request.post.restore();
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

      request.post.restore();
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

        request.post.restore();
        done();
      });

    });


    it('logs progress to the console', (done) => {
      let es = new EasySauce(opts);

      sinon.stub(es.logger, 'emit');
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

      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).then(() => {
        assert.equal(es.logger.emit.callCount, 8);
        assert(es.logger.emit.getCall(0).calledWith('message',
            'chrome (latest) on Windows 10 : test session in progress'));
        assert(es.logger.emit.getCall(1).calledWith('message',
            'firefox (latest) on Linux : test queued'));
        assert(es.logger.emit.getCall(2).calledWith('message',
            'safari (9) on OS X 10.11 : test queued'));
        assert(es.logger.emit.getCall(3).calledWith('message',
            'firefox (latest) on Linux : test session in progress'));
        assert(es.logger.emit.getCall(4).calledWith('message',
            'chrome (latest) on Windows 10 : test finished'));
        assert(es.logger.emit.getCall(5).calledWith('message',
            'firefox (latest) on Linux : test finished'));
        assert(es.logger.emit.getCall(6).calledWith('message',
            'safari (9) on OS X 10.11 : test session in progress'));
        assert(es.logger.emit.getCall(7).calledWith('message',
            'safari (9) on OS X 10.11 : test finished'));

        es.logger.emit.restore();
        request.post.restore();
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

        request.post.restore();
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

        request.post.restore();
        done();
      });
    });

  });


  //
  // EasySauce::reportResults()
  // -------------------------------------------------------------------------


  describe('reportResults', () => {

    it('reports passed test results', () => {
      let es = new EasySauce(opts);
      let jobs = getFixture('jobs-finish-pass')['js tests'];

      sinon.stub(es.logger, 'emit');

      es.reportResults(jobs);
      assert.equal(es.logger.emit.callCount, 1);
      assert(es.logger.emit.calledWith('done', true, jobs));

      es.logger.emit.restore();
    });


    it('reports failed test results', () => {
      let es = new EasySauce(opts);
      let jobs = getFixture('jobs-finish-fail')['js tests'];

      sinon.stub(es.logger, 'emit');

      es.reportResults(jobs);
      assert.equal(es.logger.emit.callCount, 1);
      assert(es.logger.emit.calledWith('done', false, jobs));

      es.logger.emit.restore();
    });

  });

});


function getFixture(name) {
  return fs.readJsonSync(`./test/fixtures/${name}.json`);
}
