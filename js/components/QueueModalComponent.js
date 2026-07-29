/**
 * QueueModalComponent.js
 * Manages rendering of the Queue Management modal dialog for Staff.
 */

export class QueueModalComponent {
  constructor(options = {}) {
    this.overlay = document.getElementById('queueModalOverlay');
    this.container = document.getElementById('queueListContainer');
    this.closeBtn = document.getElementById('btnCloseQueueModal');
    this.openBtn = document.getElementById('btnQueueManager');

    this.onSelectSession = options.onSelectSession || null;
    this.onFinishSession = options.onFinishSession || null;
    this.onDeleteSession = options.onDeleteSession || null;

    this._bindEvents();
  }

  _bindEvents() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }
  }

  open() {
    if (this.overlay) this.overlay.style.display = 'flex';
  }

  close() {
    if (this.overlay) this.overlay.style.display = 'none';
  }

  render(queue, activeSessionId) {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (!queue || queue.length === 0) {
      this.container.innerHTML = '<div style="color:var(--pl-text-muted); text-align:center; padding:20px;">Không có phiên chụp nào trong hàng chờ.</div>';
      return;
    }

    queue.forEach(sess => {
      const isActive = sess.id === activeSessionId;
      const card = document.createElement('div');
      card.style.padding = '12px';
      card.style.background = isActive ? 'rgba(79, 50, 25, 0.1)' : 'var(--pl-bg-section)';
      card.style.border = isActive ? '2px solid var(--pl-accent)' : '1px solid var(--pl-border)';
      card.style.borderRadius = '8px';
      card.style.display = 'flex';
      card.style.justifySpaceBetween = 'space-between';
      card.style.alignItems = 'center';

      const info = document.createElement('div');
      info.innerHTML = `
        <div style="font-weight:bold; font-size:14px; color:var(--pl-text);">Phiên: ${sess.id}</div>
        <div style="font-size:12px; color:var(--pl-text-muted);">Số ảnh: ${(sess.images || []).length} | Bước: ${sess.step || 1}</div>
      `;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';

      if (!isActive) {
        const selectBtn = document.createElement('button');
        selectBtn.innerText = 'Chọn';
        selectBtn.className = 'pl-btn-secondary';
        selectBtn.style.padding = '4px 8px';
        selectBtn.onclick = () => {
          if (this.onSelectSession) this.onSelectSession(sess.id);
          this.close();
        };
        actions.appendChild(selectBtn);
      }

      const delBtn = document.createElement('button');
      delBtn.innerText = 'Xóa';
      delBtn.className = 'pl-btn-secondary';
      delBtn.style.background = '#ef4444';
      delBtn.style.color = '#fff';
      delBtn.style.padding = '4px 8px';
      delBtn.onclick = () => {
        if (confirm(`Xác nhận xóa phiên ${sess.id}?`)) {
          if (this.onDeleteSession) this.onDeleteSession(sess.id);
        }
      };
      actions.appendChild(delBtn);

      card.appendChild(info);
      card.appendChild(actions);
      this.container.appendChild(card);
    });
  }
}
