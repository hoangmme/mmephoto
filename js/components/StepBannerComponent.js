/**
 * StepBannerComponent.js
 * Controls step indicator banner (B1 -> B2 -> B3 -> B4) and navigation clicks.
 */

import { isStaffMode } from '../modules/pl-globals.js?v=280';

export class StepBannerComponent {
  constructor(bannerId = 'stepBanner', options = {}) {
    this.banner = document.getElementById(bannerId);
    this.onStepClick = options.onStepClick || null;
    this._bindEvents();
  }

  _bindEvents() {
    if (!this.banner) return;
    this.banner.querySelectorAll('.pl-step-item').forEach(item => {
      item.addEventListener('click', () => {
        const sNum = parseInt(item.dataset.step);
        if (this.onStepClick) this.onStepClick(sNum);
      });
    });
  }

  update(currentStep, roomData = {}) {
    if (!this.banner) return;
    this.banner.querySelectorAll('.pl-step-item').forEach(item => {
      const sNum = parseInt(item.dataset.step);
      item.classList.toggle('active', sNum === currentStep);
      item.classList.toggle('completed', sNum < currentStep);

      if (isStaffMode) {
        item.style.cursor = 'pointer';
      } else {
        item.style.cursor = (currentStep < 4 && sNum < 4) ? 'pointer' : 'default';
      }

      if (sNum === 4) {
        const activeSess = roomData.queue ? roomData.queue.find(s => s.id === roomData.session) : null;
        const isStep4 = (roomData.step === 4 || roomData.remoteStep === 4 || (activeSess && activeSess.step === 4)) && !roomData.finished;
        item.classList.toggle('ready-badge', isStaffMode && isStep4);
      }
    });
  }
}
