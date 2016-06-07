'use strict';

const connect = require('connect');
const ngrok = require('ngrok');
const request = require('request');
const serveStatic = require('serve-static');
const messages = require('./messages');
const Logger = require('./logger');


const API_PATH = 'https://saucelabs.com/rest/v1';


class EasySauce {

  constructor(overrides) {
    let defaultOpts = {
      username: null,
      key: null,
      port: 1337,
      tests: '/test/',
      platforms: null,
      build: Math.floor(Date.now() / 1000),
      name: 'JS Unit Tests',
      framework: 'mocha'
    };

    this.server = null;
    this.opts = Object.assign(defaultOpts, overrides);
    this.logger = new Logger(this.opts.verbose && Logger.logLevel.VERBOSE ||
                             this.opts.quiet && Logger.logLevel.QUIET ||
                             Logger.logLevel.NORMAL);
  }


  runTestsAndLogResults() {
    this.validateInput()
        .then(() => this.startServer())
        .then(() => this.createTunnel())
        .then(() => this.startJobs())
        .then((jobs) => this.waitForJobsToFinish(jobs))
        .then((jobs) => this.reportResults(jobs))
        .catch((err) => this.logger.emit('error', err))
        .then(() => this.logger.end() && this.destroy());

    return this.logger;
  }


  validateInput() {
    return new Promise((resolve, reject) => {
      // Validates the platforms list before making any API calls.
      if (!this.opts.platforms) {
        reject(new Error(messages.BROWSERS_REQUIRED));
      }
      // Ensures Sauce Labs credentials are set.
      else if (!this.opts.username || !this.opts.key) {
        return reject(new Error(messages.CREDENTIALS_REQUIRED));
      }
      else {
        resolve();
      }
    });

  }


  startServer() {
    return new Promise((resolve, reject) => {
      this.server = connect()
          .use(serveStatic('./'))
          .listen(this.opts.port)
          .on('listening', () => {
            this.logger.log(messages.SERVER_STARTED + this.opts.port);
            resolve();
          })
          .on('error', (err) => {
            reject(err.code == 'EADDRINUSE' ?
                new Error(messages.PORT_TAKEN + this.opts.port) : err);
          });
    });
  }


  createTunnel() {
    return new Promise((resolve, reject) => {
      ngrok.connect(this.opts.port, (err, baseUrl) => {
        if (err) return reject(err);
        this.logger.log(messages.TUNNEL_CREATED + this.opts.port);
        this.baseUrl = baseUrl;
        resolve();
      });
    });
  }


  startJobs() {
    return new Promise((resolve, reject) => {
      let url = this.baseUrl + this.opts.tests;
      let opts = {
        url: `${API_PATH}/${this.opts.username}/js-tests`,
        json: true,
        body: {
          platforms: this.opts.platforms,
          url: url,
          framework: this.opts.framework,
          name: this.opts.name,
          build: this.opts.build,
          idleTimeout: 30
        },
        auth: {
          username: this.opts.username,
          password: this.opts.key
        }
      };
      request.post(opts, (err, response, body) => {
        if (err) return reject(err);
        if (body.error) {
          return reject(new Error(messages.JOBS_START_ERROR +
              `(${response.statusCode}) ${body.error}`));
        }
        this.logger.log(messages.JOBS_STARTED + url);
        resolve(response.body['js tests']);
      });
    });
  }


  waitForJobsToFinish(jobs) {
    this.progress = {};
    for (let id of jobs) {
      this.progress[id] = {};
    }
    return new Promise((resolve, reject) => {
      let checkJobStatus = () => {
        setTimeout(() => {
          let params = {
            url: `${API_PATH}/${this.opts.username}/js-tests/status`,
            json: true,
            body: {
              'js tests': jobs
            },
            auth: {
              username: this.opts.username,
              password: this.opts.key
            }
          };
          request.post(params, (err, response, body) => {
            if (err) return reject(err);
            if (body.error) {
              return reject(new Error(messages.JOBS_PROGRESS_ERROR +
                  `(${response.statusCode}) ${body.error}`));
            }
            let jobs = body['js tests'];
            this.updateJobProgress(jobs);
            return body.completed ? resolve(jobs) : checkJobStatus();
          });
        }, this.POLL_INTERVAL);
      };
      checkJobStatus();
    });
  }


  updateJobProgress(jobs) {
    for (let job of jobs) {
      // No status means the job has completed
      let status = job.status ||
          'test finished ' + formatResult(job.result);

      if (status != this.progress[job.id].status) {
        this.progress[job.id].status = status;
        this.logger.log(formatPlatform(job.platform) + ' : ' + status);
      }

      if (status.indexOf('error') > -1) {
        throw new Error(job);
      }
    }
  }


  reportResults(jobs) {
    this.logger.results = jobs;

    let failures = 0;
    for (let job of jobs) {
      failures += job.result.failures;
    }
    if (failures === 0) {
      this.logger.log('All tests pass!');
    }
    else {
      let err = new Error(`Oops! There were ${failures} failures!`);
      err.results = jobs;
      throw err;
    }
  }


  destroy() {
    this.server.close();
    ngrok.kill(); // TODO: does this affect multiple instances?
  }

}


EasySauce.prototype.POLL_INTERVAL = 5000;


module.exports = EasySauce;


function formatResult({tests, passes, failures}) {
  if (typeof tests == 'number' &&
      typeof passes == 'number' &&
      typeof failures == 'number') {
    return `${tests} tests, ${passes} passes, ${failures} failures`;
  } else {
    return '';
  }
}


function formatPlatform([os, browser, version]) {
  return `${browser} (${version}) on ${os}`;
}

