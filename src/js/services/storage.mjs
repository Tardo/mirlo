// @flow strict
import Service from '@mirlo/base/service';

export type CallbackStorageOnError = {error: mixed} => void;

/**
 * Class to implement Browser Storage operations as a Service.
 * @extends Service
 * @hideconstructor
 * @private
 */
export class StorageService extends Service {
  /** The storage interface to use. */
  storage: MirloStorage;

  /**
   * Get a value from the browser storage.
   * @param {string} item - The key name.
   * @param {Any} def_value - The default value.
   * @returns {Any}
   */
  getItem(item: string, def_value: mixed): mixed {
    const store_value = this.storage.getItem(item);
    return (
      (this.storage && typeof store_value === "string" && JSON.parse(store_value)) || def_value
    );
  }

  /**
   *
   * @param {string} item - The key name.
   * @param {Any} value - The value.
   * @param {Function} on_error - The error callback.
   * @returns {Any}
   */
  setItem(item: string, value: mixed, on_error: CallbackStorageOnError): mixed {
    try {
      return this.storage.setItem(item, JSON.stringify(String(value)));
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
  removeItem(item: string): mixed {
    return (this.storage && this.storage.removeItem(item)) || undefined;
  }
}

/**
 * Class representing a Browser Local Storage service.
 * @extends StorageService
 * @hideconstructor
 */
export class LocalStorageService extends StorageService {
  storage: Storage = localStorage;
}

/**
 * Class representing a Browser Session Storage service.
 * @extends StorageService
 * @hideconstructor
 */
export class SessionStorageService extends StorageService {
  storage: Storage = sessionStorage;
}
