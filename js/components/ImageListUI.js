/**
 * ImageListUI.js
 * Manages rendering of photo gallery thumbnails and selection state indicators.
 */

export class ImageListUI {
  constructor(containerId = 'imageList', options = {}) {
    if (typeof containerId === 'object') {
      options = containerId;
      this.container = options.container || document.getElementById('imageList');
    } else {
      this.container = document.getElementById(containerId);
    }
    this.onThumbnailClick = options.onThumbnailClick || options.onPhotoClick || null;
  }

  render(images, options = {}) {
    if (!this.container) return;

    let imgList = images;
    let opts = options;
    if (!Array.isArray(images) && images && typeof images === 'object') {
      imgList = images.images || [];
      opts = images;
    }

    this.container.innerHTML = '';

    if (!imgList || imgList.length === 0) {
      this.container.innerHTML = '<div class="pl-loading">Chưa có ảnh nào...</div>';
      return;
    }

    const {
      step = 1,
      selectedPhotos = new Set(),
      selectedImageId = null,
      activeSlotImageId = null
    } = opts;

    imgList.forEach(img => {
      const thumb = document.createElement('div');
      thumb.className = 'pl-thumb';
      thumb.dataset.id = img.id;

      const imgTag = document.createElement('img');
      imgTag.src = img.url || img.objectUrl;
      imgTag.alt = 'Photo';

      const label = document.createElement('span');
      label.className = 'pl-thumb-name';
      label.textContent = img.filename || img.name || img.id;

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
      }

      let clickHandled = false;
      const handleSelect = (e) => {
        if (clickHandled) return;
        clickHandled = true;
        setTimeout(() => { clickHandled = false; }, 300);
        if (this.onThumbnailClick) this.onThumbnailClick(img, thumb);
      };

      thumb.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          handleSelect(e);
        }
      });
      thumb.addEventListener('click', handleSelect);

      this.container.appendChild(thumb);
    });
  }
}
