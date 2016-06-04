const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');
const cli = require('../lib/cli');
const EasySauce = require('../lib/easy-sauce');
const Logger = require('../lib/logger');
const pkg = require('../package.json');


describe('cli', () => {

  let helpText = fs.readFileSync('./bin/usage.txt', 'utf-8');


  beforeEach(() => {
    sinon.stub(Logger.prototype, 'log');
    sinon.stub(Logger.prototype, 'error');
    sinon.stub(EasySauce.prototype, 'runTests').returns(Promise.resolve());
  });


  afterEach(() => {
    Logger.prototype.log.restore();
    Logger.prototype.error.restore();
    EasySauce.prototype.runTests.restore();
  });


  it('shows the usage info the -h or --help options', () => {
    cli({h: true});
    cli({help: true});
    assert(Logger.prototype.log.calledTwice);
    assert(Logger.prototype.log.alwaysCalledWith(helpText));
  });


  it('shows the version given the -V or --version options', () => {
    cli({V: true});
    cli({version: true});
    assert(Logger.prototype.log.calledTwice);
    assert(Logger.prototype.log.alwaysCalledWith(pkg.version));
  });


  it('uses data from the -c or --config file option if specified', () => {
    let configFile = './test/fixtures/config.json';
    cli({c: configFile});
    cli({config: configFile});

    let configOpts = fs.readJsonSync(configFile);

    assert(EasySauce.prototype.runTests.calledTwice);
    let firstThisValue = EasySauce.prototype.runTests.firstCall.thisValue;
    let secondThisValue = EasySauce.prototype.runTests.secondCall.thisValue;

    assert.equal(firstThisValue.opts.port, configOpts.port);
    assert.equal(firstThisValue.opts.tests, configOpts.tests);
    assert.deepEqual(firstThisValue.opts.browsers, configOpts.browsers);

    assert.equal(secondThisValue.opts.port, configOpts.port);
    assert.equal(secondThisValue.opts.tests, configOpts.tests);
    assert.deepEqual(secondThisValue.opts.browsers, configOpts.browsers);
  });


  it('uses data from package.json if an easySauce property exists', () => {
    let testPath = path.resolve('./test/fixtures');
    sinon.stub(process, 'cwd').returns(testPath);

    let pkgOpts = fs.readJsonSync('./test/fixtures/package.json').easySauce;

    cli({});

    assert(EasySauce.prototype.runTests.calledOnce);
    let thisValue = EasySauce.prototype.runTests.firstCall.thisValue;

    assert.equal(thisValue.opts.port, pkgOpts.port);
    assert.deepEqual(thisValue.opts.browsers, pkgOpts.browsers);
    assert.equal(thisValue.opts.build, pkgOpts.build);

    process.cwd.restore();
  });


  it('does not use data from package.json if -c or --config is set', () => {
    let testPath = path.resolve('./test/fixtures');
    sinon.stub(process, 'cwd').returns(testPath);

    let configFile = './test/fixtures/config.json';
    cli({config: configFile});

    let pkgOpts = fs.readJsonSync('./test/fixtures/package.json').easySauce;

    assert(EasySauce.prototype.runTests.calledOnce);
    let thisValue = EasySauce.prototype.runTests.firstCall.thisValue;

    assert.notEqual(thisValue.opts.build, pkgOpts.build);

    process.cwd.restore();
  });


  it('errors if given an invalid or missing config file', () => {
    cli({c: './config.json'});
    cli({config: './test/fixtures/invalid-config.json'});

    assert(Logger.prototype.error.calledTwice);
    assert(Logger.prototype.error.alwaysCalledWith(
        sinon.match('No config options found at')));
  });


  it('uses Sauce Labs credentials from the ENV variables if set', () => {
    process.env.SAUCE_USERNAME = 'me';
    process.env.SAUCE_ACCESS_KEY = 'password';

    cli({});

    assert(EasySauce.prototype.runTests.calledOnce);

    let thisValue = EasySauce.prototype.runTests.lastCall.thisValue;
    assert.equal(thisValue.opts.username, 'me');
    assert.equal(thisValue.opts.key, 'password');

    delete process.env.SAUCE_USERNAME;
    delete process.env.SAUCE_ACCESS_KEU;
  });


  it('uses shorthand command line options if present', () => {
    cli({
      p: '1979',
      t: '/tests/suite.html',
      b: [
        ['Windows 10', 'chrome', 'latest'],
        ['OS X 10.11', 'firefox', 'latest'],
        ['OS X 10.11', 'safari', '9']
      ],
      d: '1',
      n: 'Unit Tests',
      f: 'custom'
    });

    assert(EasySauce.prototype.runTests.calledOnce);

    let thisValue = EasySauce.prototype.runTests.lastCall.thisValue;

    assert.equal(thisValue.opts.port, '1979');
    assert.equal(thisValue.opts.tests, '/tests/suite.html');
    assert.deepEqual(thisValue.opts.browsers, [
      ['Windows 10', 'chrome', 'latest'],
      ['OS X 10.11', 'firefox', 'latest'],
      ['OS X 10.11', 'safari', '9']
    ]);
    assert.equal(thisValue.opts.build, '1');
    assert.equal(thisValue.opts.name, 'Unit Tests');
    assert.equal(thisValue.opts.framework, 'custom');
  });


  it('uses longhand command line options if present', () => {
    cli({
      port: '1979',
      tests: '/tests/suite.html',
      browsers: [
        ['Windows 10', 'chrome', 'latest'],
        ['OS X 10.11', 'firefox', 'latest'],
        ['OS X 10.11', 'safari', '9']
      ],
      build: '1',
      name: 'Unit Tests',
      framework: 'custom'
    });

    assert(EasySauce.prototype.runTests.calledOnce);

    let thisValue = EasySauce.prototype.runTests.lastCall.thisValue;

    assert.equal(thisValue.opts.port, '1979');
    assert.equal(thisValue.opts.tests, '/tests/suite.html');
    assert.deepEqual(thisValue.opts.browsers, [
      ['Windows 10', 'chrome', 'latest'],
      ['OS X 10.11', 'firefox', 'latest'],
      ['OS X 10.11', 'safari', '9']
    ]);
    assert.equal(thisValue.opts.build, '1');
    assert.equal(thisValue.opts.name, 'Unit Tests');
    assert.equal(thisValue.opts.framework, 'custom');
  });


  it('errors if given an unparseable -P or --platforms option', () => {
    cli({b: '["Windows 10", "chrome", "50"],["Linux", "firefox", "4"]'});
    cli({browsers: '"Windows 10", "chrome", "50"'});
    assert(Logger.prototype.error.calledTwice);
    assert(Logger.prototype.error.alwaysCalledWith(
        sinon.match('could not be converted to an array')));
  });


  it('sets logLevel from the -v, --verbose, -q, or --quite options', () => {
    cli({});
    let firstThisValue = EasySauce.prototype.runTests.lastCall.thisValue;
    assert.equal(firstThisValue.logger.logLevel, Logger.logLevel.NORMAL);

    cli({v: true});
    let secondThisValue = EasySauce.prototype.runTests.lastCall.thisValue;
    assert.equal(secondThisValue.logger.logLevel, Logger.logLevel.VERBOSE);

    cli({verbose: true});
    let thirdThisValue = EasySauce.prototype.runTests.lastCall.thisValue;
    assert.equal(thirdThisValue.logger.logLevel, Logger.logLevel.VERBOSE);

    cli({q: true});
    let fourthThisValue = EasySauce.prototype.runTests.lastCall.thisValue;
    assert.equal(fourthThisValue.logger.logLevel, Logger.logLevel.QUIET);

    cli({quiet: true});
    let fifthThisValue = EasySauce.prototype.runTests.lastCall.thisValue;
    assert.equal(fifthThisValue.logger.logLevel, Logger.logLevel.QUIET);
  });


  it('favors CLI options over config options', () => {
    let testPath = path.resolve('./test/fixtures');
    sinon.stub(process, 'cwd').returns(testPath);

    let configFile = './test/fixtures/config.json';
    cli({
      config: configFile,
      port: 9999
    });

    let configOpts = fs.readJsonSync(configFile);

    assert(EasySauce.prototype.runTests.calledOnce);
    let thisValue = EasySauce.prototype.runTests.firstCall.thisValue;

    assert.equal(thisValue.opts.port, 9999);
    assert.equal(thisValue.opts.tests, configOpts.tests);
  });

});
