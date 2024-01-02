import Service from '../base/service';

export class StorageService extends Service {
  storage = null;

  getItem(item) {
    return (
      (this.storage && JSON.parse(this.storage.getItem(item))) || undefined
    );
  }

  setItem(item, value, on_error) {
    try {
      return this.storage.setItem(item, JSON.stringify(value));
    } catch (err) {
      console.error(
        `[StorageService] Can't set the item '${item}' = '${value}'`,
      );
      if (on_error) {
        const err_check = this.#isQuotaExceededError(err);
        if (err_check) {
          on_error(err);
        }
      }
    }

    return false;
  }

  removeItem(item) {
    return (this.storage && this.storage.removeItem(item)) || undefined;
  }

  #isQuotaExceededError(err) {
    return err.name === 'QuotaExceededError';
  }
}

export class LocalStorageService extends StorageService {
  storage = localStorage;
}

export class SessionStorageService extends StorageService {
  storage = sessionStorage;
}
