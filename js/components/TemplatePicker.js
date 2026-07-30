export class TemplatePicker {
  constructor(templates) {
    this.templates = templates;
  }

  showModal(allowedType, onSelect) {
    const modal = document.getElementById('templateModal');
    const grid = document.getElementById('modalTemplateGrid');
    const btnClose = document.getElementById('btnCloseModal');
    if (!modal || !grid) return;

    const tmpls = (this.templates && Object.keys(this.templates).length > 0) 
      ? this.templates 
      : (typeof window !== 'undefined' ? window.ALL_TEMPLATES : {}) || {};

    grid.innerHTML = '';
    Object.keys(tmpls).forEach(key => {
      const tmpl = tmpls[key];
      if (allowedType && tmpl.tags && !tmpl.tags.includes(allowedType)) {
        return;
      }
      
      const card = document.createElement('div');
      card.className = 'pl-template-card';
      
      const img = document.createElement('img');
      img.src = tmpl.frame_url || 'templates/default.png';
      
      const title = document.createElement('div');
      title.className = 'pl-template-name';
      title.innerText = tmpl.name;
      
      card.appendChild(img);
      card.appendChild(title);
      
      card.onclick = (e) => {
        e.stopPropagation();
        modal.style.display = 'none';
        if (onSelect) onSelect(key, tmpl);
      };
      
      grid.appendChild(card);
    });

    modal.style.display = 'flex';

    if (btnClose) {
      btnClose.onclick = (e) => {
        e.stopPropagation();
        modal.style.display = 'none';
      };
    }

    modal.onclick = (e) => {
      if (e.target === modal || e.target.classList.contains('pl-modal-close')) {
        modal.style.display = 'none';
      }
    };
  }
}
