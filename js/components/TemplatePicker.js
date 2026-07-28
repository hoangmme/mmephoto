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
      this.selectedTemplates = [id];
      if (this.onComplete) this.onComplete(this.paperSize, this.selectedTemplates);
    } else {
      const idx = this.selectedTemplates.indexOf(id);
      if (idx > -1) {
        this.selectedTemplates.splice(idx, 1);
      } else {
        if (this.selectedTemplates.length < 2) {
          this.selectedTemplates.push(id);
        } else {
          this.selectedTemplates[1] = id;
        }
      }
      this.render();
    }
  }

  render() {
    this.container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'pl-template-picker';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';
    wrapper.style.padding = '20px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.alignItems = 'center';

    // Tabs
    const tabs = document.createElement('div');
    tabs.style.display = 'flex';
    tabs.style.gap = '15px';
    tabs.style.marginBottom = '25px';

    ['A4', 'A5'].forEach(size => {
      const btn = document.createElement('button');
      btn.innerText = `Khổ ${size}`;
      btn.style.padding = '12px 40px';
      btn.style.borderRadius = '30px';
      btn.style.fontWeight = 'bold';
      btn.style.fontSize = '16px';
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

    // Grid
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
    grid.style.gap = '20px';
    grid.style.width = '100%';
    grid.style.maxWidth = '800px';

    const filteredKeys = Object.keys(this.templates);

    filteredKeys.forEach(k => {
      const t = this.templates[k];
      const item = document.createElement('div');
      const isSelected = this.selectedTemplates.includes(k);
      const selIndex = this.selectedTemplates.indexOf(k);

      item.style.border = isSelected ? '3px solid var(--pl-accent)' : '2px solid var(--pl-border)';
      item.style.borderRadius = '16px';
      item.style.padding = '12px';
      item.style.cursor = 'pointer';
      item.style.background = isSelected ? 'var(--pl-bg)' : 'var(--pl-bg-section)';
      item.style.textAlign = 'center';
      item.style.position = 'relative';

      // Thumbnail
      const thumb = document.createElement('div');
      thumb.style.width = '100%';
      thumb.style.aspectRatio = '2/3';
      thumb.style.background = '#e5e7eb';
      thumb.style.borderRadius = '8px';
      thumb.style.marginBottom = '12px';
      thumb.style.position = 'relative';
      thumb.style.overflow = 'hidden';
      
      // Default sample image behind the frame
      const sampleImg = document.createElement('img');
      sampleImg.src = 'https://images.unsplash.com/photo-1541823709867-1b206113eafd?q=80&w=987&auto=format&fit=crop';
      sampleImg.style.position = 'absolute';
      sampleImg.style.top = '0';
      sampleImg.style.left = '0';
      sampleImg.style.width = '100%';
      sampleImg.style.height = '100%';
      sampleImg.style.objectFit = 'cover';
      thumb.appendChild(sampleImg);

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
      item.appendChild(thumb);

      // Badge
      if (isSelected && this.paperSize === 'A5') {
        const badge = document.createElement('div');
        badge.innerText = selIndex + 1;
        badge.style.position = 'absolute';
        badge.style.top = '-10px';
        badge.style.right = '-10px';
        badge.style.background = 'var(--pl-accent)';
        badge.style.color = '#fff';
        badge.style.width = '30px';
        badge.style.height = '30px';
        badge.style.borderRadius = '50%';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontWeight = 'bold';
        badge.style.fontSize = '16px';
        badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        item.appendChild(badge);
      }

      const name = document.createElement('div');
      name.innerText = t.name;
      name.style.fontSize = '14px';
      name.style.fontWeight = 'bold';
      item.appendChild(name);

      item.onclick = () => this.toggleTemplate(k);
      grid.appendChild(item);
    });

    wrapper.appendChild(grid);

    // Confirm button for A5
    if (this.paperSize === 'A5') {
      const btnConfirm = document.createElement('button');
      btnConfirm.innerText = `Xác nhận (${this.selectedTemplates.length}/2)`;
      btnConfirm.style.marginTop = '30px';
      btnConfirm.style.padding = '14px 40px';
      btnConfirm.style.borderRadius = '8px';
      btnConfirm.style.fontSize = '16px';
      btnConfirm.style.fontWeight = 'bold';
      btnConfirm.style.border = 'none';
      btnConfirm.style.background = this.selectedTemplates.length === 2 ? 'var(--pl-accent)' : '#ccc';
      btnConfirm.style.color = '#fff';
      btnConfirm.style.cursor = this.selectedTemplates.length === 2 ? 'pointer' : 'not-allowed';
      
      btnConfirm.onclick = () => {
        if (this.selectedTemplates.length === 2 && this.onComplete) {
          this.onComplete(this.paperSize, this.selectedTemplates);
        }
      };
      
      wrapper.appendChild(btnConfirm);
    }

    this.container.appendChild(wrapper);
  }
}
