const assert = require('assert');
const messages = require('../lib/messages');
const services = require('../lib/services');
const LocaltunnelService = require('../lib/services/localtunnel');
const NgrokService = require('../lib/services/ngrok');
const SauceConnectService = require('../lib/services/sauce-connect');


describe('services', () => {
  describe('get', () => {
    it('returns a service instance based on the passed service name', () => {
      const localtunnelService = services.get('localtunnel');
      assert(localtunnelService instanceof LocaltunnelService);

      const ngrokService = services.get('ngrok');
      assert(ngrokService instanceof NgrokService);

      const sauceConnectService = services.get('sauce-connect');
      assert(sauceConnectService instanceof SauceConnectService);
    });

    it('errors if given an unsupported service', () => {
      assert.throws(
          () => services.get('fake-service'),
          {message: messages('WRONG_SERVICE_NAME', 'fake-service')});
    });
  });
});
