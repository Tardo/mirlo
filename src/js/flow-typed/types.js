declare type MirloStorage = typeof localStorage | typeof sessionStorage;

declare type MirloHTTPResponseMessage = {
  e200: string,
};
declare type MirloHTTPMethod = 'POST' | 'GET';

declare type MirloEventCallback = (ev: Event, matched: HTMLElement) => unknown;

declare type MirloComponentEvent = {
  mode: string,
  delegate?: string,
  events: {[string]: MirloEventCallback},
};

declare type MirloListItemBind = {selector?: string, selectorAll?: string, attribute?: string};

declare type MirloComponentList = {
  template: string,
  key: string | ((item: unknown, index: number) => unknown),
  binds?: {[string]: MirloListItemBind},
};

declare type MirloComponentBind = {
  id?: string,
  selector?: string,
  selectorAll?: string,
  attribute: string,
  each?: MirloComponentList,
};

declare type MirloComponentState = [HTMLElement | null, string, string];

declare type MirloFetchData = {
  endpoint: string,
  data: Object,
  method: MirloHTTPMethod,
  cache_name: string,
};

declare type MirloComponentBase = {
  options: {[string]: unknown},
  state: {[string]: unknown},
  _events: {[string]: MirloComponentEvent} | null,
  _fetch_data: {[string]: MirloFetchData} | null,
  _state_binds: {[string]: MirloComponentBind} | null,
  _is_unsafe: boolean,
  _external_rel_styles: Array<string> | null,
  _skip_queue_state_raf: boolean,
};
