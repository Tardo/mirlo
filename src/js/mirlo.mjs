// Base
import {
  registerComponent,
  getComponentClass,
  registerService,
  getServiceClass,
  getService,
} from './base/app';
import Component from './base/component';
import AnimatedComponent from './components/animated';
import Service from './base/service';

// Built-in Services
import {LocalStorageService, SessionStorageService} from './services/storage';
import {default as RequestsService, HTTP_METHOD} from './services/requests';
registerService('requests', RequestsService);
registerService('localStorage', LocalStorageService);
registerService('sessionStorage', SessionStorageService);

// Exports
export {
  Component,
  AnimatedComponent,
  Service,
  LocalStorageService,
  SessionStorageService,
  RequestsService,
  registerComponent,
  getComponentClass,
  registerService,
  getServiceClass,
  getService,
  HTTP_METHOD,
};
