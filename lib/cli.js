'use strict';

const fs = require('fs-extra');
const path = require('path');
const easySauce = require('..');
const pkg = require('../package.json');


module.exports = function(argv) {

  if (argv.h || argv.help) {
    fs.createReadStream(path.join(__dirname, '../bin/usage.txt'))
        .pipe(process.stdout);
  }
  else if (argv.V || argv.version) {
    process.stdout.write(pkg.version + '\n');
  }
  else {
    // Options from an external json file or the package.json file.
    let configOpts = (argv.c || argv.config ?
        getConfigOpts(argv.c || argv.config) : getPackageOpts()) || {};

    // Options passed via the CLI.
    let cliOpts = {};

    // Sets the Sauce Labs credentials, defaulting to ENV variables if set.
    if (argv.u || argv.username || process.env.SAUCE_USERNAME) {
      cliOpts.username = argv.u || argv.username || process.env.SAUCE_USERNAME;
    }
    if (argv.k || argv.key || process.env.SAUCE_ACCESS_KEY) {
      cliOpts.key = argv.k || argv.key || process.env.SAUCE_ACCESS_KEY;
    }

    if (argv.P || argv.platforms) cliOpts.platforms = argv.P || argv.platforms;
    if (argv.t || argv.tests) cliOpts.tests = argv.t || argv.tests;
    if (argv.p || argv.port) cliOpts.port = argv.p || argv.port;
    if (argv.b || argv.build) cliOpts.build = argv.b || argv.build;
    if (argv.n || argv.name) cliOpts.name = argv.n || argv.name;
    if (argv.f || argv.framework) cliOpts.framework = argv.f || argv.framework;
    if (argv.v || argv.verbose) cliOpts.verbose = argv.v || argv.verbose;
    if (argv.q || argv.quiet) cliOpts.quiet = argv.q || argv.quiet;

    // If a `platforms` option is passed, it must be JSON parsable.
    if (cliOpts.platforms) {
      try {
        cliOpts.platforms = JSON.parse(cliOpts.platforms);
      }
      catch(err) {
        process.stderr.write('Option -p/--platforms "' +
            cliOpts.platforms + '" could not be converted to an array');
        process.exit(1);
      }
    }

    return easySauce(Object.assign(configOpts, cliOpts))
        .on('error', (err) => {
          process.stderr.write(err.message + '\n');
          process.exit(1);
        })
        .on('end', () => {
          process.exit(0);
        })
        .pipe(process.stdout);
  }
};


function getConfigOpts(configFilePath) {
  if (configFilePath) {
    try {
      return fs.readJsonSync(configFilePath);
    }
    catch (err) {
      process.stderr.write('No config options found at ' + configFilePath);
      process.exit(1);
    }
  }
}


function getPackageOpts() {
  try {
    // Getting the packpage path from process.cwd allows it to be stubbed.
    var pkgPath = path.resolve(process.cwd(), './package.json');
    return fs.readJsonSync(pkgPath).easySauce;
  }
  catch (err) {}
}
