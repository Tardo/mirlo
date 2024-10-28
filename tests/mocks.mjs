import {jest} from '@jest/globals';

export function mockFetch(data) {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      clone: () => {
        return {json: () => Promise.resolve(data)};
      },
    }),
  );
}
