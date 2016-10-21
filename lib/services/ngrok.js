const ngrok = require('ngrok');
const BaseService = require('./base');


class NgrokService extends BaseService {
  start(opts = {}) {
    return new Promise((resolve, reject) => {
      const ngrokOpts = Object.assign({
        addr: opts.port,
      }, opts.serviceOptions);

      if (!ngrokOpts.addr) {
        return reject(new Error('Starting ngrok requires a port'));
      }

      this.launchNativeServiceModule(ngrokOpts, (err, baseUrl) => {
        if (err) {
          reject(err);
        } else {
          this.baseUrl = baseUrl;
          resolve(this);
        }
      });
    });
  }

  stop() {
    if (this.isStarted()) ngrok.kill();
  }
}
NgrokService.nativeServiceModule = ngrok.connect;


module.exports = NgrokService;
