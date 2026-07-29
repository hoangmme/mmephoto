export class TemplatePicker {
  constructor(container, templates, onComplete) {
    this.container = container;
    this.templates = templates;
    this.onComplete = onComplete;
    this.paperSize = 'A4';
    this.selectedTemplates = [];
    
    this.render();
  }

  setPaperSize(size) {
    this.paperSize = size;
    this.selectedTemplates = [];
    this.render();
  }

  toggleTemplate(id) {
    if (this.paperSize === 'A4') {
      // A4: chỉ chọn 1 frame
      this.selectedTemplates = [id];
    } else {
      // A5: chọn tối đa 2 frame (dùng FIFO nếu đã chọn 2 khung)
      const idx = this.selectedTemplates.indexOf(id);
      if (idx > -1) {
        this.selectedTemplates.splice(idx, 1);
      } else {
        if (this.selectedTemplates.length >= 2) {
          this.selectedTemplates.shift();
        }
        this.selectedTemplates.push(id);
      }
    }
    this.render();
  }

  _confirmSelection() {
    if (!this.onComplete) return true;
    const requiredCount = this.paperSize === 'A4' ? 1 : 2;
    if (this.selectedTemplates.length === requiredCount) {
      try { 
        this.onComplete(this.paperSize, this.selectedTemplates); 
        return true;
      }
      catch(e) { console.error('TemplatePicker onComplete error:', e); }
    } else if (this.paperSize === 'A5' && this.selectedTemplates.length === 1) {
      // Auto-duplicate frame if only 1 chosen for A5
      this.selectedTemplates.push(this.selectedTemplates[0]);
      try { 
        this.onComplete(this.paperSize, this.selectedTemplates); 
        return true;
      }
      catch(e) { console.error('TemplatePicker onComplete error:', e); }
    }
    return false;
  }

  render() {
    this.container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'pl-template-picker';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';
    wrapper.style.padding = '16px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.alignItems = 'center';

    // Tabs
    const tabs = document.createElement('div');
    tabs.style.display = 'flex';
    tabs.style.gap = '15px';
    tabs.style.marginBottom = '16px';
    tabs.style.flexShrink = '0';

    ['A4', 'A5'].forEach(size => {
      const btn = document.createElement('button');
      btn.innerText = `Khổ ${size}` + (size === 'A4' ? ' (1 frame)' : ' (2 frame)');
      btn.style.padding = '10px 30px';
      btn.style.borderRadius = '30px';
      btn.style.fontWeight = 'bold';
      btn.style.fontSize = '14px';
      btn.style.cursor = 'pointer';
      btn.style.border = '2px solid var(--pl-accent)';
      
      if (this.paperSize === size) {
        btn.style.background = 'var(--pl-accent)';
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'var(--pl-bg-section)';
        btn.style.color = 'var(--pl-text)';
      }
      
      btn.onclick = () => this.setPaperSize(size);
      tabs.appendChild(btn);
    });
    wrapper.appendChild(tabs);

    // Grid (scrollable)
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    grid.style.gap = '14px';
    grid.style.width = '100%';
    grid.style.maxWidth = '700px';
    grid.style.flex = '1';
    grid.style.overflowY = 'auto';
    grid.style.paddingBottom = '8px';

    const filteredKeys = Object.keys(this.templates);

    filteredKeys.forEach(k => {
      const t = this.templates[k];
      const item = document.createElement('div');
      const isSelected = this.selectedTemplates.includes(k);
      const selIndex = this.selectedTemplates.indexOf(k);

      item.style.border = isSelected ? '3px solid var(--pl-accent)' : '2px solid var(--pl-border)';
      item.style.borderRadius = '12px';
      item.style.padding = '8px';
      item.style.cursor = 'pointer';
      item.style.background = isSelected ? 'var(--pl-bg)' : 'var(--pl-bg-section)';
      item.style.textAlign = 'center';
      item.style.position = 'relative';
      item.style.transition = 'transform 0.15s, box-shadow 0.15s';
      if (isSelected) {
        item.style.boxShadow = '0 4px 12px rgba(79, 50, 25, 0.2)';
        item.style.transform = 'scale(1.02)';
      }

      // Thumbnail - clean aspect ratio matching template canvas
      const thumb = document.createElement('div');
      thumb.style.width = '100%';
      thumb.style.aspectRatio = (t.canvas_width && t.canvas_height) ? `${t.canvas_width} / ${t.canvas_height}` : '1748 / 2480';
      thumb.style.background = '#e5e7eb';
      thumb.style.borderRadius = '8px';
      thumb.style.marginBottom = '8px';
      thumb.style.position = 'relative';
      thumb.style.overflow = 'hidden';

      // Slot count badge
      const slotCount = document.createElement('div');
      slotCount.innerText = `${t.slots ? t.slots.length : 0} ảnh`;
      slotCount.style.position = 'absolute';
      slotCount.style.bottom = '4px';
      slotCount.style.left = '4px';
      slotCount.style.background = 'rgba(0,0,0,0.6)';
      slotCount.style.color = '#fff';
      slotCount.style.fontSize = '10px';
      slotCount.style.padding = '2px 6px';
      slotCount.style.borderRadius = '10px';
      slotCount.style.zIndex = '5';
      thumb.appendChild(slotCount);
      
      // Render slots with sample images
      if (t.slots && t.slots.length > 0) {
        const cW = t.canvas_width || 1748;
        const cH = t.canvas_height || 2480;
        t.slots.forEach(s => {
          const slotX = (s.cx !== undefined) ? (s.cx - s.w / 2) : (s.x || 0);
          const slotY = (s.cy !== undefined) ? (s.cy - s.h / 2) : (s.y || 0);
          const slotW = s.w || 0;
          const slotH = s.h || 0;

          const slotDiv = document.createElement('div');
          slotDiv.style.position = 'absolute';
          slotDiv.style.left = `${(slotX / cW) * 100}%`;
          slotDiv.style.top = `${(slotY / cH) * 100}%`;
          slotDiv.style.width = `${(slotW / cW) * 100}%`;
          slotDiv.style.height = `${(slotH / cH) * 100}%`;
          slotDiv.style.overflow = 'hidden';
          
          const sampleImg = document.createElement('img');
          sampleImg.src = 'https://images.unsplash.com/photo-1541823709867-1b206113eafd?q=80&w=987&auto=format&fit=crop';
          sampleImg.style.width = '100%';
          sampleImg.style.height = '100%';
          sampleImg.style.objectFit = 'cover';
          
          slotDiv.appendChild(sampleImg);
          thumb.appendChild(slotDiv);
        });
      }

      if (t.frame_url) {
        const img = document.createElement('img');
        img.src = t.frame_url;
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.zIndex = '2';
        thumb.appendChild(img);
      }

      // Selection badge - neatly inside top right corner of thumb
      if (isSelected) {
        const badge = document.createElement('div');
        badge.innerText = this.paperSize === 'A5' ? (selIndex + 1) : '✓';
        badge.style.position = 'absolute';
        badge.style.top = '4px';
        badge.style.right = '4px';
        badge.style.background = 'var(--pl-accent, #4f3219)';
        badge.style.color = '#fff';
        badge.style.width = '20px';
        badge.style.height = '20px';
        badge.style.borderRadius = '50%';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontWeight = 'bold';
        badge.style.fontSize = '12px';
        badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        badge.style.zIndex = '10';
        thumb.appendChild(badge);
      }
      
      item.appendChild(thumb);

      const name = document.createElement('div');
      name.innerText = t.name;
      name.style.fontSize = '13px';
      name.style.fontWeight = 'bold';
      item.appendChild(name);

      item.onclick = () => this.toggleTemplate(k);
      grid.appendChild(item);
    });

    wrapper.appendChild(grid);
    this.container.appendChild(wrapper);
  }
}
