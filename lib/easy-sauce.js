'use strict';

const connect = require('connect');
const EventEmitter = require('events');
const request = require('request');
const serveStatic = require('serve-static');
const messages = require('./messages');
const services = require('./services');


const API_PATH = 'https://saucelabs.com/rest/v1';


class EasySauce {

  constructor(overrides) {
    let defaultOpts = {
      username: null,
      key: null,
      port: 8080,
      tests: '/test/',
      platforms: null,
      build: Math.floor(Date.now() / 1000),
      name: 'JS Unit Tests',
      framework: 'mocha',
      service: 'localtunnel',
      serviceOptions: {}
    };
    this.server = null;
    this.service = null;
    this.opts = Object.assign(defaultOpts, overrides);
    this.logger = new EventEmitter();
  }


  runTestsAndLogResults() {
    this.validateInput()
        .then(() => this.startServer())
        .then(() => this.createTunnel())
        .then(() => this.startJobs())
        .then((jobs) => this.waitForJobsToFinish(jobs))
        .then((jobs) => this.reportResults(jobs))
        .catch((err) => this.logger.emit('error', err))
        .then(() => this.destroy());

    return this.logger;
  }


  validateInput() {
    return new Promise((resolve, reject) => {
      // Validates the platforms list before making any API calls.
      if (!this.opts.platforms) {
        reject(new Error(messages('BROWSERS_REQUIRED')));
      }
      // Ensures Sauce Labs credentials are set.
      else if (!this.opts.username || !this.opts.key) {
        return reject(new Error(messages('CREDENTIALS_REQUIRED')));
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
            this.logger.emit(
                'message', messages('SERVER_STARTED', this.opts.port));
            resolve();
          })
          .on('error', (err) => {
            reject(err.code == 'EADDRINUSE' ?
                new Error(messages('PORT_TAKEN', this.opts.port)) : err);
          });
    });
  }


  createTunnel() {
    const service = services.get(this.opts.service);
    return service.start(this.opts).then((service) => {
      this.service = service;
      this.logger.emit('message',
          messages('TUNNEL_CREATED', this.opts.port,
              service.baseUrl, this.opts.service));
    });
  }


  startJobs() {
    return new Promise((resolve, reject) => {
      let url = this.service.baseUrl + this.opts.tests;
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
          return reject(new Error(messages('JOBS_START_ERROR',
              `(${response.statusCode}) ${body.error}`)));
        }
        this.logger.emit('message', messages('JOBS_STARTED', url));
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
              return reject(new Error(messages('JOBS_PROGRESS_ERROR',
                  `(${response.statusCode}) ${body.error}`)));
            }
            if (body.message) {
              return reject(new Error(body.message));
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
      job.status = job.status || 'test finished';
      if (job.status != this.progress[job.id].status) {
        this.progress[job.id].status = job.status;
        this.logger.emit('update', job);
      }

      if (job.status.indexOf('error') > -1) {
        throw new Error(job);
      }
    }
  }


  reportResults(jobs) {
    let passed = jobs.every((job) => job.result && job.result.failures === 0);
    this.logger.emit('done', passed, jobs);
  }


  destroy() {
    this.server && this.server.close();
    this.service && this.service.stop();
  }

}


EasySauce.prototype.POLL_INTERVAL = 5000;


module.exports = EasySauce;
