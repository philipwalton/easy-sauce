const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs-extra');
const request = require('request');
const sinon = require('sinon');
const EasySauce = require('../lib/easy-sauce');
const messages = require('../lib/messages');
const LocaltunnelService = require('../lib/services/localtunnel');


const BASE_URL = 'http://xxx.localtunnel.me';


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
        framework: 'mocha',
        service: 'localtunnel',
        serviceOptions: {}
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

      sinon.stub(LocaltunnelService, 'nativeServiceModule', (opt, cb) => {
        cb(null, {url: BASE_URL, close: sinon.spy()});
      });
    });


    afterEach(() => {
      request.post.restore();
      LocaltunnelService.nativeServiceModule.restore();
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
        assert.equal(err.message, messages('BROWSERS_REQUIRED'));
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
        assert.equal(err.message, messages('CREDENTIALS_REQUIRED'));
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
            'message', messages('SERVER_STARTED', es.opts.port)));

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
      sinon.stub(LocaltunnelService, 'nativeServiceModule', (opt, cb) => {
        cb(null, {url: BASE_URL, close: sinon.spy()});
      });

      let es = new EasySauce(opts);
      let returnValue = es.createTunnel();
      assert(returnValue instanceof Promise);

      LocaltunnelService.nativeServiceModule.restore();
    });


    it('resolves once the service tunnel is created', (done) => {
      sinon.stub(LocaltunnelService, 'nativeServiceModule', (opt, cb) => {
        cb(null, {url: BASE_URL, close: sinon.spy()});
      });

      let es = new EasySauce(opts);
      es.createTunnel().then(() => {
        assert(es.service.baseUrl);
        assert(LocaltunnelService.nativeServiceModule.calledOnce);

        LocaltunnelService.nativeServiceModule.restore();
        done();
      });
    });


    it('logs a message on success', (done) => {
      sinon.stub(LocaltunnelService, 'nativeServiceModule', (opt, cb) => {
        cb(null, {url: BASE_URL, close: sinon.spy()});
      });

      let es = new EasySauce(opts);
      sinon.stub(es.logger, 'emit');

      es.createTunnel().then(() => {
        assert(es.logger.emit.calledOnce);
        assert(es.logger.emit.calledWith(
            'message', messages('TUNNEL_CREATED', es.opts.port, BASE_URL)));

        es.logger.emit.restore();
        LocaltunnelService.nativeServiceModule.restore();
        done();
      });
    });


    it('rejects if there is an error creating the tunnel', (done) => {
      sinon.stub(LocaltunnelService, 'nativeServiceModule', (opt, cb) => {
        cb(new Error('Error creating tunnel'));
      });

      let es = new EasySauce(opts);
      es.createTunnel().catch((err) => {
        assert(err);

        LocaltunnelService.nativeServiceModule.restore();
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

    afterEach(() => request.post.restore());

    it('returns a promise', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
          cb(null, {body: jobsStart}, jobsStart);
        });
      });

      let es = new EasySauce(opts);
      es.service = {baseUrl: BASE_URL};
      let returnValue = es.startJobs().then(() => {
        assert(returnValue instanceof Promise);
        done();
      });
    });


    it('resolves with the result of the API call', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
          cb(null, {body: jobsStart}, jobsStart);
        });
      });

      let es = new EasySauce(opts);
      es.service = {baseUrl: BASE_URL};
      es.startJobs().then((jobs) => {
        assert.deepEqual(jobs, jobsStart['js tests']);
        done();
      });
    });


    it('Logs a message on success', (done) => {
      let es = new EasySauce(opts);
      es.service = {baseUrl: BASE_URL};

      sinon.stub(es.logger, 'emit');
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => cb(null, {body: jobsStart}, jobsStart));
      });

      es.startJobs().then(() => {
        assert(es.logger.emit.calledOnce);
        assert(es.logger.emit.calledWith(
            'message',
            messages('JOBS_STARTED', es.service.baseUrl + es.opts.tests)));

        es.logger.emit.restore();
        done();
      });
    });


    it('rejects if the API returns an error', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => cb(null, {statusCode: 401}, jobsError));
      });

      let es = new EasySauce(opts);
      es.service = {baseUrl: BASE_URL};

      es.startJobs().catch((err) => {
        assert.equal(err.message,
            messages('JOBS_START_ERROR', '(401) Not authorized'));

        done();
      });
    });


    it('rejects if there is an error making the request', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => cb(new Error()));
      });

      let es = new EasySauce(opts);
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

    let jobsProgressFail1 = getFixture('jobs-progress-fail-1');
    let jobsProgressFail2 = getFixture('jobs-progress-fail-2');
    let jobsProgressFail3 = getFixture('jobs-progress-fail-3');
    let jobsFinishFail = getFixture('jobs-finish-fail');

    let jobsProgressCancelled1 = getFixture('jobs-progress-cancelled-1');
    let jobsFinishCancelled = getFixture('jobs-finish-cancelled');

    afterEach(() => request.post.restore());

    it('returns a promise', () => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
          cb(null, {body: jobsFinishPass}, jobsFinishPass);
        });
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      let returnValue = es.waitForJobsToFinish(jobs);
      assert(returnValue instanceof Promise);
    });


    it('resolves with the results when all tests have passed', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
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
            default:
              cb(null, {body: jobsFinishPass}, jobsFinishPass);
              break;
          }
        });
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).then((jobs) => {
        assert.deepEqual(jobs, jobsFinishPass['js tests']);
        done();
      });

    });


    it('resolves with the results when some tests have failed', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
          switch (request.post.callCount) {
            case 1:
              cb(null, {body: jobsProgressFail1}, jobsProgressFail1);
              break;
            case 2:
              cb(null, {body: jobsProgressFail2}, jobsProgressFail2);
              break;
            case 3:
              cb(null, {body: jobsProgressFail3}, jobsProgressFail3);
              break;
            default:
              cb(null, {body: jobsFinishFail}, jobsFinishFail);
              break;
          }
        });
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).then((jobs) => {
        assert.deepEqual(jobs, jobsFinishFail['js tests']);
        done();
      });

    });


    it('resolves with empty results when tests were cancelled', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
          switch (request.post.callCount) {
            case 1:
              cb(null, {body: jobsProgressCancelled1}, jobsProgressCancelled1);
              break;
            default:
              cb(null, {body: jobsFinishCancelled}, jobsFinishCancelled);
              break;
          }
        });
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).then((jobs) => {
        assert.deepEqual(jobs, jobsFinishCancelled['js tests']);
        done();
      });

    });


    it('emits update events', (done) => {
      let es = new EasySauce(opts);

      sinon.stub(es.logger, 'emit');
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
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
            default:
              cb(null, {body: jobsFinishPass}, jobsFinishPass);
              break;
          }
        });
      });

      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).then(() => {
        assert.equal(es.logger.emit.callCount, 8);
        assert(es.logger.emit.getCall(0).calledWith('update', sinon.match({
          status: 'test session in progress',
          platform: ['Windows 10', 'chrome', 'latest']
        })));
        assert(es.logger.emit.getCall(1).calledWith('update', sinon.match({
          status: 'test queued',
          platform: ['Linux', 'firefox', 'latest']
        })));
        assert(es.logger.emit.getCall(2).calledWith('update', sinon.match({
          status: 'test queued',
          platform: ['OS X 10.11', 'safari', '9']
        })));
        assert(es.logger.emit.getCall(3).calledWith('update', sinon.match({
          status: 'test session in progress',
          platform: ['Linux', 'firefox', 'latest']
        })));
        assert(es.logger.emit.getCall(4).calledWith('update', sinon.match({
          status: 'test finished',
          platform: ['Windows 10', 'chrome', 'latest']
        })));
        assert(es.logger.emit.getCall(5).calledWith('update', sinon.match({
          status: 'test finished',
          platform: ['Linux', 'firefox', 'latest']
        })));
        assert(es.logger.emit.getCall(6).calledWith('update', sinon.match({
          status: 'test session in progress',
          platform: ['OS X 10.11', 'safari', '9']
        })));
        assert(es.logger.emit.getCall(7).calledWith('update', sinon.match({
          status: 'test finished',
          platform: ['OS X 10.11', 'safari', '9']
        })));

        es.logger.emit.restore();
        done();
      });

    });


    it('rejects if the API returns an error', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => {
          cb(null, {statusCode: 401}, jobsError);
        });
      });

      let es = new EasySauce(opts);
      let jobs = jobsStart['js tests'];
      es.POLL_INTERVAL = 0;
      es.waitForJobsToFinish(jobs).catch((err) => {
        assert.equal(err.message,
            messages('JOBS_PROGRESS_ERROR', '(401) Not authorized'));
        done();
      });
    });


    it('rejects if there is an error making the request', (done) => {
      sinon.stub(request, 'post', (opts, cb) => {
        process.nextTick(() => cb(new Error()));
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
