// proxy for sauce-connect-launcher
// it fixes problem with sinon.stub
// solution https://github.com/sinonjs/sinon/issues/562#issuecomment-79227487

const sauceConnectLauncher = require('sauce-connect-launcher');

module.exports = function() {
  return module.exports.launcher.apply(this, arguments);
};
module.exports.launcher = sauceConnectLauncher;