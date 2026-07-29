/**
 * pl-ui-events.js
 * Handles DOM event bindings, button listeners, file uploads, and lightbox event handlers.
 */

export const UIEventsMixin = {
  _bindEvents() {
    const btnPrev = document.getElementById('btnStepPrev');
    const btnNext = document.getElementById('btnStepNext');
    const btnSelectAll = document.getElementById('btnSelectAll');
    const btnDeselectAll = document.getElementById('btnDeselectAll');
    const btnAutoFill = document.getElementById('btnAutoFill');
    const btnStaffDownload = document.getElementById('btnStaffDownload');
    const btnNextCustomer = document.getElementById('btnNextCustomer');

    if (btnPrev) btnPrev.addEventListener('click', () => this._prevStep());
    if (btnNext) btnNext.addEventListener('click', () => this._nextStep());

    if (btnSelectAll) btnSelectAll.addEventListener('click', () => this._selectAll());
    if (btnDeselectAll) btnDeselectAll.addEventListener('click', () => this._deselectAll());
    if (btnAutoFill) btnAutoFill.addEventListener('click', () => this._autoFill());

    if (btnStaffDownload) {
      btnStaffDownload.addEventListener('click', () => this._exportJPG());
    }
    if (btnNextCustomer) {
      btnNextCustomer.addEventListener('click', () => {
        if (confirm('Chuyển sang khách tiếp theo? Phiên hiện tại sẽ hoàn tất.')) {
          this._finishCurrentSession();
        }
      });
    }

    const testInput = document.getElementById('testUploadInput');
    const testBtn = document.getElementById('btnTestUpload');
    if (testBtn && testInput) {
      testBtn.addEventListener('click', () => testInput.click());
      testInput.addEventListener('change', (e) => this._uploadTestImages(e));
    }

    const fileTest = document.getElementById('fileUploadTest');
    const btnTest = document.getElementById('btnUploadTest');
    if (btnTest && fileTest) {
      btnTest.addEventListener('click', () => fileTest.click());
      fileTest.addEventListener('change', (e) => this._uploadTestImages(e));
    }
  },

  async _uploadTestImages(e) {
    const branch = localStorage.getItem('branchId') || 'CN01';
    let room = this.activeRoom || 'Room1';
    const session = (this.rooms[room] && this.rooms[room].session) ? this.rooms[room].session : ('test_' + Date.now());

    const files = Array.from(e.target.files);
    for (let file of files) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        await fetch(`/api/stream-upload/${branch}/${room}/${session}`, {
          method: 'POST',
          body: formData
        });
      } catch (err) {
        console.error("Test upload failed:", err);
      }
    }
    e.target.value = '';
  }
};
