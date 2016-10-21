const assert = require('assert');
const sinon = require('sinon');
const BaseService = require('../../lib/services/base');
const LocaltunnelService = require('../../lib/services/localtunnel');


const LOCALTUNNEL_BASE_URL = 'http://xxx.localtunnel.me';


describe('LocaltunnelService', () => {

  it('extends BaseService', () => {
    const localtunnel = new LocaltunnelService();
    assert(localtunnel instanceof BaseService)
  });

  describe('start', () => {

    it('returns a promise that resolves when the service is up', (done) => {
      const localtunnelProcess = {
        url: LOCALTUNNEL_BASE_URL,
        close: sinon.spy(),
      };
      sinon.stub(LocaltunnelService, 'nativeServiceModule',
          (port, opts, cb) => cb(null, localtunnelProcess));

      new LocaltunnelService().start({port: 8080}).then((service) => {
        assert(LocaltunnelService.nativeServiceModule.calledOnce);

        assert(service instanceof LocaltunnelService);
        assert(service.process);
        assert.equal(service.baseUrl, LOCALTUNNEL_BASE_URL);

        LocaltunnelService.nativeServiceModule.restore();
        done();
      });
    });

    it('rejects if the service errors while starting', (done) => {
      sinon.stub(LocaltunnelService, 'nativeServiceModule',
          (port, opts, cb) => cb(new Error('cannot start service!')));

      new LocaltunnelService().start({port: 8080}).catch((err) => {
        assert(LocaltunnelService.nativeServiceModule.calledOnce);
        assert.equal(err.message, 'cannot start service!');

        LocaltunnelService.nativeServiceModule.restore();
        done();
      });
    });

    it('rejects if a port option isn\'t passed', (done) => {
      new LocaltunnelService().start().catch((err) => {
        assert(err.message.includes('port'));
        done();
      });
    });

  });

  describe('stop', () => {

    it('closes an active tunnel process', (done) => {
      const localtunnelProcess = {
        url: LOCALTUNNEL_BASE_URL,
        close: sinon.spy(),
      };
      sinon.stub(LocaltunnelService, 'nativeServiceModule',
          (port, opts, cb) => cb(null, localtunnelProcess));

      new LocaltunnelService().start({port: 8080}).then((service) => {
        service.stop();
        assert(localtunnelProcess.close.calledOnce);

        LocaltunnelService.nativeServiceModule.restore();
        done();
      });
    });

  });

});
