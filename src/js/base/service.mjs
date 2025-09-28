// @flow strict
/**
 * Class representing a Component node. The services can be used at any time and are instantiated at startup.
 * See {@tutorial Services} and {@tutorial Built-in}.
 * @hideconstructor
 * @see RequestsService
 * @see LocalStorageService
 * @see SessionStorageService
 */
class Service {
  /**
   * Called when the service is destroyed.
   * Generally used to cleanup.
   */
  destroy() {
    // Override me
  }
}

export default Service;
