'use strict';

class Logger {

  constructor(...args) {
    let logLevel = args.length ? args[0] : Logger.logLevel.NORMAL;
    if (logLevel !== Logger.logLevel.NORMAL &&
        logLevel !== Logger.logLevel.VERBOSE &&
        logLevel !== Logger.logLevel.QUIET) {

      throw new Error('Invalid logLevel value passed to `new Logger()`');
    }
    this.logLevel = logLevel;
  }


  log(message) {
    if (this.logLevel !== Logger.logLevel.QUIET) {
      process.stdout.write(message + '\n');
    }
  }


  debug(message) {
    if (this.logLevel === Logger.logLevel.VERBOSE) {
      process.stdout.write(message + '\n');
    }
  }


  error(message) {
    process.stderr.write(message + '\n');
    process.exit(1);
  }
}


Logger.logLevel = {
  QUIET: Symbol('quiet'),
  NORMAL: Symbol('normal'),
  VERBOSE: Symbol('verbose')
};


module.exports = Logger;
