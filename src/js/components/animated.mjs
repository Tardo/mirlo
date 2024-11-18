import Component from '@mirlo/base/component';

/**
 * Class representing a Animated Component node.
 * See {@tutorial AnimatedComponents}.
 * @tutorial components
 */
class AnimatedComponent extends Component {
  /**
   * The rAF handler for animation.
   * @type {Number}
   * @private
   */
  #animation_raf = 0;

  /**
   * Flag to know if the animation loop is running
   * @type {Boolean}
   * @private
   */
  #animation_running = true;

  /**
   * @override
   */
  onStart() {
    super.onStart();
    this.startAnimation();
  }

  /**
   * Start the animation loop
   */
  startAnimation() {
    if (this.#animation_raf !== 0) {
      window.cancelAnimationFrame(this.#animation_raf);
    }
    this.#animation_running = true;
    this.#animation_raf = window.requestAnimationFrame(
      this.#animate.bind(this),
      this.root,
    );
  }

  /**
   * Stop the animation loop
   */
  stopAnimation() {
    if (this.#animation_raf !== 0) {
      window.cancelAnimationFrame(this.#animation_raf);
      this.#animation_raf = 0;
    }
    this.#animation_running = false;
  }

  /**
   * Invoked when a frame is drawn.
   * @param {Number} timestamp - The time elapsed.
   * @private
   */
  #animate(timestamp) {
    this.mirlo._skip_queue_state_raf = true;
    this.onAnimationStep(timestamp);
    this.mirlo._skip_queue_state_raf = false;
    if (this.#animation_running) {
      this.#animation_raf = window.requestAnimationFrame(
        this.#animate.bind(this),
        this.root,
      );
    }
  }

  /**
   * Invoked when a frame is drawn.
   * @param {Number} timestamp - The timestamp.
   */
  onAnimationStep() {
    // Override me
  }
}

export default AnimatedComponent;
