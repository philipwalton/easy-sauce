'use strict';

const Readable = require('stream').Readable;


class Logger extends Readable {

  constructor(...args) {
    super();

    // Defaults to 'normal' if no argument is passed, otherwise ensures
    // argument is one of the possible values.
    let logLevel = args.length ? args[0] : Logger.logLevel.NORMAL;
    if (logLevel !== Logger.logLevel.NORMAL &&
        logLevel !== Logger.logLevel.VERBOSE &&
        logLevel !== Logger.logLevel.QUIET) {

      this.emit('error', new Error(
          'Invalid logLevel value passed to `new Logger()`'));
    }
    this.logLevel = logLevel;
    this.logging = true;
  }


  log(message) {
    if (this.logging && this.logLevel !== Logger.logLevel.QUIET) {
      this.push(message + '\n');
    }
  }


  trace(message) {
    if (this.logging && this.logLevel === Logger.logLevel.VERBOSE) {
      this.push(message + '\n');
    }
  }


  end() {
    if (this.logging) {
      this.logging = false;
      this.push(null);
    }
  }


  // This is a no-op, but node requires it to be implemented.
  // TODO(philipwalton): is this an anti-pattern?
  _read() {}
}


Logger.logLevel = {
  QUIET: Symbol('quiet'),
  NORMAL: Symbol('normal'),
  VERBOSE: Symbol('verbose')
};


module.exports = Logger;
