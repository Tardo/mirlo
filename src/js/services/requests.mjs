import Service from '@mirlo/base/service';

export const METHOD = {
  POST: 'POST',
  GET: 'GET',
};

export default class extends Service {
  MESSAGES = {
    e200: '200: Invalid server result!',
  };

  getHeaders(custom_headers) {
    return custom_headers;
  }

  async queryJSON(url, data, method = METHOD.POST) {
    const query_options = {
      method: method,
      mode: 'same-origin',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: this.getHeaders({
        'Content-Type': 'application/json',
      }),
      redirect: 'follow',
      referrerPolicy: 'same-origin',
    };
    if (data && method.toUpperCase() === METHOD.POST) {
      query_options.body = JSON.stringify(data);
    }
    const response = await fetch(url, query_options);
    const result = response.json();
    if (this.checkServerResult(result)) {
      return result;
    }
    throw Error(this.MESSAGES.e200);
  }

  postJSON(url, data) {
    return this.queryJSON(url, data, METHOD.POST);
  }

  getJSON(url) {
    return this.queryJSON(url, undefined, METHOD.GET);
  }

  async post(url, data, cache = 'default') {
    let fdata = false;
    if (typeof data === 'object') {
      fdata = new URLSearchParams();
      for (const k in data) {
        fdata.append(k, data[k]);
      }
    } else if (typeof data === 'string') {
      fdata = data;
    }
    const response = await fetch(url, {
      method: 'POST',
      mode: 'same-origin',
      cache: cache,
      credentials: 'same-origin',
      headers: this.getHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      redirect: 'follow',
      referrerPolicy: 'same-origin',
      body: fdata,
    });
    const result = response.json();
    if (this.checkServerResult(result)) {
      return result;
    }
    throw Error(this.MESSAGES.e200);
  }

  async get(url, cache = 'default') {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'same-origin',
      cache: cache,
      credentials: 'same-origin',
      headers: this.getHeaders(),
      redirect: 'follow',
      referrerPolicy: 'same-origin',
    });
    return response.blob();
  }

  checkServerResult(data) {
    if (!data || typeof data === 'undefined') {
      return false;
    }
    return true;
  }
}
