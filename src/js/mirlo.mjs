// Base
import {
  registerComponent,
  getComponentClass,
  registerService,
  getServiceClass,
  getService,
} from './base/app';
import Component from './base/component';
import Service from './base/service';

// Built-in Services
import {LocalStorageService, SessionStorageService} from './services/storage';
import RequestsService from './services/requests';
registerService('requests', RequestsService);
registerService('localStorage', LocalStorageService);
registerService('sessionStorage', SessionStorageService);

// Exports
export {
  Component,
  Service,
  LocalStorageService,
  SessionStorageService,
  RequestsService,
  registerComponent,
  getComponentClass,
  registerService,
  getServiceClass,
  getService,
};
