// Copyright (C) 2022 Alexandre Díaz
import {app} from './base/app';
import Component from './base/component';
import Service from './base/service';

import {LocalStorageService, SessionStorageService} from './services/storage';
import RequestsService from './services/requests';

import LazyClickComponent from './components/lazy_click';
import LazyScrollComponent from './components/lazy_scroll';

app.registerService('requests', RequestsService);
app.registerService('localStorage', LocalStorageService);
app.registerService('sessionStorage', SessionStorageService);

app.registerComponent('lazyClick', LazyClickComponent);
app.registerComponent('lazyScroll', LazyScrollComponent);

// On Start APP
window.addEventListener('load', () => {
  app.onWillStart().then(() => {
    app.onStart();
  });
});

export {
  Component,
  Service,
  LocalStorageService,
  SessionStorageService,
  RequestsService,
  LazyClickComponent,
  LazyScrollComponent,
};
export default app;
