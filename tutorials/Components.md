The components in Mirlo are basically 'Web Components' that enable 'Shadow Root' by default:

![image](https://developer.mozilla.org/es/docs/Web/API/Web_components/Using_shadow_DOM/shadowdom.svg)

# Create a basic component

To implement a component you simply create a class that extends `Component` and register it in Mirlo:

```javascript
import {Component, registerComponent} from 'mirlo';

class Demo extends Component {
  static observedAttributes = ['mycprop'];

  onSetup() {
    Component.useStateBinds({
      msg: {
        id: 'msg',
        attribute: 'html',
      },
    });
    Component.useEvents({
      msg: {
        mode: 'id',
        events: {
          click: this.onClickMessage,
        },
      },
    });
  }

  onClickMessage(ev) {
    this.mirlo.state.msg = `<strong>${this.mirlo.options.mycprop}</strong>`;
  }
}

registerComponent('demo', Demo);
```

Now, use it:

```html
<template id="template-mirlo-demo" mycprop="Clicked!">
  <div id="msg"><strong>Hello World!</strong></div>
</template>

<mirlo-demo></mirlo-demo>
```

# More details

## Lifecycle

| Callback           | Async? | Description                                                                                              | Good moment for...                                           |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| onSetup            | [ ]    | Invoked at construction time.                                                                            | Configure the component.                                     |
| onWillStart        | [x]    | Invoked when the component is added to the DOM.                                                          | Do necessary async work.                                     |
| onStart            | [ ]    | Invoked when the component is added to the DOM and it is completely ready for use.                       | Change node.                                                 |
| onAttributeChanged | [ ]    | Invoked when an attribute of the component changes. (Configured with 'observedAttributes' static method) | This is internally used to fill 'this.mirlo.options' object. |
| onRemove           | [ ]    | Invoked when the component is removed from the DOM.                                                      | Cleanup.                                                     |

## Hook Functions

Components implements 'Hook Functions', these functions only can be called in the `onSetup` step. With these functions
you can configure the component:

- `useEvents()` -> Configure component event listeners.

  The function receives an object with the following scheme:

  ```
  {
    <NODE SELECTOR/ID>: {
      mode: <"id"|Undefined>,
      delegate: <CSS SELECTOR|Undefined>,
      <EVENT NAME>: <CALLBACK>
    }
  }
  ```

  Example:

  ```javascript
  Component.useEvents({
    '.tab': {
      click: this.onClickTab,
    },
  });
  ```

- `useFetchData()` -> Configure component prefetched network data.

  The function receives an object with the following scheme:

  ```
  {
    <CUSTOM NAME>: {
      enpoint: <String>,
      data: <Object>,
      method: <"GET"|"POST">,
      cache_name: <String>,
    }
  }
  ```

  Example:

  ```javascript
  Component.useFetchData({
    ipify: {endpoint: 'https://api.ipify.org/?format=json'},
  });
  ```

- `useStateBinds` -> Configure component state binds.

  The function receives an object with the following scheme. Note that only can use one of the 'id', 'selector' or '
  selectorAll' options.

  ```
  {
    <STATE ATTRIBUTE>: {
      attribute: <NODE ATTRIBUTE NAME|"html"|Undefined>,
      id: <String>,
      selector: <String>,
      selectorAll: <String>,
    }
  }
  ```

  Example:

  ```javascript
  Component.useStateBinds({
    desc: {
      attribute: 'html',
      id: 'description',
    },
  });
  ```

  ### Lists (arrays)

  A state bind with `each` renders an array: one node per item, cloned from a `<template>` with a single root element.
  Use `id` or `selector` for the container (`selectorAll` is not allowed). The container is owned by the list: its
  previous content is replaced on the first render.

  ```
  {
    <STATE ATTRIBUTE>: {
      id: <String>,
      each: {
        template: <TEMPLATE ID>,
        key: <FIELD NAME|FUNCTION(item, index)>,
        binds: {
          <ITEM FIELD|"$item"|"$index">: {
            selector: <String>,
            selectorAll: <String>,
            attribute: <NODE ATTRIBUTE NAME|"html"|".property"|Undefined>,
          },
        },
      },
    }
  }
  ```

  Example:

  ```html
  <template id="template-mirlo-todos">
    <ul id="list"></ul>
    <template id="item"
      ><li><input type="checkbox" /><span class="name"></span></li
    ></template>
  </template>
  ```

  ```javascript
  Component.useStateBinds({
    todos: {
      id: 'list',
      each: {
        template: 'item',
        key: 'id',
        binds: {
          name: {selector: '.name'}, // text by default (safe)
          done: {selector: 'input', attribute: '.checked'}, // '.x' sets the DOM property
        },
      },
    },
  });
  Component.useEvents({
    list: {mode: 'id', delegate: 'input', events: {change: this.onToggle}},
  });
  ```

  ```javascript
  this.mirlo.state.todos = [{id: 1, name: 'Milk', done: false}]; // render
  this.mirlo.state.todos.push({id: 2, name: 'Eggs', done: false}); // arrays are reactive
  this.mirlo.state.todos[0].done = true; // and so are the items (deep)
  ```

  - Rendering is a keyed diff: nodes are reused, only the bound values that changed are patched, and nodes are moved
    only when the order requires it. Several changes in the same frame are rendered once.
  - Keys must be unique (`undefined`/`null`/duplicated keys throw, and the DOM is left untouched).
  - `attribute`: `undefined` -> `textContent`, `'html'` -> `innerHTML` (do not use it with user data), `'.name'` -> DOM
    property, otherwise an attribute (`false`/`null`/`undefined` remove it, `true` sets it empty).
  - A bind without selector affects the item root. `$index` and `$item` bind the position and the item itself.
  - Only plain arrays/objects are reactive. Other values (Map, Set, class instances) need a reassignment.
  - Events of the items: use `delegate` in `useEvents` (the listener is in the container, so it also works with nodes
    created later). The callback receives `(event, matchedNode)` and `this.getListItem(matchedNode)` returns
    `{key, index, item}`; `item` is reactive. Non-bubbling events (`focus`, `blur`, `mouseenter`...) are captured.

- `useStyles()` -> Configure component styles.

  The function receives an array of strings with the location of the css resources:

  ```
  [<Strings>]
  ```

  Example:

  ```javascript
  Component.useStyles(['/static/css/mycomponent.css']);
  ```

- `disableShadow()` -> Disable Shadow DOM usage.
