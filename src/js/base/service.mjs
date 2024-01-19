/**
 * Class representing a Component node. The services can be used at any time and are instantiated at startup.
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
