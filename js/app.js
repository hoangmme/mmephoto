// ============================================
// PhotoTune Pro — Main Application
// ============================================

import { PRESETS, DEFAULT_PARAMS } from './presets.js';
import { ImageProcessor } from './processor.js';
import { parseCubeLUT, serializeLUT, deserializeLUT } from './lut-parser.js';
import { BUILTIN_LUTS, LUT_CATEGORIES } from './builtin-luts.js';

class PhotoTuneApp {
  constructor() {
    this.processor = new ImageProcessor();
    this.params = { ...DEFAULT_PARAMS };
    this.imageData = null;       // { originalData, previewData, fullWidth, fullHeight, ... }
    this.activePreset = null;
    this.aspectLocked = true;
    this.processTimer = null;
    this.isShowingOriginal = false;

    // LUT state
    this.builtinLuts = [];       // Array of { id, title, category, file, lut (lazy), loaded }
    this.userLuts = [];          // Array of { id, title, size, lut }
    this.activeLutId = null;     // Currently active LUT id
    this.lutIntensity = 100;     // 0-100
    this.lutCategory = 'all';    // Current filter category
    
    // User Presets
    this.userPresets = [];
    this._loadUserPresets();
    // Photo queue state
    this.photos = [];            // Array of { id, file, objectUrl, imageData, params, activePreset, activeLutId, lutIntensity }
    this.activePhotoId = null;
    this.photoIdCounter = 0;

    this.db = null;              // IndexedDB reference

    this._cacheDOM();
    this._buildPresets();
    this._bindEvents();
    this._updateAllSliderFills();
    this._initLutDB();
  }

  // ── DOM References ──
  _cacheDOM() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.previewInfo = document.getElementById('previewInfo');
    this.presetGrid = document.getElementById('presetGrid');
    this.overlay = document.getElementById('processingOverlay');
    this.btnExport = document.getElementById('btnExport');
    this.resizeW = document.getElementById('resizeWidth');
    this.resizeH = document.getElementById('resizeHeight');
    this.resizeLock = document.getElementById('resizeLock');
    this.sliderRows = document.querySelectorAll('.slider-row[data-param]');
    this.formatBtns = document.querySelectorAll('.format-btn');
    this.selectedFormat = 'jpeg';

    // LUT DOM
    this.lutFileInput = document.getElementById('lutFileInput');
    this.lutList = document.getElementById('lutList');
    this.lutEmpty = document.getElementById('lutEmpty');
    this.lutIntensityRow = document.getElementById('lutIntensityRow');
    this.lutIntensityInput = this.lutIntensityRow.querySelector('input[type="range"]');
    this.lutIntensityDisplay = this.lutIntensityRow.querySelector('.value');

    // Sidebar DOM
    this.thumbnailSidebar = document.getElementById('thumbnailSidebar');
    this.thumbnailList = document.getElementById('thumbnailList');
    this.btnAddMore = document.getElementById('btnAddMore');

    // Preset DOM
    this.btnSavePreset = document.getElementById('btnSavePreset');
    this.btnExportPreset = document.getElementById('btnExportPreset');
    this.btnImportPreset = document.getElementById('btnImportPreset');
    this.presetFileInput = document.getElementById('presetFileInput');

    // HSL DOM
    this.hslBtns = document.querySelectorAll('.hsl-color-btn');
    this.hslSliders = document.querySelectorAll('.slider-row[data-hsl]');
    this.activeHslColor = 'red';
  }

  // ── Build preset buttons ──
  _loadUserPresets() {
    try {
      const stored = localStorage.getItem('phototune_user_presets');
      if (stored) this.userPresets = JSON.parse(stored);
    } catch(e) { console.warn('Failed to load user presets', e); }
  }

  _buildPresets() {
    this.presetGrid.innerHTML = '';
    Object.entries(PRESETS).forEach(([key, preset]) => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.dataset.preset = key;
      btn.innerHTML = `${preset.icon} ${preset.name}`;
      btn.title = preset.desc;
      this.presetGrid.appendChild(btn);
    });
    
    this.userPresets.forEach(preset => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn user-preset';
      btn.dataset.userPreset = preset.id;
      btn.innerHTML = `👤 ${preset.name}`;
      btn.title = 'User Preset';
      this.presetGrid.appendChild(btn);
    });
  }

  // ── Event Bindings ──
  _bindEvents() {
    // File open
    document.getElementById('btnOpen').addEventListener('click', () => {
      this.clearOnNextFiles = true;
      this.fileInput.setAttribute('multiple', 'true');
      this.fileInput.click();
    });
    this.btnAddMore.addEventListener('click', () => {
      this.clearOnNextFiles = false;
      this.fileInput.setAttribute('multiple', 'true');
      this.fileInput.click();
    });
    this.fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      await this._handleFiles(files);
      e.target.value = ''; // Reset to allow selecting the same files again
    });

    // Drag and drop
    this.dropZone.addEventListener('click', () => {
      this.clearOnNextFiles = true;
      this.fileInput.setAttribute('multiple', 'true');
      this.fileInput.click();
    });
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('drag-over');
    });
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      this.clearOnNextFiles = false; // Drag drop always appends
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        if (files[0].name.toLowerCase().endsWith('.cube')) {
          this._importLUT(files[0]);
        } else {
          const imageFiles = files.filter(f => f.type.startsWith('image/'));
          if (imageFiles.length > 0) this._handleFiles(imageFiles);
        }
      }
    });

    // Also handle drag-drop on the entire page for .cube files
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.toLowerCase().endsWith('.cube')) {
        this._importLUT(file);
      }
    });

    // Clipboard paste
    document.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          imageFiles.push(item.getAsFile());
        }
      }
      if (imageFiles.length > 0) this._handleFiles(imageFiles);
    });

    // Slider changes
    this.sliderRows.forEach(row => {
      const param = row.dataset.param;
      const input = row.querySelector('input[type="range"]');
      const valueDisplay = row.querySelector('.value');

      input.addEventListener('input', () => {
        const val = parseInt(input.value);
        this.params[param] = val;
        valueDisplay.textContent = val;
        this._updateSliderFill(input);
        this._clearActivePreset();
        this._scheduleProcess();
      });

      // Double-click label to reset
      row.querySelector('label').addEventListener('dblclick', () => {
        const defaultVal = DEFAULT_PARAMS[param] ?? 0;
        input.value = defaultVal;
        this.params[param] = defaultVal;
        valueDisplay.textContent = defaultVal;
        this._updateSliderFill(input);
        this._scheduleProcess();
      });
    });

    // Presets click
    this.presetGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.preset-btn');
      if (!btn) return;
      if (btn.dataset.preset) {
        this._applyPreset(btn.dataset.preset);
      } else if (btn.dataset.userPreset) {
        this._applyUserPreset(btn.dataset.userPreset);
      }
    });

    // Preset Management actions
    this.btnSavePreset.addEventListener('click', () => this._savePreset());
    this.btnExportPreset.addEventListener('click', () => this._exportPreset());
    this.btnImportPreset.addEventListener('click', () => this.presetFileInput.click());
    this.presetFileInput.addEventListener('change', (e) => this._importPresetFile(e.target.files[0]));

    // HSL Mixer interactions
    this.hslBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hslBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeHslColor = btn.dataset.color;
        this._updateHslSliders();
      });
    });

    this.hslSliders.forEach(row => {
      const hslProp = row.dataset.hsl; // h, s, or l
      const input = row.querySelector('input[type="range"]');
      const valueDisplay = row.querySelector('.value');

      input.addEventListener('input', () => {
        const val = parseInt(input.value);
        const paramKey = `hsl_${this.activeHslColor}_${hslProp}`;
        this.params[paramKey] = val;
        valueDisplay.textContent = val;
        this._updateSliderFill(input);
        this._clearActivePreset();
        this._scheduleProcess();
      });

      row.querySelector('label').addEventListener('dblclick', () => {
        const paramKey = `hsl_${this.activeHslColor}_${hslProp}`;
        input.value = 0;
        this.params[paramKey] = 0;
        valueDisplay.textContent = 0;
        this._updateSliderFill(input);
        this._scheduleProcess();
      });
    });

    // Section toggles
    document.querySelectorAll('.section-header[data-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        header.closest('.panel-section').classList.toggle('collapsed');
      });
    });

    // Format buttons
    this.formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedFormat = btn.dataset.format;
      });
    });

    // Aspect ratio lock
    this.resizeLock.addEventListener('click', () => {
      this.aspectLocked = !this.aspectLocked;
      this.resizeLock.classList.toggle('unlocked', !this.aspectLocked);
      this.resizeLock.textContent = this.aspectLocked ? '🔗' : '🔓';
    });

    // Resize inputs with aspect ratio
    this.resizeW.addEventListener('input', () => {
      if (this.aspectLocked && this.imageData) {
        const ratio = this.imageData.fullHeight / this.imageData.fullWidth;
        this.resizeH.value = Math.round(parseInt(this.resizeW.value) * ratio) || '';
      }
    });
    this.resizeH.addEventListener('input', () => {
      if (this.aspectLocked && this.imageData) {
        const ratio = this.imageData.fullWidth / this.imageData.fullHeight;
        this.resizeW.value = Math.round(parseInt(this.resizeH.value) * ratio) || '';
      }
    });

    // Before/After
    const btnBefore = document.getElementById('btnBefore');
    btnBefore.addEventListener('mousedown', () => this._showOriginal(true));
    btnBefore.addEventListener('mouseup', () => this._showOriginal(false));
    btnBefore.addEventListener('mouseleave', () => this._showOriginal(false));

    // Keyboard: Space for before/after
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && this.imageData) {
        e.preventDefault();
        this._showOriginal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyO') {
        e.preventDefault();
        this.fileInput.click();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this._showOriginal(false);
      }
    });

    // Reset
    document.getElementById('btnReset').addEventListener('click', () => this._resetAll());

    // Fit
    document.getElementById('btnZoomFit').addEventListener('click', () => this._fitToScreen());

    // Export
    this.btnExport.addEventListener('click', () => this._exportImage());

    // LUT import
    document.getElementById('btnImportLut').addEventListener('click', () => {
      this.lutFileInput.click();
    });
    this.lutFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this._importLUT(file);
      e.target.value = ''; // Reset so same file can be re-imported
    });

    // LUT list clicks (activate / delete)
    this.lutList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.lut-item-delete');
      if (deleteBtn) {
        const id = deleteBtn.closest('.lut-item').dataset.lutId;
        this._deleteLUT(id);
        return;
      }
      const item = e.target.closest('.lut-item');
      if (item) {
        this._toggleLUT(item.dataset.lutId);
      }
    });

    // LUT intensity slider
    this.lutIntensityInput.addEventListener('input', () => {
      this.lutIntensity = parseInt(this.lutIntensityInput.value);
      this.lutIntensityDisplay.textContent = this.lutIntensity;
      this._updateSliderFill(this.lutIntensityInput);
      this._scheduleProcess();
    });
  }

  // ── Handle loaded files ──
  async _handleFiles(files) {
    if (!files || files.length === 0) return;
    this._showProcessing(true);

    try {
      if (this.clearOnNextFiles) {
        this.photos = [];
        this.thumbnailList.innerHTML = '';
        this.activePhotoId = null;
        this.clearOnNextFiles = false;
      }

      let firstNewId = null;
      let loadedCount = 0;

      for (const file of files) {
        try {
          const id = 'photo_' + (++this.photoIdCounter);
          const objectUrl = URL.createObjectURL(file);
          
          // Parse imageData
          const imgData = await this.processor.loadImage(file);
          
          const photo = {
            id,
            file,
            objectUrl,
            imageData: imgData,
            params: { ...DEFAULT_PARAMS },
            activePreset: null,
            activeLutId: null,
            lutIntensity: 100
          };
          this.photos.push(photo);
          if (!firstNewId) firstNewId = id;
          loadedCount++;
        } catch (err) {
          console.error('Skipping file due to error:', file.name, err);
        }
      }

      if (loadedCount === 0) {
        alert('No valid images were loaded.');
        this._showProcessing(false);
        return;
      }

      this.thumbnailSidebar.style.display = 'flex';
      this.dropZone.classList.add('hidden');
      this.canvas.style.display = 'block';

      this._renderThumbnails();
      
      if (firstNewId && !this.activePhotoId) {
        this._selectPhoto(firstNewId);
      } else if (firstNewId) {
        this._selectPhoto(firstNewId);
      }
    } catch (err) {
      console.error('Failed to load images:', err);
      alert('Failed to load some images.');
    }

    this._showProcessing(false);
  }

  _renderThumbnails() {
    this.thumbnailList.innerHTML = '';
    this.photos.forEach(photo => {
      const item = document.createElement('div');
      item.className = 'thumbnail-item' + (photo.id === this.activePhotoId ? ' active' : '');
      item.onclick = () => this._selectPhoto(photo.id);

      const img = document.createElement('img');
      img.src = photo.objectUrl;
      item.appendChild(img);

      const btnRemove = document.createElement('button');
      btnRemove.className = 'btn-remove';
      btnRemove.innerHTML = '×';
      btnRemove.title = 'Remove';
      btnRemove.onclick = (e) => {
        e.stopPropagation();
        this._removePhoto(photo.id);
      };
      item.appendChild(btnRemove);

      this.thumbnailList.appendChild(item);
    });
  }

  _selectPhoto(id) {
    const photo = this.photos.find(x => x.id === id);
    if (!photo) return;

    this.activePhotoId = id;
    // We intentionally do not override params, activePreset, etc.
    // so that the style applies globally to all photos.
    this.imageData = photo.imageData;

    this._renderThumbnails();
    this._updateAllUI();
    
    // Set canvas size
    this.canvas.width = this.imageData.previewWidth;
    this.canvas.height = this.imageData.previewHeight;

    // Update info
    const sizeKB = (photo.file.size / 1024).toFixed(0);
    const sizeMB = (photo.file.size / 1024 / 1024).toFixed(1);
    const sizeStr = photo.file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
    this.fileInfo.textContent = `${photo.file.name} — ${this.imageData.fullWidth}×${this.imageData.fullHeight} — ${sizeStr}`;
    this.previewInfo.style.display = 'block';
    this.previewInfo.textContent = `${this.imageData.fullWidth} × ${this.imageData.fullHeight}`;
    
    this.resizeW.placeholder = this.imageData.fullWidth;
    this.resizeH.placeholder = this.imageData.fullHeight;
    this.btnExport.disabled = false;

    this._processPreview();
  }

  _removePhoto(id) {
    this.photos = this.photos.filter(p => p.id !== id);
    if (this.photos.length === 0) {
      this.activePhotoId = null;
      this.imageData = null;
      this.thumbnailSidebar.style.display = 'none';
      this.dropZone.classList.remove('hidden');
      this.canvas.style.display = 'none';
      this.previewInfo.style.display = 'none';
      this.fileInfo.textContent = 'No image loaded';
      this.btnExport.disabled = true;
    } else if (this.activePhotoId === id) {
      this._selectPhoto(this.photos[0].id);
    } else {
      this._renderThumbnails();
    }
  }

  _updateAllUI() {
    this._updateAllSliderFills();
    // Update LUT intensity slider UI
    this.lutIntensityInput.value = this.lutIntensity;
    this.lutIntensityDisplay.textContent = this.lutIntensity;
    this._updateSliderFill(this.lutIntensityInput);
    
    // Update preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === this.activePreset);
    });

    // Update LUT list
    document.querySelectorAll('.lut-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === this.activeLutId);
    });
  }

  // ── Process and display preview ──
  _processPreview() {
    if (!this.imageData) return;

    const activeLut = this._getActiveLut();
    const processed = this.processor.process(
      this.imageData.previewData, this.params, activeLut, this.lutIntensity
    );
    this.ctx.putImageData(processed, 0, 0);
  }

  // ── Debounced processing ──
  _scheduleProcess() {
    clearTimeout(this.processTimer);
    this.processTimer = setTimeout(() => this._processPreview(), 30);
  }

  // ── Apply preset ──
  _applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    // Reset all to defaults first
    this.params = { ...DEFAULT_PARAMS };

    // Apply preset values
    Object.entries(preset.values).forEach(([key, val]) => {
      this.params[key] = val;
    });

    // Update all sliders
    this._syncSlidersToParams();

    // Highlight active preset
    this.presetGrid.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });
    this.activePreset = presetKey;

    this._scheduleProcess();
  }

  _applyUserPreset(id) {
    const preset = this.userPresets.find(p => p.id === id);
    if (!preset) return;

    this.params = { ...DEFAULT_PARAMS };
    Object.entries(preset.values).forEach(([key, val]) => {
      this.params[key] = val;
    });

    if (preset.activeLutId !== undefined) {
      this.activeLutId = preset.activeLutId;
      this.lutIntensity = preset.lutIntensity || 100;
      this._updateLutUI();
    }

    this._syncSlidersToParams();
    this.presetGrid.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.userPreset === id);
    });
    this.activePreset = id;
    this._scheduleProcess();
  }

  // ── Preset Management ──
  _savePreset() {
    const name = prompt("Enter a name for your preset:", "My Preset");
    if (!name) return;

    const newPreset = {
      id: "usr_" + Date.now(),
      name: name,
      values: { ...this.params },
      activeLutId: this.activeLutId,
      lutIntensity: this.lutIntensity
    };

    this.userPresets.push(newPreset);
    localStorage.setItem('phototune_user_presets', JSON.stringify(this.userPresets));
    this._buildPresets();
  }

  _exportPreset() {
    const presetData = {
      name: "PhotoTune Preset",
      values: { ...this.params },
      activeLutId: this.activeLutId,
      lutIntensity: this.lutIntensity
    };
    const blob = new Blob([JSON.stringify(presetData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phototune_preset_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _importPresetFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data && data.values) {
          const name = prompt("Name for imported preset:", data.name || "Imported Preset");
          if (!name) return;
          const newPreset = {
            id: "usr_" + Date.now(),
            name: name,
            values: data.values,
            activeLutId: data.activeLutId || null,
            lutIntensity: data.lutIntensity || 100
          };
          this.userPresets.push(newPreset);
          localStorage.setItem('phototune_user_presets', JSON.stringify(this.userPresets));
          this._buildPresets();
        }
      } catch (err) {
        alert("Invalid preset file!");
      }
    };
    reader.readAsText(file);
    this.presetFileInput.value = ''; // Reset
  }

  // ── Reset all parameters ──
  _resetAll() {
    this.params = { ...DEFAULT_PARAMS };
    this._syncSlidersToParams();
    this.activeLutId = null;
    this.lutIntensity = 100;
    this._updateLutUI();
    this._clearActivePreset();
    this._scheduleProcess();
  }

  // ── Sync UI sliders to current params ──
  _syncSlidersToParams() {
    this.sliderRows.forEach(row => {
      const param = row.dataset.param;
      const input = row.querySelector('input[type="range"]');
      const display = row.querySelector('.value');
      const val = this.params[param] ?? 0;
      input.value = val;
      display.textContent = val;
      this._updateSliderFill(input);
    });
    this._updateHslSliders();
  }

  _updateHslSliders() {
    this.hslSliders.forEach(row => {
      const hslProp = row.dataset.hsl;
      const paramKey = `hsl_${this.activeHslColor}_${hslProp}`;
      const input = row.querySelector('input[type="range"]');
      const display = row.querySelector('.value');
      const val = this.params[paramKey] ?? 0;
      input.value = val;
      display.textContent = val;
      this._updateSliderFill(input);
    });
  }

  // ── Clear active preset highlight ──
  _clearActivePreset() {
    this.activePreset = null;
    this.presetGrid.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  // ── Show original (before/after) ──
  _showOriginal(show) {
    if (!this.imageData) return;
    this.isShowingOriginal = show;

    if (show) {
      this.ctx.putImageData(this.imageData.previewData, 0, 0);
    } else {
      this._processPreview();
    }
  }

  // ── Fit canvas to preview area ──
  _fitToScreen() {
    // Canvas already fits via CSS max-width/max-height
    // This button is mainly for future zoom support
  }

  // ── Export image ──
  async _exportImage() {
    if (!this.imageData) return;
    this._showProcessing(true);

    // Use setTimeout to allow UI to update before heavy processing
    await new Promise(r => setTimeout(r, 50));

    try {
      const quality = parseInt(
        document.querySelector('[data-param="exportQuality"] input').value
      );
      const ext = this.selectedFormat === 'jpeg' ? 'jpg' : this.selectedFormat;

      if (this.photos.length > 1 && typeof JSZip !== 'undefined') {
        // Export ALL as ZIP
        const zip = new JSZip();
        for (let i = 0; i < this.photos.length; i++) {
          const photo = this.photos[i];
          // For batch export, use original dimensions to prevent aspect ratio distortion
          const rw = photo.imageData.fullWidth;
          const rh = photo.imageData.fullHeight;
          const dataUrl = this.processor.exportImage(
            photo.imageData.originalData,
            this.params, // Global params
            this.selectedFormat,
            quality,
            rw, rh,
            this._getActiveLut(),
            this.lutIntensity
          );
          
          const base64Data = dataUrl.split(',')[1];
          const originalName = photo.file.name.replace(/\.[^/.]+$/, "");
          zip.file(`${originalName}_phototune.${ext}`, base64Data, {base64: true});
        }
        
        const zipBlob = await zip.generateAsync({type: "blob"});
        const link = document.createElement('a');
        link.download = `PhotoTune_Export_${Date.now()}.zip`;
        link.href = URL.createObjectURL(zipBlob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

      } else {
        // Export Single Image
        const rw = parseInt(this.resizeW.value) || this.imageData.fullWidth;
        const rh = parseInt(this.resizeH.value) || this.imageData.fullHeight;

        const dataUrl = this.processor.exportImage(
          this.imageData.originalData,
          this.params,
          this.selectedFormat,
          quality,
          rw, rh,
          this._getActiveLut(),
          this.lutIntensity
        );

        // Trigger download
        const link = document.createElement('a');
        link.download = `phototune-export.${ext}`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. The image may be too large for browser processing.');
    }

    this._showProcessing(false);
  }

  // ── Update slider fill gradient ──
  _updateSliderFill(input) {
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const val = parseFloat(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.classList.add('has-fill');
    input.style.setProperty('--fill', `${pct}%`);
  }

  _updateAllSliderFills() {
    this.sliderRows.forEach(row => {
      this._updateSliderFill(row.querySelector('input[type="range"]'));
    });
  }

  // ── Processing overlay ──
  _showProcessing(show) {
    this.overlay.classList.toggle('visible', show);
  }

  // ══════════════════════════════════════
  // LUT Management
  // ══════════════════════════════════════

  // ── Initialize IndexedDB + load built-in LUTs ──
  async _initLutDB() {
    // Register built-in LUTs (lazy-loaded)
    this.builtinLuts = BUILTIN_LUTS.map(entry => ({
      id: `builtin_${entry.file}`,
      title: entry.name,
      category: entry.category,
      file: entry.file,
      lut: null,     // loaded on first use
      loaded: false,
      builtin: true
    }));

    // Init IndexedDB for user-imported LUTs
    return new Promise((resolve) => {
      const request = indexedDB.open('PhotoTuneLUTs', 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('luts')) {
          db.createObjectStore('luts', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        this._loadSavedLUTs();
        resolve();
      };

      request.onerror = () => {
        console.warn('IndexedDB not available, user LUTs won\'t persist.');
        this._renderLutList();
        resolve();
      };
    });
  }

  // ── Load user LUTs from IndexedDB ──
  async _loadSavedLUTs() {
    if (!this.db) { this._renderLutList(); return; }

    const tx = this.db.transaction('luts', 'readonly');
    const store = tx.objectStore('luts');
    const request = store.getAll();

    request.onsuccess = (e) => {
      const records = e.target.result || [];
      this.userLuts = records.map(record => ({
        id: record.id,
        title: record.title,
        size: record.size,
        lut: deserializeLUT(record.lutData),
        builtin: false
      }));
      this._renderLutList();
    };
  }

  // ── Save user LUT to IndexedDB ──
  async _saveLutToDB(id, title, size, lut) {
    if (!this.db) return;
    const tx = this.db.transaction('luts', 'readwrite');
    tx.objectStore('luts').put({ id, title, size, lutData: serializeLUT(lut) });
  }

  // ── Remove user LUT from IndexedDB ──
  async _removeLutFromDB(id) {
    if (!this.db) return;
    const tx = this.db.transaction('luts', 'readwrite');
    tx.objectStore('luts').delete(id);
  }

  // ── Import a .cube file (user) ──
  async _importLUT(file) {
    try {
      const text = await file.text();
      const lut = parseCubeLUT(text);

      const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const title = lut.title !== 'Untitled LUT'
        ? lut.title
        : file.name.replace(/\.cube$/i, '');

      const entry = { id, title, size: lut.size, lut, builtin: false };
      this.userLuts.push(entry);

      this._saveLutToDB(id, title, lut.size, lut);
      this._activateLUT(id);
      this._renderLutList();

    } catch (err) {
      console.error('LUT import failed:', err);
      alert(`Failed to import LUT: ${err.message}`);
    }
  }

  // ── Lazy-load a built-in LUT file ──
  async _loadBuiltinLut(entry) {
    if (entry.loaded) return entry.lut;

    try {
      const url = `luts/${encodeURIComponent(entry.file)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const lut = parseCubeLUT(text);
      entry.lut = lut;
      entry.loaded = true;
      return lut;
    } catch (err) {
      console.error(`Failed to load built-in LUT "${entry.title}":`, err);
      alert(`Failed to load LUT "${entry.title}". File may be missing.`);
      return null;
    }
  }

  // ── Render LUT list in sidebar ──
  _renderLutList() {
    // Clear existing content
    this.lutList.querySelectorAll('.lut-item, .lut-category-tabs, .lut-section-label').forEach(el => el.remove());

    // ── Category filter tabs for built-in ──
    const tabs = document.createElement('div');
    tabs.className = 'lut-category-tabs';
    Object.entries(LUT_CATEGORIES).forEach(([key, cat]) => {
      const tab = document.createElement('button');
      tab.className = `lut-cat-tab${this.lutCategory === key ? ' active' : ''}`;
      tab.dataset.category = key;
      tab.textContent = cat.label;
      tab.style.setProperty('--cat-color', cat.color);
      tab.addEventListener('click', () => {
        this.lutCategory = key;
        this._renderLutList();
      });
      tabs.appendChild(tab);
    });
    this.lutList.prepend(tabs);

    // ── Built-in LUTs (filtered) ──
    const filtered = this.lutCategory === 'all'
      ? this.builtinLuts
      : this.builtinLuts.filter(l => l.category === this.lutCategory);

    if (filtered.length > 0) {
      const label = document.createElement('div');
      label.className = 'lut-section-label';
      label.textContent = `Built-in (${filtered.length})`;
      this.lutList.appendChild(label);

      filtered.forEach(entry => {
        this.lutList.appendChild(this._createLutItem(entry));
      });
    }

    // ── User-imported LUTs ──
    if (this.userLuts.length > 0) {
      const label = document.createElement('div');
      label.className = 'lut-section-label';
      label.textContent = `Imported (${this.userLuts.length})`;
      this.lutList.appendChild(label);

      this.userLuts.forEach(entry => {
        this.lutList.appendChild(this._createLutItem(entry));
      });
    }

    // Hide empty message when we have LUTs
    this.lutEmpty.style.display = (filtered.length === 0 && this.userLuts.length === 0) ? '' : 'none';

    // Show/hide intensity slider
    this.lutIntensityRow.style.display = this.activeLutId ? '' : 'none';
    this._updateSliderFill(this.lutIntensityInput);
  }

  // ── Create a single LUT item element ──
  _createLutItem(entry) {
    const item = document.createElement('div');
    item.className = `lut-item${entry.id === this.activeLutId ? ' active' : ''}${entry.builtin ? ' builtin' : ''}`;
    item.dataset.lutId = entry.id;

    const catInfo = entry.category ? LUT_CATEGORIES[entry.category] : null;
    const catDot = catInfo ? `<span class="lut-cat-dot" style="background:${catInfo.color}"></span>` : '';

    item.innerHTML = `
      ${catDot}
      <span class="lut-item-name" title="${entry.title}">${entry.title}</span>
      ${!entry.builtin ? '<button class="lut-item-delete" title="Remove LUT">×</button>' : ''}
    `;

    return item;
  }

  // ── Toggle LUT on/off ──
  _toggleLUT(id) {
    if (this.activeLutId === id) {
      this._deactivateLUT();
    } else {
      this._activateLUT(id);
    }
  }

  // ── Activate a LUT (with lazy loading for built-ins) ──
  async _activateLUT(id) {
    // Check if it's a built-in that needs loading
    const builtin = this.builtinLuts.find(l => l.id === id);
    if (builtin && !builtin.loaded) {
      this._showProcessing(true);
      const lut = await this._loadBuiltinLut(builtin);
      this._showProcessing(false);
      if (!lut) return; // Failed to load
    }

    this.activeLutId = id;
    this._renderLutList();
    this._scheduleProcess();
  }

  // ── Deactivate current LUT ──
  _deactivateLUT() {
    this.activeLutId = null;
    this._renderLutList();
    this._scheduleProcess();
  }

  // ── Delete a user LUT ──
  _deleteLUT(id) {
    this.userLuts = this.userLuts.filter(l => l.id !== id);
    this._removeLutFromDB(id);

    if (this.activeLutId === id) {
      this.activeLutId = null;
    }

    this._renderLutList();
    this._scheduleProcess();
  }

  // ── Get active LUT object (or null) ──
  _getActiveLut() {
    if (!this.activeLutId) return null;

    // Check built-in first
    const builtin = this.builtinLuts.find(l => l.id === this.activeLutId);
    if (builtin) return builtin.lut;

    // Check user LUTs
    const user = this.userLuts.find(l => l.id === this.activeLutId);
    return user ? user.lut : null;
  }
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PhotoTuneApp();
});
