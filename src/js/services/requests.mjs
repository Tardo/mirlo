// @flow strict
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
  #cache: {[string]: Promise<Response>} = {};

  /**
   * The error messages.
   * @type {Object}
   * @property {string} e200 - The message for business logic error.
   */
  MESSAGES: MirloHTTPResponseMessage = {
    e200: '200: Invalid server result!',
  };

  /**
   * Fetch JSON data.
   * @param {string} url - The URL.
   * @param {RequestOptions} custom_options - The request options.
   * @param {string} cache_name - The cache name.
   * @returns {Promise}
   */
  async queryJSON(url: string, custom_options: RequestOptions, cache_name: string): Promise<{...}> {
    const use_cache = typeof cache_name !== 'undefined';
    let prom_response;
    if (use_cache && Object.hasOwn(this.#cache, cache_name)) {
      prom_response = this.#cache[cache_name];
    } else {
      const query_options: RequestOptions = {
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        redirect: 'follow',
        referrerPolicy: 'same-origin',
      };
      Object.assign(query_options, custom_options);

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
   * @param {RequestOptions} custom_options - The request options.
   * @param {string} cache_name - The cache name.
   * @returns {Promise}
   */
  postJSON(url: string, custom_options: RequestOptions, cache_name: string): Promise<{...}> {
    const query_options: RequestOptions = {
      method: HTTP_METHOD.POST,
    };
    Object.assign(query_options, custom_options);
    return this.queryJSON(url, query_options, cache_name);
  }

  /**
   *
   * @param {string} url - The URL.
   * @param {RequestOptions} custom_options - The request options.
   * @param {string} cache_name - The cache name.
   * @returns {Promise}
   */
  getJSON(url: string, custom_options: RequestOptions, cache_name: string): Promise<{...}> {
    const query_options: RequestOptions = {
      method: HTTP_METHOD.GET,
    };
    Object.assign(query_options, custom_options);
    return this.queryJSON(url, query_options, cache_name);
  }

  /**
   * POST Fetch data.
   * @param {string} url - The URL.
   * @param {RequestOptions} custom_options - The request options.
   * @param {string} cache_name - The cache store name.
   * @returns {Any}
   */
  async post(url: string, custom_options: RequestOptions, cache_name: string): Promise<mixed> {
    const use_cache = typeof cache_name !== 'undefined';
    let prom_response;
    if (use_cache && Object.hasOwn(this.#cache, cache_name)) {
      prom_response = this.#cache[cache_name];
    } else {
      const query_options: RequestOptions = {
        method: 'POST',
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'follow',
        referrerPolicy: 'same-origin',
      };
      Object.assign(query_options, custom_options);

      if (use_cache) {
        prom_response = this.#cache[cache_name] = fetch(url, query_options);
      } else {
        prom_response = fetch(url, query_options);
      }
    }

    return prom_response;
  }

  /**
   * GET Fetch data.
   * @param {string} url
   * @param {RequestOptions} custom_options - The request options.
   * @param {string} cache_name - The cache store name.
   * @returns {Any}
   */
  async get(url: string, custom_options: RequestOptions, cache_name: string): Promise<mixed> {
    const use_cache = typeof cache_name !== 'undefined';
    let prom_response;
    if (use_cache && Object.hasOwn(this.#cache, cache_name)) {
      prom_response = this.#cache[cache_name];
    } else {
      const query_options: RequestOptions = {
        method: 'GET',
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        redirect: 'follow',
        referrerPolicy: 'same-origin',
      };
      Object.assign(query_options, custom_options);

      if (use_cache) {
        prom_response = this.#cache[cache_name] = fetch(url, query_options);
      } else {
        prom_response = fetch(url, query_options);
      }
    }
    return await prom_response;
  }

  /**
   * Check if the response of the requests is a valid response.
   * @param {Object} data - The response data.
   * @returns {boolean}
   */
  checkServerResult(data: {...}): boolean {
    if (!data || typeof data === 'undefined') {
      return false;
    }
    return true;
  }
}

export default RequestsService;
