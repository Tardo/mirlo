# Services

Mirlo comes with some built-in services:

- `requests` -> Performs HTTP requests.
- `localStorage` -> Performs operations on the browser's local storage.
- `sessionStorage` -> Performs operations on the browser's session storage.

---

## Modify built-in services

Overwriting of registered services is allowed. To do so, simply indicate that you want to " forced" register the
service.

For example, if we want to modify the headers sent by the 'requests' service we can do something like this:

```javascript
import {RequestsService, registerService} from 'mirlo';

export default class MyRequestsService extends RequestsService {
  getUsername(item) {
    return 'Juancho Panza';
  }
}

registerService('requests', MyRequestsService, true);
```
