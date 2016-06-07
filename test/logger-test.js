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

    it('adds a message to the stream', () => {
      sinon.stub(Logger.prototype, 'push');

      new Logger().log('foo');
      assert(Logger.prototype.push.calledOnce);
      assert(Logger.prototype.push.calledWith(sinon.match('foo')));

      new Logger(Logger.logLevel.VERBOSE).log('bar');
      assert(Logger.prototype.push.calledTwice);
      assert(Logger.prototype.push.calledWith(sinon.match('bar')));

      new Logger(Logger.logLevel.QUIET).log('quz');
      assert(Logger.prototype.push.calledTwice);
      assert(Logger.prototype.push.neverCalledWith(sinon.match('quz')));

      Logger.prototype.push.restore();
    });

  });


  //
  // Logger::trace()
  // -------------------------------------------------------------------------


  describe('trace', () => {

    it('adds a mesasge to the stream when in verbose mode', () => {
      sinon.stub(Logger.prototype, 'push');

      new Logger(Logger.logLevel.VERBOSE).trace('foo');
      assert(Logger.prototype.push.calledOnce);
      assert(Logger.prototype.push.calledWith(sinon.match('foo')));

      new Logger().trace('bar');
      assert(Logger.prototype.push.calledOnce);
      assert(Logger.prototype.push.neverCalledWith(sinon.match('bar')));

      new Logger(Logger.logLevel.QUIET).trace('quz');
      assert(Logger.prototype.push.calledOnce);
      assert(Logger.prototype.push.neverCalledWith(sinon.match('quz')));

      Logger.prototype.push.restore();
    });

  });


  //
  // Logger::end()
  // -------------------------------------------------------------------------


  describe('end', () => {

    it('ends the stream and prevents futher logging', (done) => {
      sinon.spy(Logger.prototype, 'push');

      let logger = new Logger();

      logger.on('end', () => {
        assert(Logger.prototype.push.calledOnce);
        assert(Logger.prototype.push.calledWith(null));
        Logger.prototype.push.restore();
        done();
      });

      // Puts the stream into flowing mode.
      logger.resume();

      logger.end();
      logger.log('foo');
      logger.trace('bar');
    });

  });

});
