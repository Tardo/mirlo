import Service from '@mirlo/base/service';

export class StorageService extends Service {
  storage = null;

  getItem(item, def_value) {
    return (
      (this.storage && JSON.parse(this.storage.getItem(item))) || def_value
    );
  }

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

  removeItem(item) {
    return (this.storage && this.storage.removeItem(item)) || undefined;
  }
}

export class LocalStorageService extends StorageService {
  storage = localStorage;
}

export class SessionStorageService extends StorageService {
  storage = sessionStorage;
}
