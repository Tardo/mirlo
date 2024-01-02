// Copyright (C) 2022 Alexandre Díaz
import {app} from './base/app';
import Component from './base/component';
import Service from './base/service';

// Register services
import {
  LocalStorageService,
  SessionStorageService,
} from './services/storage.mjs';
import RequestsService from './services/requests.mjs';

app.registerService('requests', RequestsService);
app.registerService('localStorage', LocalStorageService);
app.registerService('sessionStorage', SessionStorageService);

// On Start APP
window.addEventListener('load', () => {
  app.onWillStart().then(() => {
    app.onStart();
  });
});

export {Component, Service};
export default app;
