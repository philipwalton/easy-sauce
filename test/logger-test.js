const assert = require('assert');
const sinon = require('sinon');
const Logger = require('../lib/logger');


describe('Logger', () => {

  //
  // Logger::constructor()
  // -------------------------------------------------------------------------


  describe('constructor', () => {

    it('assigns the log level to the new instance', () => {
      let logger = new Logger(Logger.logLevel.VERBOSE);
      assert.equal(logger.logLevel, Logger.logLevel.VERBOSE);
    });


    it('throws if logLevel is not one of the whitelisted values', () => {
      assert.throws(() => {
        new Logger(Logger.logLevel.QUITE);
      }, /Invalid logLevel/);

      assert.throws(() => {
        new Logger(Logger.logLevel.VERBOS);
      }, /Invalid logLevel/);

      assert.doesNotThrow(() => {
        new Logger();
        new Logger(Logger.logLevel.NORMAL);
        new Logger(Logger.logLevel.VERBOSE);
        new Logger(Logger.logLevel.QUIET);
      });
    });

  });


  //
  // Logger::log()
  // -------------------------------------------------------------------------


  describe('log', () => {

    it('outputs to stdout when not in quiet mode', () => {
      sinon.stub(process.stdout, 'write');

      new Logger().log('foo');
      assert(process.stdout.write.calledOnce);
      assert(process.stdout.write.calledWith(sinon.match('foo')));

      new Logger(Logger.logLevel.VERBOSE).log('bar');
      assert(process.stdout.write.calledTwice);
      assert(process.stdout.write.calledWith(sinon.match('bar')));

      new Logger(Logger.logLevel.QUIET).log('quz');
      assert(process.stdout.write.calledTwice);
      assert(process.stdout.write.neverCalledWith(sinon.match('quz')));

      process.stdout.write.restore();
    });

  });


  //
  // Logger::debug()
  // -------------------------------------------------------------------------


  describe('debug', () => {

    it('outputs to stdout when in debug mode', () => {
      sinon.stub(process.stdout, 'write');

      new Logger(Logger.logLevel.VERBOSE).debug('foo');
      assert(process.stdout.write.calledOnce);
      assert(process.stdout.write.calledWith(sinon.match('foo')));

      new Logger().debug('bar');
      assert(process.stdout.write.calledOnce);
      assert(process.stdout.write.neverCalledWith(sinon.match('bar')));

      new Logger(Logger.logLevel.QUIET).debug('quz');
      assert(process.stdout.write.calledOnce);
      assert(process.stdout.write.neverCalledWith(sinon.match('quz')));

      process.stdout.write.restore();
    });

  });


  //
  // Logger::error()
  // -------------------------------------------------------------------------


  describe('error', () => {

    it('outputs to stderr in all modes', () => {
      sinon.stub(process, 'exit');
      sinon.stub(process.stderr, 'write');

      new Logger().error('foo');
      assert(process.exit.calledOnce);
      assert(process.stderr.write.calledOnce);
      assert(process.stderr.write.calledWith(sinon.match('foo')));

      new Logger(Logger.logLevel.VERBOSE).error('bar');
      assert(process.exit.calledTwice);
      assert(process.stderr.write.calledTwice);
      assert(process.stderr.write.calledWith(sinon.match('bar')));

      new Logger(Logger.logLevel.QUIET).error('quz');
      assert(process.exit.calledThrice);
      assert(process.stderr.write.calledThrice);
      assert(process.stderr.write.calledWith(sinon.match('quz')));

      process.exit.restore();
      process.stderr.write.restore();
    });

  });

});
