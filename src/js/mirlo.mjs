// Copyright (C) 2024 Alexandre D. Díaz
import {app} from './base/app';
import Component from './base/component';
import Service from './base/service';

import {LocalStorageService, SessionStorageService} from './services/storage';
import RequestsService from './services/requests';

app.registerService('requests', RequestsService);
app.registerService('localStorage', LocalStorageService);
app.registerService('sessionStorage', SessionStorageService);

// On Start APP
window.addEventListener('load', () =>
  app.onWillStart().then(() => app.onStart()),
);

export {
  Component,
  Service,
  LocalStorageService,
  SessionStorageService,
  RequestsService,
};
export default app;
