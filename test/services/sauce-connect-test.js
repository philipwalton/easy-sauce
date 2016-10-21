const assert = require('assert');
const sinon = require('sinon');
const BaseService = require('../../lib/services/base');
const SauceConnectService = require('../../lib/services/sauce-connect');


describe('SauceConnectService', () => {

  it('extends BaseService', () => {
    const sauceConnect = new SauceConnectService();
    assert(sauceConnect instanceof BaseService)
  });

  describe('start', () => {

    it('returns a promise that resolves when the service is up', (done) => {
      const sauceConnectProcess = {close: sinon.spy()};
      sinon.stub(SauceConnectService, 'nativeServiceModule', (opt, cb) => {
        cb(null, sauceConnectProcess);
      });

      new SauceConnectService()
          .start({port: 8080, username: 'me', accessKey: 'secret'})
          .then((service) => {

        assert(SauceConnectService.nativeServiceModule.calledOnce);

        assert(service instanceof SauceConnectService);
        assert(service.process);
        assert.equal(service.baseUrl, 'http://localhost:8080');

        SauceConnectService.nativeServiceModule.restore();
        done();
      });
    });

    it('rejects if the service errors while starting', (done) => {
      sinon.stub(SauceConnectService, 'nativeServiceModule', (opt, cb) => {
        cb(new Error('cannot start service!'));
      });

      new SauceConnectService()
          .start({username: 'me', accessKey: 'secret'})
          .catch((err) => {

        assert(SauceConnectService.nativeServiceModule.calledOnce);
        assert.equal(err.message, 'cannot start service!');

        SauceConnectService.nativeServiceModule.restore();
        done();
      });
    });

    it('rejects if a username option isn\'t passed', (done) => {
      new SauceConnectService().start({accessKey: 'secret'}).catch((err) => {
        assert(err.message.includes('username'));
        done();
      });
    });

    it('rejects if an accessKey option isn\'t passed', (done) => {
      new SauceConnectService().start({username: 'me'}).catch((err) => {
        assert(err.message.includes('accessKey'));
        done();
      });
    });

  });

  describe('stop', () => {

    it('closes an active tunnel process', (done) => {
      const sauceConnectProcess = {close: sinon.spy()};
      sinon.stub(SauceConnectService, 'nativeServiceModule', (opt, cb) => {
        cb(null, sauceConnectProcess);
      });

      new SauceConnectService()
          .start({username: 'me', accessKey: 'secret'})
          .then((service) => {
        service.stop();
        assert(sauceConnectProcess.close.calledOnce);

        SauceConnectService.nativeServiceModule.restore();
        done();
      });
    });

  });

});
