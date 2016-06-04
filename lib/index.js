'use strict';

const EasySauce = require('./easy-sauce');
const Logger = require('./logger');


// A factory function that creates an EasySauce instance, runs the tests,
// and then exits the process with code 1 if any errors are thrown.
module.exports = function(overrides) {
  let logger = new Logger(overrides.logLevel);
  return new EasySauce(overrides, logger)
      .runTests()
      .catch((err) => logger.error(err.message));
};

