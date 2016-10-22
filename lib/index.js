'use strict';


const EasySauce = require('./easy-sauce');


// A factory function that creates an EasySauce instance, runs the tests,
// and then exits the process with code 1 if any errors are thrown.
module.exports = function(overrides) {
  return new EasySauce(overrides).runTestsAndLogResults();
};
