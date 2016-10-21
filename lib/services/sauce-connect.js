const sauceConnectLauncher = require('sauce-connect-launcher');
const BaseService = require('./base');


class SauceConnectService extends BaseService {
  start(opts = {}) {
    return new Promise((resolve, reject) => {
      const sauceConnectOptions = Object.assign({
        username: opts.username,
        accessKey: opts.key || opts.accessKey,
      }, opts.serviceOptions);

      if (!sauceConnectOptions.username) {
        return reject(new Error('Starting sauce-conect requires a username'));
      }
      if (!sauceConnectOptions.accessKey) {
        return reject(new Error('Starting sauce-conect requires an accessKey'));
      }

      this.launchNativeServiceModule(
          sauceConnectOptions, (err, sauceConnectProcess) => {
        if (err) {
          reject(err);
        } else {
          this.process = sauceConnectProcess;
          this.baseUrl = `http://localhost:${opts.port}`;
          resolve(this);
        }
      });
    });
  }

  stop() {
    if (this.isStarted()) this.process.close();
  }
}
SauceConnectService.nativeServiceModule = sauceConnectLauncher;


module.exports = SauceConnectService;
