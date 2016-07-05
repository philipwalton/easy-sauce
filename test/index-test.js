const assert = require('assert');
const EventEmitter = require('events');
const sinon = require('sinon');
const easySauce = require('../');
const EasySauce = require('../lib/easy-sauce');


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
    sinon.stub(EasySauce.prototype, 'runTestsAndLogResults')
        .returns(new EventEmitter());

    easySauce(opts);
    assert(EasySauce.prototype.runTestsAndLogResults.calledOnce);

    let calledOn = EasySauce.prototype.runTestsAndLogResults.lastCall.thisValue;
    assert(calledOn instanceof EasySauce);

    EasySauce.prototype.runTestsAndLogResults.restore();
  });


  it('returns a EventEmitter instance', () => {
    let promise = Promise.resolve.bind(Promise);
    sinon.stub(EasySauce.prototype, 'validateInput').returns(promise());
    sinon.stub(EasySauce.prototype, 'startServer').returns(promise());
    sinon.stub(EasySauce.prototype, 'createTunnel').returns(promise());
    sinon.stub(EasySauce.prototype, 'startJobs').returns(promise());
    sinon.stub(EasySauce.prototype, 'waitForJobsToFinish').returns(promise());
    sinon.stub(EasySauce.prototype, 'reportResults').returns(promise());

    let returnValue = easySauce(opts);
    assert(returnValue instanceof EventEmitter);

    EasySauce.prototype.validateInput.restore();
    EasySauce.prototype.startServer.restore();
    EasySauce.prototype.createTunnel.restore();
    EasySauce.prototype.startJobs.restore();
    EasySauce.prototype.waitForJobsToFinish.restore();
    EasySauce.prototype.reportResults.restore();
  });

});
