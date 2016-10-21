const assert = require('assert');
const ngrok = require('ngrok');
const sinon = require('sinon');
const BaseService = require('../../lib/services/base');
const NgrokService = require('../../lib/services/ngrok');


const NGROK_BASE_URL = 'http://xxx.ngrok.io';


describe('NgrokService', () => {

  it('extends BaseService', () => {
    const ngrok = new NgrokService();
    assert(ngrok instanceof BaseService)
  });

  describe('start', () => {

    it('returns a promise that resolves when the service is up', (done) => {
      sinon.stub(NgrokService, 'nativeServiceModule', (opt, cb) => {
        cb(null, NGROK_BASE_URL);
      });

      new NgrokService().start({port: 8080}).then((service) => {
        assert(NgrokService.nativeServiceModule.calledOnce);

        assert(service instanceof NgrokService);
        assert.equal(service.baseUrl, NGROK_BASE_URL);

        NgrokService.nativeServiceModule.restore();
        done();
      });
    });

    it('rejects if the service errors while starting', (done) => {
      sinon.stub(NgrokService, 'nativeServiceModule', (opt, cb) => {
        cb(new Error('cannot start service!'));
      });

      new NgrokService().start({port: 8080}).catch((err) => {
        assert(NgrokService.nativeServiceModule.calledOnce);
        assert.equal(err.message, 'cannot start service!');

        NgrokService.nativeServiceModule.restore();
        done();
      });
    });

    it('rejects if a port option isn\'t passed', (done) => {
      new NgrokService().start().catch((err) => {
        assert(err.message.includes('port'));
        done();
      });
    });

  });

  describe('stop', () => {

    it('closes an active tunnel process', (done) => {
      sinon.stub(ngrok, 'disconnect');
      sinon.stub(NgrokService, 'nativeServiceModule', (opt, cb) => {
        cb(null, NGROK_BASE_URL);
      });

      new NgrokService().start({port: 8080}).then((service) => {
        service.stop();
        assert(ngrok.disconnect.calledOnce);
        assert(ngrok.disconnect.calledWith(NGROK_BASE_URL));

        ngrok.disconnect.restore();
        NgrokService.nativeServiceModule.restore();
        done();
      });
    });

  });

});
