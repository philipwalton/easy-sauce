'use strict';

const messages = require('./messages');
const LocaltunnelService = require('./services/localtunnel');
const NgrokService = require('./services/ngrok');
const SauceConnectService = require('./services/sauce-connect');


const services = {
  LOCALTUNNEL: 'localtunnel',
  NGROK: 'ngrok',
  SAUCE_CONNECT: 'sauce-connect',
};


module.exports = {
  get: (service) => {
    switch (service) {
      case services.LOCALTUNNEL:
        return new LocaltunnelService();
      case services.NGROK:
        return new NgrokService();
      case services.SAUCE_CONNECT:
        return new SauceConnectService();
      default:
        throw new Error(messages('WRONG_SERVICE_NAME', service));
    }
  },
};
