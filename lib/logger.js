'use strict';

class Logger {

  constructor(logLevel) {
    this.logLevel = logLevel || Logger.logLevel.NORMAL;
  }

  debug(message) {
    if (this.logLevel == Logger.logLevel.VERBOSE) {
      process.stdout.write(`${message}\n`);
    }
  }

  log(message) {
    if (this.logLevel != Logger.logLevel.SILENT) {
      process.stdout.write(`${message}\n`);
    }
  }

  error(message) {
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}


Logger.logLevel = {
  SILENT: 'silent',
  NORMAL: 'normal',
  VERBOSE: 'verbose'
};


module.exports = Logger;
