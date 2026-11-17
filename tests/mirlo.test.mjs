/* global process */
import {registerService, registerComponent} from '../dist/mirlo';
import Test01 from './components/test01';
import {ServiceTest02, Test02} from './components/test02';
import Test03 from './components/test03';
import Test04 from './components/test04';
import {mockFetch} from './mocks';

const waitEvent = (elm, evt) => new Promise(resolve => elm.addEventListener(evt, resolve));
const waitRAF = elm => new Promise(resolve => requestAnimationFrame(resolve, elm));
const MAX_COMPONENTS = 2000;

beforeAll(async () => {
  window.fetch = mockFetch({ip: '127.0.0.1'});

  registerService('servTest02', ServiceTest02);
  registerComponent('test01', Test01);
  registerComponent('test02', Test02);
  registerComponent('test03', Test03);
  registerComponent('test04', Test04);
  document.body.innerHTML = `
    <template id="template-mirlo-test01">
      <span id="zoneA"></span>
      <span id="zoneB"></span>
    </template>
    <template id="template-mirlo-test02">
      <div id="test01_title"></div>
      <div id="test02_title"></div>
    </template>
    <template id="template-mirlo-test03">
      <span id="test03_text"></div>
    </template>

    <template id="template-mirlo-test04">
      <div id="list"></div>
      <template id="item"><p><span class="idx"></span><b class="name"></b></p></template>
    </template>
    <mirlo-test04 id="testD"></mirlo-test04>

    <mirlo-test01 id="testA" myval='123'></mirlo-test01>
    <div id="containerB">
      <mirlo-test02 id="testB"></mirlo-test02>
    </div>
    <div id="containerC"></div>
    <mirlo-test03 id="testC"></mirlo-test03>
  `;
});

test('load component', () => {
  const dom_el_comp = document.getElementById('testA');
  expect(dom_el_comp).not.toBeNull();
  const dom_el_comp_span = dom_el_comp.queryId('zoneA');
  expect(dom_el_comp_span.textContent).toBe('Hello World!');
});

test('click component', async () => {
  const dom_el_comp = document.getElementById('testA');
  const dom_el_comp_span = dom_el_comp.queryId('zoneA');
  expect(dom_el_comp_span.textContent).not.toBe('Clicked!');
  await waitRAF();
  dom_el_comp_span.click();
  await waitRAF();
  expect(dom_el_comp_span.textContent).toBe('Clicked!');
});

test('on-fly component initialization', async () => {
  const new_div = document.createElement('div');
  new_div.id = 'test-rmv';
  const new_div_comp = document.createElement('mirlo-test01');
  new_div_comp.id = 'test_comp_rmv';
  new_div.appendChild(new_div_comp);
  document.getElementById('containerC').appendChild(new_div);
  await new Promise(process.nextTick); // flush promises
  const dom_el_comp = document.getElementById('test_comp_rmv');
  expect(dom_el_comp).not.toBeNull();
  const dom_el_comp_span = dom_el_comp.queryId('zoneA');
  expect(dom_el_comp_span.textContent).toBe('Hello World!');
});

test('remove component', async () => {
  window.comp_rmv_count = 0;
  document.getElementById('test-rmv').remove();
  expect(window.comp_rmv_count).toBe(1);
});

test(`on-fly component performance [${MAX_COMPONENTS} components]`, async () => {
  const containerD = document.createElement('div');
  for (let i = 0; i < MAX_COMPONENTS; ++i) {
    const new_div_comp = document.createElement('mirlo-test01');
    new_div_comp.id = `test-comp-rmv-${i}`;
    containerD.appendChild(new_div_comp);
  }
  document.getElementById('containerC').appendChild(containerD);
  await new Promise(process.nextTick); // flush promises
  const componentTest = document.getElementById(`test-comp-rmv-${MAX_COMPONENTS - 1}`);
  expect(componentTest).toBeDefined();
  expect(componentTest.mirlo).toBeDefined();
});

test(`remove component performance [${MAX_COMPONENTS} components]`, async () => {
  window.comp_rmv_count = 0;
  document.getElementById('containerC').remove();
  await new Promise(process.nextTick); // flush promises
  expect(window.comp_rmv_count).toBe(MAX_COMPONENTS);
});

test('custom service', () => {
  const dom_el_comp = document.getElementById('testB');
  expect(dom_el_comp).not.toBeNull();
  const dom_el_comp_div = dom_el_comp.queryId('test01_title');
  expect(dom_el_comp_div.textContent).toBe('Hello Test! (127.0.0.1)');
});

test('component state', async () => {
  const dom_el_comp = document.getElementById('testB');
  const dom_el_comp_div = dom_el_comp.queryId('test01_title');
  expect(dom_el_comp_div.textContent).toBe('Hello Test! (127.0.0.1)');
  dom_el_comp.mirlo.state.desc = 'State rechanged!';
  await waitRAF(dom_el_comp_div);
  expect(dom_el_comp_div.textContent).toBe('State rechanged!');
  const dom_el_comp_div_b = dom_el_comp.queryId('test02_title');
  expect(dom_el_comp_div_b.getAttribute('title')).toBeNull();
  dom_el_comp.mirlo.state.title = 'The title';
  dom_el_comp.mirlo.state.desc = 'State rechanged 2!';
  await waitRAF(dom_el_comp_div_b);
  expect(dom_el_comp_div_b.getAttribute('title')).toBe('The title');
  expect(dom_el_comp_div.textContent).toBe('State rechanged 2!');
});

test('component fetch data', () => {
  const dom_el_comp = document.getElementById('testB');
  expect(dom_el_comp.getFetchData('ipify').ip).toBe('127.0.0.1');
});

test('component animation', async () => {
  const dom_el_comp = document.getElementById('testC');
  await waitRAF(dom_el_comp);
  expect(dom_el_comp.mirlo.state.counter).toBeGreaterThan(0);
  const counter = Number(dom_el_comp.queryId('test03_text').textContent);
  expect(counter).toBeGreaterThan(0);
});

test('component attribute change', async () => {
  const dom_el_comp = document.getElementById('testA');
  expect(dom_el_comp.mirlo.options.myval).toBe('123');
  dom_el_comp.setAttribute('myVal', '42');
  expect(dom_el_comp.mirlo.options.myval).toBe('42');
});

describe('list binds', () => {
  const comp = () => document.getElementById('testD');
  const list = () => comp().queryId('list');
  const names = () => Array.from(list().children, el => el.querySelector('.name').textContent);
  const mk = (...ids) => ids.map(id => ({id, name: `n${id}`, done: false}));
  let moves;
  beforeAll(() => {
    const orig = list().insertBefore.bind(list());
    moves = {count: 0, frags: 0};
    list().insertBefore = (...args) => {
      if (args[0] instanceof DocumentFragment) {
        ++moves.frags;
      } else {
        ++moves.count;
      }
      return orig(...args);
    };
  });

  test('render + reuse nodes + minimal moves', async () => {
    const state = comp().mirlo.state;
    state.items = mk(1, 2, 3, 4, 5);
    await waitRAF();
    expect(names()).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
    expect(list().children[2].querySelector('.idx').textContent).toBe('2');
    const node3 = list().children[2];

    moves.count = 0;
    state.items = mk(1, 2, 3, 4, 5, 6); // append
    await waitRAF();
    expect(moves.count).toBe(0);

    moves.count = 0;
    state.items = mk(1, 5, 3, 4, 2, 6); // swap
    await waitRAF();
    expect(names()).toEqual(['n1', 'n5', 'n3', 'n4', 'n2', 'n6']);
    expect(moves.count).toBeLessThanOrEqual(2);
    expect(list().children[2]).toBe(node3);

    state.items = mk(6, 3);
    await waitRAF();
    expect(names()).toEqual(['n6', 'n3']);
    expect(list().children[1]).toBe(node3);
    state.items = [];
    await waitRAF();
    expect(list().children.length).toBe(0);
  });

  test('mutations: push, in-place field, coalesced', async () => {
    const state = comp().mirlo.state;
    state.items = mk(1, 2);
    await waitRAF();
    const node1 = list().children[0];
    state.items.push({id: 3, name: 'n3', done: false});
    state.items[0].name = 'changed';
    state.items[1].done = true;
    expect(names()).toEqual(['n1', 'n2']); // deferred
    await waitRAF();
    expect(names()).toEqual(['changed', 'n2', 'n3']);
    expect(list().children[0]).toBe(node1);
    expect(list().children[1].getAttribute('data-done')).toBe('');
    expect(list().children[0].hasAttribute('data-done')).toBe(false);
    state.items.reverse();
    await waitRAF();
    expect(names()).toEqual(['n3', 'n2', 'changed']);
  });

  test('several assignments in one frame render once', async () => {
    const state = comp().mirlo.state;
    state.items = [];
    await waitRAF();
    moves.frags = 0;
    for (let i = 1; i <= 5; ++i) {
      state.items = mk(...Array.from({length: i}, (_, k) => k + 1));
    }
    await waitRAF();
    expect(names().length).toBe(5);
    expect(moves.frags).toBe(1);
  });

  test('frozen data can be read and rendered', async () => {
    const state = comp().mirlo.state;
    state.items = Object.freeze(mk(1, 2));
    await waitRAF();
    expect(names()).toEqual(['n1', 'n2']);
    expect(state.items.map(item => item.id)).toEqual([1, 2]);
    expect(state.items[0].name).toBe('n1');
  });

  test('proxies do not nest when the state is rebuilt', async () => {
    const state = comp().mirlo.state;
    state.items = mk(1, 2);
    for (let i = 0; i < 3; ++i) {
      state.items = state.items.filter(() => true);
      state.items = [...state.items];
    }
    await waitRAF();
    let calls = 0;
    const orig = comp().onStateChanged;
    comp().onStateChanged = (...args) => {
      ++calls;
      return orig.apply(comp(), args);
    };
    state.items[0].name = 'x';
    comp().onStateChanged = orig;
    expect(calls).toBe(1);
    await waitRAF();
    expect(names()).toEqual(['x', 'n2']);
  });

  test('duplicated key throws and keeps the DOM', async () => {
    const before = names();
    const errors = [];
    const onError = ev => {
      ev.preventDefault();
      errors.push(ev.error ?? ev.message);
    };
    window.addEventListener('error', onError);
    comp().mirlo.state.items = mk(1, 1);
    await waitRAF();
    window.removeEventListener('error', onError);
    expect(String(errors[0])).toMatch(/duplicated key '1'/);
    expect(names()).toEqual(before);
  });

  test('delegated event on rendered items', async () => {
    comp().mirlo.state.items = mk(7, 8);
    await waitRAF();
    list().children[1].querySelector('.name').click();
    expect(comp().clicked.key).toBe(8);
    expect(comp().clicked.index).toBe(1);
    comp().clicked.item.name = 'clicked';
    await waitRAF();
    expect(names()).toEqual(['n7', 'clicked']);
  });
});
