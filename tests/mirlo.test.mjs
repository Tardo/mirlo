/* global process */
import {registerService, registerComponent} from '../dist/mirlo';
import Test01 from './components/test01';
import {ServiceTest02, Test02} from './components/test02';
import {mockFetch} from './mocks';

const waitRAF = () => new Promise(resolve => requestAnimationFrame(resolve));
const MAX_COMPONENTS = 2000;

beforeAll(async () => {
  window.fetch = mockFetch({ip: '127.0.0.1'});

  registerService('servTest02', ServiceTest02);
  registerComponent('test01', Test01);
  registerComponent('test02', Test02);
  document.body.innerHTML = `
    <template id="template-mirlo-test01">
      <span id="zoneA"></span>
      <span id="zoneB"></span>
    </template>
    <template id="template-mirlo-test02">
      <div id="test01_title"></div>
      <div id="test02_title"></div>
    </template>

    <mirlo-test01 id="testA" myval='123'></mirlo-test01>
    <div id="containerB">
      <mirlo-test02 id="testB"></mirlo-test02>
    </div>
    <div id="containerC"></div>
  `;
});

test('load component', () => {
  const dom_el_comp = document.body.querySelector('#testA');
  expect(dom_el_comp).not.toBeNull();
  const dom_el_comp_span = dom_el_comp.queryId('zoneA');
  expect(dom_el_comp_span.textContent).toBe('Hello World!');
});

test('click component', () => {
  const dom_el_comp = document.body.querySelector('#testA');
  const dom_el_comp_span = dom_el_comp.queryId('zoneA');
  expect(dom_el_comp_span.textContent).not.toBe('Clicked!');
  dom_el_comp_span.click();
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
  const dom_el_comp = document.body.querySelector('#test_comp_rmv');
  expect(dom_el_comp).not.toBeNull();
  const dom_el_comp_span = dom_el_comp.queryId('zoneA');
  expect(dom_el_comp_span.textContent).toBe('Hello World!');
});

test('remove component', async () => {
  window.comp_rmv_count = 0;
  document.body.querySelector('#test-rmv').remove();
  expect(window.comp_rmv_count).toBe(1);
});

test(`on-fly component performance [${MAX_COMPONENTS} components]`, async () => {
  for (let i = 0; i < MAX_COMPONENTS; ++i) {
    const new_div_comp = document.createElement('mirlo-test01');
    new_div_comp.id = `test-comp-rmv-${i}`;
    document.getElementById('containerC').appendChild(new_div_comp);
  }
  await new Promise(process.nextTick); // flush promises
  const componentTest = document.getElementById(
    `test-comp-rmv-${MAX_COMPONENTS - 1}`,
  );
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
  const dom_el_comp = document.body.querySelector('#testB');
  expect(dom_el_comp).not.toBeNull();
  const dom_el_comp_div = dom_el_comp.queryId('test01_title');
  expect(dom_el_comp_div.textContent).toBe('Hello Test! (127.0.0.1)');
});

test('component state', async () => {
  const dom_el_comp = document.body.querySelector('#testB');
  const dom_el_comp_div = dom_el_comp.queryId('test01_title');
  expect(dom_el_comp_div.textContent).toBe('Hello Test! (127.0.0.1)');
  dom_el_comp.mirlo.state.desc = 'State rechanged!';
  await waitRAF();
  expect(dom_el_comp_div.textContent).toBe('State rechanged!');
  const dom_el_comp_div_b = dom_el_comp.queryId('test02_title');
  expect(dom_el_comp_div_b.getAttribute('title')).toBeNull();
  dom_el_comp.mirlo.state.title = 'The title';
  dom_el_comp.mirlo.state.desc = 'State rechanged 2!';
  await waitRAF();
  expect(dom_el_comp_div_b.getAttribute('title')).toBe('The title');
  expect(dom_el_comp_div.textContent).toBe('State rechanged 2!');
});

test('component fetch data', () => {
  const componentTestB = document.getElementById('testB');
  expect(componentTestB.netdata.ipify.ip).toBe('127.0.0.1');
});
