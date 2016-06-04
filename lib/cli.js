'use strict';

const fs = require('fs-extra');
const path = require('path');
const easySauce = require('..');
const Logger = require('./logger');
const pkg = require('../package.json');


let logger = new Logger();


module.exports = function(argv) {

  if (argv.h || argv.help) {
    let help = fs.readFileSync(
        path.join(__dirname, '../bin/usage.txt'), 'utf-8');
    logger.log(help);
  }
  else if (argv.V || argv.version) {
    logger.log(pkg.version);
  }
  else {
    // Options from an external json file or the package.json file.
    let configOpts = argv.c || argv.config ?
        getConfigOpts(argv.c || argv.config) : getPackageOpts();

    // Options passed via the CLI.
    let cliOpts = {};

    // Sets the SauceLabs credentials, defaulting to ENV variables if set.
    if (argv.u || argv.username || process.env.SAUCE_USERNAME) {
      cliOpts.username = argv.u || argv.username || process.env.SAUCE_USERNAME;
    }
    if (argv.k || argv.key || process.env.SAUCE_ACCESS_KEY) {
      cliOpts.key = argv.k || argv.key || process.env.SAUCE_ACCESS_KEY;
    }

    if (argv.p || argv.port) cliOpts.port = argv.p || argv.port;
    if (argv.t || argv.tests) cliOpts.tests = argv.t || argv.tests;
    if (argv.b || argv.browsers) cliOpts.browsers = argv.b || argv.browsers;
    if (argv.d || argv.build) cliOpts.build = argv.d || argv.build;
    if (argv.n || argv.name) cliOpts.name = argv.n || argv.name;
    if (argv.f || argv.framework) cliOpts.framework = argv.f || argv.framework;

    // If a `browsers` option is passed, it must be JSON parsable.
    if (cliOpts.browsers) {
      try {
        cliOpts.browsers = JSON.parse(cliOpts.browsers);
      }
      catch(err) {
        logger.error(`Oops! Option --browsers '${cliOpts.browsers}' could ` +
                     `not be converted to an array.`);
      }
    }

    // Sets the log level: "quite" | "normal" | "verbose"
    if (argv.v || argv.verbose) {
      cliOpts.logLevel = Logger.logLevel.VERBOSE;
    }
    else if (argv.q || argv.quiet || argv.s || argv.silent) {
      cliOpts.logLevel = Logger.logLevel.QUIET;
    }

    // CLI options override config options.
    var opts = Object.assign({}, configOpts, cliOpts);

    easySauce(opts);
  }
};


function getConfigOpts(configFilePath) {
  if (configFilePath) {
    try {
      return fs.readJsonSync(configFilePath);
    }
    catch (err) {
      logger.error(`Oops! No config options found at '${configFilePath}'`);
    }
  }
}


function getPackageOpts() {
  try {
    // Getting the packpage path from process.cwd allows it to be stubbed.
    var pkgPath = path.resolve(process.cwd(), './package.json');
    return fs.readJsonSync(pkgPath).easySauce;
  }
  catch (err) {
    return {};
  }
}
