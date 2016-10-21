const localtunnel = require('localtunnel');
const BaseService = require('./base');


class LocalTunnelService extends BaseService {
  start(opts = {}) {
    return new Promise((resolve, reject) => {
      if (!opts.port) {
        return reject(new Error('Starting localtunner requires a port'));
      }

      this.launchNativeServiceModule(
          opts.port, opts.serviceOptions, (err, tunnel) => {
        if (err) {
          reject(err);
        } else {
          this.baseUrl = tunnel.url;
          this.process = tunnel;
          resolve(this);
        }
      });
    });
  }

  stop() {
    if (this.isStarted()) this.process.close();
  }
}
LocalTunnelService.nativeServiceModule = localtunnel;


module.exports = LocalTunnelService;
