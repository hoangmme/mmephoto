export class TemplatePicker {
  constructor(templates) {
    this.templates = templates;
  }

  showModal(allowedType, onSelect, excludeKey = null) {
    const modal = document.getElementById('templateModal');
    const grid = document.getElementById('modalTemplateGrid');
    const btnClose = document.getElementById('btnCloseModal');
    if (!modal || !grid) return;

    const closeModal = () => {
      modal.style.display = 'none';
      modal.classList.remove('active');
    };

    const tmpls = (this.templates && Object.keys(this.templates).length > 0) 
      ? this.templates 
      : (typeof window !== 'undefined' ? window.ALL_TEMPLATES : {}) || {};

    grid.innerHTML = '';
    Object.keys(tmpls).forEach(key => {
      const tmpl = tmpls[key];
      
      if (excludeKey && key === excludeKey) return;
      // Strict Tag & Type Filtering
      if (allowedType) {
        const isA4 = (tmpl.tags && tmpl.tags.includes('a4')) || (key.startsWith('a4') && key !== 'template-4');
        const isA5 = (tmpl.tags && tmpl.tags.includes('a5')) || key.startsWith('a5') || key.startsWith('template-');
        
        if (allowedType === 'a4' && !isA4) return;
        if (allowedType === 'a5' && !isA5) return;
      }

      // Branch Filtering
      const appState = typeof window !== 'undefined' && window.printApp ? window.printApp : null;
      const currentBranch = appState ? appState.branch : (typeof localStorage !== 'undefined' ? localStorage.getItem('mme_branch') : null);
      if (tmpl.branches && Array.isArray(tmpl.branches) && tmpl.branches.length > 0) {
        if (!currentBranch || !tmpl.branches.includes(currentBranch)) {
          return; // Skip this template as it is not assigned to the current branch
        }
      }
      
      const card = document.createElement('div');
      card.className = 'pl-template-card';
      
      const img = document.createElement('img');
      img.src = tmpl.frame_url || 'templates/default.png';
      if (allowedType === 'a5') {
        img.style.transform = 'rotate(-90deg) scale(1.1)';
        img.style.margin = '15px auto';
      }
      
      const title = document.createElement('div');
      title.className = 'pl-template-name';
      title.innerText = tmpl.name;
      
      card.appendChild(img);
      card.appendChild(title);
      
      card.onclick = (e) => {
        e.stopPropagation();
        closeModal();
        if (onSelect) onSelect(key, tmpl);
      };
      
      grid.appendChild(card);
    });

    modal.style.display = 'flex';
    modal.classList.add('active');

    if (btnClose) {
      btnClose.onclick = (e) => {
        e.stopPropagation();
        closeModal();
      };
    }

    modal.onclick = (e) => {
      if (e.target === modal || e.target.classList.contains('pl-modal-close')) {
        closeModal();
      }
    };
  }
}
