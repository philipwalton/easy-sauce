/**
 * An abstract class that service objects should extend.
 */
class BaseService {
  /**
   * Starts the instance of the service.
   * @return {Promise} A promise resolved with the service instance once
   *     the service is up and running.
   */
  start() {
    return Promise.reject(
        new Error('start method must be implemented in child class'));
  }

  /**
   * Stops the instance of the service.
   */
  stop() {
    throw new Error('stop method must be implemented in child class');
  }

  /**
   * Returns
   * @return {boolean} Returns whether or not the service is started.
   */
  isStarted() {
    return !!this.baseUrl;
  }

  /**
   * Returns the native npm module function used to start the service.
   * This is always called on the constructor so it can be stubbed in tests.
   * @param {Array} args The arguments to invoked the native module with.
   * @return {Function} The native module's launch function.
   */
  launchNativeServiceModule(...args) {
    if (!this.constructor.nativeServiceModule) {
      throw new Error('No native module launcher set on service constructor.');
    }
    return this.constructor.nativeServiceModule(...args);
  }
}


module.exports = BaseService;
