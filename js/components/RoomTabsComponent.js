/**
 * RoomTabsComponent.js
 * Manages rendering and interaction of Staff room tabs at the header.
 */

import { isStaffMode } from '../modules/pl-globals.js?v=276';

export class RoomTabsComponent {
  constructor(containerId = 'roomTabs', options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelectRoom = options.onSelectRoom || null;
  }

  render(roomsObj, activeRoomKey) {
    if (!this.container) return;
    if (!isStaffMode) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'flex';
    this.container.innerHTML = '';

    const roomKeys = Object.keys(roomsObj || {});
    if (roomKeys.length === 0) return;

    roomKeys.forEach(roomKey => {
      const btn = document.createElement('button');
      btn.innerText = roomKey;
      btn.className = 'pl-room-tab-btn';
      btn.style.padding = '8px 12px';
      btn.style.border = '1px solid var(--pl-border)';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      btn.style.position = 'relative';
      btn.style.fontWeight = '600';

      if (roomKey === activeRoomKey) {
        btn.style.background = 'var(--pl-accent)';
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'var(--pl-bg-section)';
        btn.style.color = 'var(--pl-text)';
      }

      const roomD = roomsObj[roomKey];
      const isReadyStep4 = roomD && roomD.step === 4 && !roomD.finished;
      if ((roomD.hasNew || isReadyStep4) && roomKey !== activeRoomKey) {
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.top = '-3px';
        dot.style.right = '-3px';
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.background = '#ef4444';
        dot.style.borderRadius = '50%';
        dot.style.border = '2px solid #ffffff';
        dot.style.boxShadow = '0 0 6px rgba(239, 68, 68, 0.8)';
        dot.style.animation = 'pl-pulse 1.5s infinite';
        btn.appendChild(dot);
      }

      btn.onclick = () => {
        if (this.onSelectRoom) this.onSelectRoom(roomKey);
      };

      this.container.appendChild(btn);
    });
  }
}
