import Service from '@mirlo/base/service';

/**
 * Proxy handler for the components state.
 * @typedef {Object} RequestsMethodEnum
 * @property {string} POST - Represents a POST requests.
 * @property {string} GET - Represents a GET requests.
 * @private
 */

/**
 * Enum with the available HTTP Requests methods.
 * @type {RequestsMethodEnum}
 * @const
 * @private
 */
export const HTTP_METHOD = {
  POST: 'POST',
  GET: 'GET',
};

/**
 * Class to implement HTTP Requests as a Service.
 * @extends Service
 * @hideconstructor
 */
class RequestsService extends Service {
  #cache = {};

  /**
   * The error messages.
   * @type {Object}
   * @property {string} e200 - The message for business logic error.
   */
  MESSAGES = {
    e200: '200: Invalid server result!',
  };

  /**
   * Get the HTTP Requests headers.
   * @param {Object} custom_headers - The http headers.
   * @returns {Object}
   */
  getHeaders(custom_headers) {
    return custom_headers;
  }

  /**
   * Fetch JSON data.
   * @param {string} url - The URL.
   * @param {Object} data - The payload.
   * @param {RequestsMethodEnum} method - The HTTP Request method.
   * @returns {Promise}
   */
  async queryJSON(url, data, method = HTTP_METHOD.POST, cache_name) {
    const use_cache = typeof cache_name !== 'undefined';
    let prom_response;
    if (use_cache && Object.hasOwn(this.#cache, cache_name)) {
      prom_response = this.#cache[cache_name];
    } else {
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
      if (typeof data !== 'undefined') {
        query_options.body = JSON.stringify(data);
      }

      if (use_cache) {
        prom_response = this.#cache[cache_name] = fetch(url, query_options);
      } else {
        prom_response = fetch(url, query_options);
      }
    }

    const response = await prom_response;
    const result = await response.clone().json();
    if (this.checkServerResult(result)) {
      return result;
    }
    throw Error(this.MESSAGES.e200);
  }

  /**
   * POST Fetch JSON data.
   * @param {string} url - The URL.
   * @param {Object} data - The payload.
   * @param {string} cache_name - The cache name.
   * @returns {Promise}
   */
  postJSON(url, data, cache_name) {
    return this.queryJSON(url, data, HTTP_METHOD.POST, cache_name);
  }

  /**
   *
   * @param {string} url - The URL.
   * @param {string} cache_name - The cache name.
   * @returns {Promise}
   */
  getJSON(url, cache_name) {
    return this.queryJSON(url, undefined, HTTP_METHOD.GET, cache_name);
  }

  /**
   * POST Fetch data.
   * @param {string} url - The URL.
   * @param {Object} data - The payload.
   * @param {string} cache - The cache store name.
   * @returns {Any}
   */
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

  /**
   * GET Fetch data.
   * @param {string} url
   * @param {string} cache
   * @returns {Any}
   */
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

  /**
   * Check if the response of the requests is a valid response.
   * @param {Object} data - The response data.
   * @returns {boolean}
   */
  checkServerResult(data) {
    if (!data || typeof data === 'undefined') {
      return false;
    }
    return true;
  }
}

export default RequestsService;
