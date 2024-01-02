import Service from '../base/service';

export default class RequestsService extends Service {
  MESSAGES = {
    e200: '200: Invalid server result!',
  };

  getHeaders(custom_headers) {
    return custom_headers;
  }

  async postJSON(url, data) {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'same-origin',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: this.getHeaders({
        'Content-Type': 'application/json',
      }),
      redirect: 'follow',
      referrerPolicy: 'same-origin',
      body: JSON.stringify(data),
    });
    const result = response.json();
    if (this.checkServerResult(result)) {
      return result;
    }
    throw Error(this.MESSAGES.e200);
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
      return true;
    }
  }
}
