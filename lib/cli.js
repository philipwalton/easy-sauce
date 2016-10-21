'use strict';

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const easySauce = require('..');
const pkg = require('../package.json');


module.exports = function(argv) {

  if (argv.h || argv.help) {
    fs.createReadStream(path.join(__dirname, '../bin/usage.txt'))
        .pipe(process.stderr);
  }
  else if (argv.V || argv.version) {
    log(pkg.version);
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
    if (argv.t || argv.testPath) cliOpts.testPath = argv.t || argv.testPath;
    if (argv.p || argv.port) cliOpts.port = argv.p || argv.port;
    if (argv.b || argv.build) cliOpts.build = argv.b || argv.build;
    if (argv.n || argv.name) cliOpts.name = argv.n || argv.name;
    if (argv.f || argv.framework) cliOpts.framework = argv.f || argv.framework;
    if (argv.v || argv.verbose) cliOpts.verbose = argv.v || argv.verbose;
    if (argv.q || argv.quiet) cliOpts.quiet = argv.q || argv.quiet;
    if (argv.s || argv.service) cliOpts.service = argv.s || argv.service;

    if (argv['service-options']) {
      try {
        cliOpts.serviceOptions = JSON.parse(argv['service-options']);
      } catch (err) {
        log(chalk.red('Option --service-options ' +
            argv['service-options'] + ' could not be parsed as JSON'));
        process.exit(1);
      }
    }

    // If a `platforms` option is passed, it must be JSON parsable.
    if (cliOpts.platforms) {
      try {
        cliOpts.platforms = JSON.parse(cliOpts.platforms);
      }
      catch(err) {
        log(chalk.red('Option -p/--platforms "' +
            cliOpts.platforms + '" could not be converted to an array'));
        process.exit(1);
      }
    }

    return easySauce(Object.assign(configOpts, cliOpts))
        .on('message', (message) => {
          log(chalk.gray(message));
        })
        .on('update', (job) => {
          log(chalk.gray(`${formatPlatform(job.platform)}: ${job.status}`));
        })
        .on('done', (passed, jobs) => {
          printResults(jobs);
          if (passed) {
            log(chalk.green('All tests pass!'));
          }
          else {
            log(chalk.red('Oops, there were test failures!'));
            process.exit(1);
          }
        })
        .on('error', (err) => {
          log(chalk.red(err.stack));
          process.exit(1);
        });
  }
};


function getConfigOpts(configFilePath) {
  if (configFilePath) {
    try {
      return fs.readJsonSync(configFilePath);
    }
    catch (err) {
      log(chalk.red(`No config options found at: ${configFilePath}`));
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


function printResults(jobs) {
  log('');
  for (let job of jobs) {
    // Tests that were cancelled will not have a `results` property.
    let result = formatResult(job.result || {});
    let platform = formatPlatform(job.platform);
    let passed = job.result && job.result.failures === 0;
    let bullet = passed ? chalk.green('\u2713') : chalk.red('\u2717');

    log(`${bullet} ${platform} : (${result})`);
    log(`See ${job.url} for details.\n`);
  }
}


function formatResult(result = {}) {
  let {tests, passes, pending, failures} = result;
  if (typeof tests == 'number' &&
      typeof passes == 'number' &&
      typeof pending == 'number' &&
      typeof failures == 'number') {

    return `${tests} tests, ${passes} passes, ` +
           `${pending} pending, ${failures} failures`;

  } else {
    return 'unknown error running tests';
  }
}


function formatPlatform([os, browser, version]) {
  return `${browser} (${version}) on ${os}`;
}


function log(message) {
  process.stderr.write(message + '\n');
}
