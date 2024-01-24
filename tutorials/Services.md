Services are objects instantiated at the start of the application and accessible
at any time. They are useful for encapsulating actions shared by several
components. You can also see them as a link of information between components.

# Create custom service

To create a service simply create a class that extends `Service` and register it
in Mirlo:

```javascript
import {Service, registerService} from 'mirlo';

class MyService extends Service {
  getUsername(item) {
    return 'Juancho Panza';
  }
}

registerService('myservice', MyService);
```

Now, use it:

```javascript
import {getService} from 'mirlo';

getService('myservice').getUsername();
```
