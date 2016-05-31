#!/usr/bin/env node

'use strict';

var connect = require('connect');
var fs = require('fs-extra');
var ngrok = require('ngrok');
var request = require('request');
var serveStatic = require('serve-static');


// Sets up the configuration options.
var packageOpts = fs.readJsonSync('./package.json');
var opts = packageOpts && packageOpts.easySauce || {};
if (process.env.SAUCE_USERNAME) opts.username = process.env.SAUCE_USERNAME;
if (process.env.SAUCE_ACCESS_KEY) opts.key = process.env.SAUCE_ACCESS_KEY;


// Holds a reference to the connect server so it can be stopped later.
var server;


module.exports = function(overrides) {

  // Update the current options with any passed overrides.
  Object.assign(opts, overrides);

  if (!opts.browsers) {
    console.error('Oops! A list of browsers/platforms is required.');
    process.exit(1);
  }
  else if (typeof opts.browsers == 'string') {
    try {
      opts.browsers = JSON.parse(opts.browsers);
    }
    catch(err) {
      let message = `Option platforms '${opts.browsers}' could not be` +
                    `converted to an array.`;

      console.error(message);
      process.exit(1);
    }
  }

  if (!opts.username || !opts.key) {
    console.error('Oops! A Sauce Labs username and access key are required.');
    process.exit(1);
  }

  return startServer(opts.port)
    .then((port) => createTunnel(port))
    .then((host) => startJobs(host))
    .then((jobs) => waitForJobsToFinish(jobs))
    .then((jobs) => {
      server.close();
      ngrok.kill();
      var status = reportResults(jobs);
      process.exit(status);
    })
    .catch((err) => {
      console.error(err.stack || JSON.stringify(err, null, 2));
      process.exit(1);
    });
};


function startServer(port) {
  return new Promise((resolve) => server = connect()
      .use(serveStatic('./')).listen(port, () => resolve(port)));
}


function createTunnel(port) {
  return new Promise((resolve, reject) => {
    ngrok.connect(port, (err, url) => {
      if (err) return reject(err);
      console.log('Tunnel successfully created');
      resolve(url);
    });
  });
}


function startJobs(host) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://saucelabs.com/rest/v1/${opts.username}/js-tests`,
      method: 'POST',
      json: true,
      body: {
        platforms: opts.browsers,
        url: host + opts.tests,
        framework: opts.framework,
        name: opts.name,
        build: opts.build,
        idleTimeout: 30
      },
      auth: {
        username: opts.username,
        password: opts.key
      }
    }, (err, response) => {
      if (err) return reject(err);
      console.log('Running tests on Sauce Labs for URL: ' + host + opts.tests);
      resolve(response.body['js tests']);
    });
  });
}


function waitForJobsToFinish(jobs) {
  var progress = {};
  for (let id of jobs) {
    progress[id] = {};
  }
  return new Promise(function(resolve, reject) {
    (function checkJobStatus() {
      setTimeout(function() {
        request({
          url: `https://saucelabs.com/rest/v1/${opts.username}/js-tests/status`,
          method: 'POST',
          json: true,
          body: {
            'js tests': jobs
          },
          auth: {
            username: opts.username,
            password: opts.key
          }
        }, function(err, response) {
          if (err) return reject(err);
          var jobs = response.body['js tests'];
          updateJobProgress(progress, jobs);
          return response.body.completed ? resolve(jobs) : checkJobStatus();
        });
      }, 3000);
    }());
  });
}


function updateJobProgress(progress, jobs) {
  for (let job of jobs) {
    // No status means the job has completed
    var status = job.status || 'test finished ' + formatResult(job.result);

    if (status != progress[job.id].status) {
      progress[job.id].status = status;
      console.log(formatPlatform(job.platform) + ' : ' + status);
    }

    if (status.indexOf('error') > -1) {
      console.log(JSON.stringify(job, null, 2));
      throw new Error(job);
    }
  }
  return progress;
}


function reportResults(jobs) {
  let failures = 0;
  for (let job of jobs) {
    failures += job.result.failures;
  }
  if (failures === 0) {
    console.log('All tests pass!');
    return 0;
  }
  else {
    console.log(`Oops! There were ${failures} failures!`);
    return 1;
  }
}


function formatResult(result) {
  let tests = result.tests;
  let passes = result.passes;
  let failures = result.failures;
  if (typeof tests == 'number' &&
      typeof passes == 'number' &&
      typeof failures == 'number') {
    return `${tests} tests, ${passes} passes, ${failures} failures`;
  } else {
    return '';
  }
}


function formatPlatform(platform) {
  var os = platform[0];
  var browser = platform[1];
  var version = platform[2];

  return `${browser} (${version}) on ${os}`;
}
