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
    this.onZoomClick = options.onZoomClick || null;
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
      let thumbSrc = img.url || img.objectUrl;
      if (typeof thumbSrc === 'string' && thumbSrc.includes('/uploads/') && !thumbSrc.includes('00_frame') && !thumbSrc.includes('_thumb.webp') && !thumbSrc.startsWith('data:')) {
        const lastDot = thumbSrc.lastIndexOf('.');
        if (lastDot !== -1) {
          thumbSrc = thumbSrc.substring(0, lastDot) + '_thumb.webp';
        }
      }
      imgTag.src = thumbSrc;
      imgTag.alt = 'Photo';

      const label = document.createElement('span');
      label.className = 'pl-thumb-name';
      label.textContent = img.filename || img.name || img.id;

      thumb.appendChild(imgTag);
      thumb.appendChild(label);

      // Lightbox / Zoom button
      const zoomBtn = document.createElement('button');
      zoomBtn.className = 'pl-thumb-zoom-btn';
      zoomBtn.type = 'button';
      zoomBtn.innerHTML = '🔍';
      zoomBtn.title = 'Xem phóng to';
      zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onZoomClick) {
          const itemIdx = imgList.indexOf(img);
          this.onZoomClick(itemIdx >= 0 ? itemIdx : 0, imgList);
        }
      });
      zoomBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
      thumb.appendChild(zoomBtn);

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

      thumb.addEventListener('click', (e) => {
        if (e.target.closest('.pl-thumb-zoom-btn')) return;
        if (this.onThumbnailClick) this.onThumbnailClick(img, thumb);
      });

      this.container.appendChild(thumb);
    });
  }
}
