const assert = require('assert');
const sinon = require('sinon');
const easySauce = require('../');
const EasySauce = require('../lib/easy-sauce');
const Logger = require('../lib/logger');


let opts = {
  username: 'me',
  key: 'secret',
  browsers: [
    ['Windows 10', 'chrome', 'latest'],
    ['OS X 10.11', 'firefox', 'latest'],
    ['OS X 10.11', 'safari', '9']
  ]
};


describe('index', () => {

  it('creates an EasySauce instance and starts running the tests', () => {
    sinon.stub(EasySauce.prototype, 'runTests').returns(Promise.resolve());

    easySauce(opts);
    assert(EasySauce.prototype.runTests.calledOnce);

    let calledOn = EasySauce.prototype.runTests.lastCall.thisValue;
    assert(calledOn instanceof EasySauce);

    EasySauce.prototype.runTests.restore();
  });


  it('returns a promise', () => {
    sinon.stub(EasySauce.prototype, 'runTests').returns(Promise.resolve());

    let returnValue = easySauce(opts);
    assert(returnValue instanceof Promise);

    EasySauce.prototype.runTests.restore();
  });


  it('creates a new Logger instance', () => {
    sinon.stub(EasySauce.prototype, 'runTests').returns(Promise.resolve());

    easySauce(opts);
    let calledOn = EasySauce.prototype.runTests.lastCall.thisValue;
    assert(calledOn.logger instanceof Logger);

    EasySauce.prototype.runTests.restore();
  });


  it('logs any errors that occured in the runTests promise chain', (done) => {
    sinon.stub(Logger.prototype, 'error');

    easySauce({}).then(() => {
      assert(Logger.prototype.error.calledOnce);
      Logger.prototype.error.restore();
      done();
    })
    .catch(console.error.bind(console));
  });


  it('uses the passed logLevel option', (done) => {
    sinon.stub(Logger.prototype, 'error');

    easySauce({logLevel: Logger.logLevel.VERBOSE}).then(() => {
      let loggerInstance = Logger.prototype.error.lastCall.thisValue;
      assert.equal(loggerInstance.logLevel, Logger.logLevel.VERBOSE);

      easySauce({logLevel: Logger.logLevel.QUIET}).then(() => {
        let loggerInstance = Logger.prototype.error.lastCall.thisValue;
        assert.equal(loggerInstance.logLevel, Logger.logLevel.QUIET);
        Logger.prototype.error.restore();
        done();
      })
      .catch(console.error.bind(console));
    })
    .catch(console.error.bind(console));
  });

});
