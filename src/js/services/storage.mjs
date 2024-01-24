import Service from '@mirlo/base/service';

/**
 * Class to implement Browser Storage operations as a Service.
 * @extends Service
 * @hideconstructor
 * @private
 */
export class StorageService extends Service {
  /** The storage interface to use. */
  storage = null;

  /**
   * Get a value from the browser storage.
   * @param {string} item - The key name.
   * @param {Any} def_value - The default value.
   * @returns {Any}
   */
  getItem(item, def_value) {
    return (
      (this.storage && JSON.parse(this.storage.getItem(item))) || def_value
    );
  }

  /**
   *
   * @param {string} item - The key name.
   * @param {Any} value - The value.
   * @param {Function} on_error - The error callback.
   * @returns {Any}
   */
  setItem(item, value, on_error) {
    try {
      return this.storage.setItem(item, JSON.stringify(value));
    } catch (err) {
      if (on_error) {
        on_error(err);
      }
    }

    return false;
  }

  /**
   * Remove a value from the storage.
   * @param {string} item - The key name.
   * @returns {Any}
   */
  removeItem(item) {
    return (this.storage && this.storage.removeItem(item)) || undefined;
  }
}

/**
 * Class representing a Browser Local Storage service.
 * @extends StorageService
 * @hideconstructor
 */
export class LocalStorageService extends StorageService {
  storage = localStorage;
}

/**
 * Class representing a Browser Session Storage service.
 * @extends StorageService
 * @hideconstructor
 */
export class SessionStorageService extends StorageService {
  storage = sessionStorage;
}
