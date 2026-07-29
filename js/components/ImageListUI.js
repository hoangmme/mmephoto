/**
 * ImageListUI.js
 * Manages rendering of photo gallery thumbnails and selection state indicators.
 */

export class ImageListUI {
  constructor(containerId = 'imageList', options = {}) {
    this.container = document.getElementById(containerId);
    this.onThumbnailClick = options.onThumbnailClick || null;
  }

  render(images, options = {}) {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (!images || images.length === 0) {
      this.container.innerHTML = '<div class="pl-loading">Chưa có ảnh nào...</div>';
      return;
    }

    const {
      step = 1,
      selectedPhotos = new Set(),
      selectedImageId = null,
      activeSlotImageId = null,
      usedIds = new Set()
    } = options;

    images.forEach(img => {
      const thumb = document.createElement('div');
      thumb.className = 'pl-thumb';
      thumb.dataset.id = img.id;

      const imgTag = document.createElement('img');
      imgTag.src = img.url || img.objectUrl;
      imgTag.alt = 'Photo';

      const label = document.createElement('span');
      label.className = 'pl-thumb-name';
      label.textContent = img.filename || img.id;

      thumb.appendChild(imgTag);
      thumb.appendChild(label);

      if (step === 2) {
        if (selectedPhotos.has(img.id)) {
          thumb.classList.add('selected');
          const badge = document.createElement('div');
          badge.className = 'pl-thumb-badge';
          badge.textContent = Array.from(selectedPhotos).indexOf(img.id) + 1;
          thumb.appendChild(badge);
        }
      } else {
        if (img.id === selectedImageId || img.id === activeSlotImageId) {
          thumb.classList.add('selected');
        }
        if (usedIds.has(img.id)) thumb.classList.add('used');
      }

      thumb.addEventListener('click', () => {
        if (this.onThumbnailClick) this.onThumbnailClick(img, thumb);
      });

      this.container.appendChild(thumb);
    });
  }
}
