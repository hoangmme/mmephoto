/**
 * CrossSellBanner.js
 * Renders and manages the Step 4 cross-sell product recommendation slider.
 */

export class CrossSellBanner {
  constructor(containerId = 'crossSellBanner') {
    this.container = document.getElementById(containerId);
  }

  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  setVisible(visible) {
    if (visible) this.show();
    else this.hide();
  }
}
