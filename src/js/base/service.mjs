export default class {
  onWillStart() {
    return Promise.resolve();
  }

  destroy() {
    throw Error('Not Implemented!');
  }
}
