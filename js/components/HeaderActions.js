/**
 * HeaderActions.js
 * Controls canvas frame top header actions (↻ Xoay 90° & ↺ Reset 0°).
 */

export class HeaderActions {
  constructor(options = {}) {
    this.onRotate = options.onRotate || null;
    this.onReset = options.onReset || null;
    this._bindEvents();
  }

  _bindEvents() {
    [0, 1].forEach(cIdx => {
      const btnRot = document.getElementById('btnRotate90_' + cIdx);
      const btnRes = document.getElementById('btnReset0_' + cIdx);

      if (btnRot) {
        btnRot.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.onRotate) this.onRotate(cIdx);
        });
      }

      if (btnRes) {
        btnRes.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.onReset) this.onReset(cIdx);
        });
      }
    });
  }

  updateVisibility(currentStep, activeCanvasIndex, canvasesState, selectedSlotIndex) {
    [0, 1].forEach(cIdx => {
      const actionsEl = document.getElementById('canvasActions' + cIdx);
      if (!actionsEl) return;

      if (currentStep === 4) {
        actionsEl.style.display = 'none';
        return;
      }

      const activeSlotIdx = (canvasesState && canvasesState[cIdx])
        ? canvasesState[cIdx].selectedSlotIndex
        : (cIdx === (activeCanvasIndex || 0) ? selectedSlotIndex : -1);

      if (cIdx === (activeCanvasIndex || 0) && activeSlotIdx >= 0) {
        actionsEl.style.display = 'flex';
      } else {
        actionsEl.style.display = 'none';
      }
    });
  }
}
