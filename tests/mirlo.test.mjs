/* global process */
import {screen} from '@testing-library/dom';
import app from '../dist/mirlo';
import Test01 from './components/test01';
import {ServiceTest02, Test02} from './components/test02';
import {mockFetch} from './mocks';

const waitRAF = () => new Promise(resolve => requestAnimationFrame(resolve));
const MAX_COMPONENTS = 2000;

beforeAll(async () => {
  window.fetch = mockFetch({ip: '127.0.0.1'});

  app.registerService('servTest02', ServiceTest02);
  app.registerComponent('test01', Test01);
  app.registerComponent('test02', Test02);
  document.body.innerHTML = `
    <div id="testA" data-component="test01"></div>
    <div id="containerB">
      <div id="testB" data-component="test02">
        <div id="test01-title"></div>
        <div data-component-state-binds="desc-html title-title"></div>
      </div>
    </div>
    <div id="containerC"></div>
  `;
  await new Promise(process.nextTick); // flush promises
});

test('load component', () => {
  expect(screen.getByText('Hello World!')).toBeVisible();
});

test('click component', () => {
  const div = document.body.querySelector("[data-component='test01']");
  expect(screen.queryByText('Clicked!')).toBeNull();
  div.click();
  expect(screen.getByText('Clicked!')).toBeVisible();
  expect(screen.queryByText('Hello World!')).toBeNull();
});

test('on-fly component initialization', async () => {
  expect(screen.queryByText('Hello World!')).toBeNull();
  const new_div = document.createElement('div');
  new_div.id = 'test-rmv';
  const new_div_comp = document.createElement('div');
  new_div_comp.id = 'test-comp-rmv';
  new_div_comp.dataset.component = 'test01';
  new_div.appendChild(new_div_comp);
  document.getElementById('containerC').appendChild(new_div);
  await new Promise(process.nextTick); // flush promises
  await waitRAF();
  expect(screen.getByText('Hello World!')).toBeVisible();
  expect(screen.getByText('Clicked!')).toBeVisible();
});

test('remove component', async () => {
  window.comp_rmv_count = 0;
  document.body.querySelector('#test-rmv').remove();
  await new Promise(process.nextTick); // flush promises
  await waitRAF();
  expect(window.comp_rmv_count).toBe(1);
});

test(`on-fly component performance [${MAX_COMPONENTS} components]`, async () => {
  for (let i = 0; i < MAX_COMPONENTS; ++i) {
    const new_div_comp = document.createElement('div');
    new_div_comp.id = `test-comp-rmv-${i}`;
    new_div_comp.dataset.component = 'test01';
    document.getElementById('containerC').appendChild(new_div_comp);
  }
  await new Promise(process.nextTick); // flush promises
  await waitRAF();
  const componentTest = app.getComponentById(
    `test-comp-rmv-${MAX_COMPONENTS - 1}`,
  );
  expect(componentTest).toBeDefined();
});

test(`remove component performance [${MAX_COMPONENTS} components]`, async () => {
  window.comp_rmv_count = 0;
  document.getElementById('containerC').remove();
  await new Promise(process.nextTick); // flush promises
  await waitRAF();
  expect(window.comp_rmv_count).toBe(MAX_COMPONENTS);
});

test('custom service', () => {
  expect(screen.getByText('Hello Test!')).toBeVisible();
});

test('component state', () => {
  expect(screen.getByText('State changed!')).toBeVisible();
  const componentTestB = app.getComponentById('testB');
  componentTestB.state.desc = 'State rechanged!';
  expect(screen.getByText('State rechanged!')).toBeVisible();
  componentTestB.state.title = 'The title';
  const elm = componentTestB.query("[title='The title']");
  expect(elm).toBeVisible();
});

test('component fetch data', () => {
  const componentTestB = app.getComponentById('testB');
  expect(componentTestB.data.ipify.ip).toBe('127.0.0.1');
});
