declare type MirloStorage = typeof localStorage | typeof sessionStorage;

declare type MirloHTTPResponseMessage = {
  e200: string,
};
declare type MirloHTTPMethod = 'POST' | 'GET';

declare type MirloEventCallback = () => Promise<mixed>;

declare type MirloComponentEvent = {
  mode: string,
  events: {[string]: MirloEventCallback},
};

declare type MirloComponentBind = {
  id?: string,
  selector?: string,
  selectorAll?: string,
  attribute: string,
};

declare type MirloComponentState = [HTMLElement | null, string, string];

declare type MirloFetchData = {
  endpoint: string,
  data: Object,
  method: MirloHTTPMethod,
  cache_name: string,
};

declare type MirloComponentBase = {
  options: {[string]: mixed},
  state: {[string]: mixed},
  _events: {[string]: MirloComponentEvent} | null,
  _fetch_data: {[string]: MirloFetchData} | null,
  _state_binds: {[string]: MirloComponentBind} | null,
  _is_unsafe: boolean,
  _external_rel_styles: Array<string> | null,
  _skip_queue_state_raf: boolean,
};
