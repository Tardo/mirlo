import {jest} from '@jest/globals';
import {Component, AnimatedComponent, HTTP_METHOD, getService, registerComponent} from '../dist/mirlo';

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
const flush = async () => {
  await new Promise(process.nextTick);
  await nextFrame();
};

describe('storage service', () => {
  const store = getService('localStorage');
  beforeEach(() => localStorage.clear());

  test('keeps falsy values', () => {
    for (const val of [0, false, '']) {
      store.setItem('k', val);
      expect(store.getItem('k', 'def')).toBe(val);
    }
  });

  test('round-trips objects', () => {
    store.setItem('k', {a: [1, 2]});
    expect(store.getItem('k')).toEqual({a: [1, 2]});
  });

  test('default for missing or invalid JSON', () => {
    expect(store.getItem('nope', 'def')).toBe('def');
    localStorage.setItem('bad', '{oops');
    expect(store.getItem('bad', 'def')).toBe('def');
  });

  test('reads legacy string values', () => {
    localStorage.setItem('old', JSON.stringify('42'));
    expect(store.getItem('old')).toBe('42');
  });

  test('setItem calls on_error', () => {
    const err = new Error('full');
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw err;
    });
    const on_error = jest.fn();
    expect(store.setItem('k', 1, on_error)).toBe(false);
    expect(on_error).toHaveBeenCalledWith(err);
  });
});

describe('requests service', () => {
  const requests = getService('requests');
  const ok = data => ({ok: true, clone: () => ({json: () => Promise.resolve(data)})});

  test('failed request is not cached', async () => {
    window.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce(ok({a: 1}));
    await expect(requests.queryJSON('/x', {}, 'c1')).rejects.toThrow('net');
    await expect(requests.queryJSON('/x', {}, 'c1')).resolves.toEqual({a: 1});
    expect(window.fetch).toHaveBeenCalledTimes(2);
  });

  test('successful request is cached', async () => {
    window.fetch = jest.fn().mockResolvedValue(ok({a: 1}));
    await requests.queryJSON('/y', {}, 'c2');
    await requests.queryJSON('/y', {}, 'c2');
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('component lifecycle', () => {
  test('events are not duplicated on re-attach', async () => {
    const onClick = jest.fn();
    registerComponent(
      'evt',
      class extends Component {
        onSetup() {
          Component.useEvents({'': {events: {click: onClick}}});
        }
      },
    );
    const el = document.createElement('mirlo-evt');
    document.body.appendChild(el);
    await flush();
    el.remove();
    document.body.appendChild(el);
    await flush();
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    el.remove();
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('GET fetch data sends no body', async () => {
    window.fetch = jest.fn().mockResolvedValue({ok: true, clone: () => ({json: () => Promise.resolve({a: 1})})});
    registerComponent(
      'get',
      class extends Component {
        onSetup() {
          Component.useFetchData({d: {endpoint: '/g', data: '{"a":1}', method: HTTP_METHOD.GET}});
        }
      },
    );
    document.body.appendChild(document.createElement('mirlo-get'));
    await flush();
    const opts = window.fetch.mock.calls[0][1];
    expect(opts.method).toBe('GET');
    expect(opts).not.toHaveProperty('body');
  });

  test('animation stops when removed and resumes when re-attached', async () => {
    const step = jest.fn();
    registerComponent(
      'anim',
      class extends AnimatedComponent {
        onAnimationStep = step;
      },
    );
    const el = document.createElement('mirlo-anim');
    document.body.appendChild(el);
    await flush();
    await nextFrame();
    expect(step).toHaveBeenCalled();
    el.remove();
    step.mockClear();
    await nextFrame();
    await nextFrame();
    expect(step).not.toHaveBeenCalled();
    document.body.appendChild(el);
    await flush();
    await nextFrame();
    expect(step).toHaveBeenCalled();
    el.remove();
  });
});
