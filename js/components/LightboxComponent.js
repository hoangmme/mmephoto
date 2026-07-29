/**
 * LightboxComponent.js
 * Independent UI component for viewing high-res photos in full screen lightbox modal.
 */

export class LightboxComponent {
  constructor(options = {}) {
    this.overlay = document.getElementById('lightboxOverlay');
    this.imgEl = document.getElementById('lightboxImg');
    this.counterEl = document.getElementById('lightboxCounter');
    this.closeBtn = document.getElementById('btnLightboxClose');
    this.prevBtn = document.getElementById('btnLightboxPrev');
    this.nextBtn = document.getElementById('btnLightboxNext');
    this.selectBtn = document.getElementById('btnLightboxSelect');

    this.images = [];
    this.currentIndex = -1;
    this.onSelectToggle = options.onSelectToggle || null;
    this.isImageSelected = options.isImageSelected || (() => false);

    this._bindEvents();
  }

  _bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prev());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.next());
    }
    if (this.selectBtn) {
      this.selectBtn.addEventListener('click', () => {
        if (this.images.length > 0 && this.currentIndex >= 0) {
          const currentImg = this.images[this.currentIndex];
          if (this.onSelectToggle) this.onSelectToggle(currentImg);
          this.updateContent();
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (!this.overlay || !this.overlay.classList.contains('active')) return;
      if (e.key === 'Escape') this.close();
      else if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'ArrowRight') this.next();
    });
  }

  open(images, startIndex = 0) {
    if (!images || images.length === 0) return;
    this.images = images;
    this.currentIndex = Math.max(0, Math.min(startIndex, images.length - 1));
    this.updateContent();
    if (this.overlay) this.overlay.classList.add('active');
  }

  close() {
    if (this.overlay) this.overlay.classList.remove('active');
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateContent();
    }
  }

  next() {
    if (this.images && this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
      this.updateContent();
    }
  }

  updateContent() {
    if (!this.images || this.currentIndex < 0 || this.currentIndex >= this.images.length) return;
    const imgObj = this.images[this.currentIndex];
    if (this.imgEl) this.imgEl.src = imgObj.url || imgObj.src;
    if (this.counterEl) this.counterEl.textContent = `${this.currentIndex + 1} / ${this.images.length}`;

    if (this.selectBtn) {
      const selected = this.isImageSelected(imgObj.id);
      this.selectBtn.classList.toggle('selected', selected);
      this.selectBtn.textContent = selected ? '✓ Đã chọn' : '+ Chọn ảnh này';
    }
  }
}
