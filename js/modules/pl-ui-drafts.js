import { ALL_TEMPLATES, customTemplates, isStaffMode, setStaffMode, A5_WIDTH, A5_HEIGHT, PADDING } from './pl-globals.js?v=297';
import { TemplatePicker } from '../components/TemplatePicker.js?v=297';
import { LightboxComponent } from '../components/LightboxComponent.js?v=297';
import { HeaderActions } from '../components/HeaderActions.js?v=297';
import { CrossSellBanner } from '../components/CrossSellBanner.js?v=297';
import { RoomTabsComponent } from '../components/RoomTabsComponent.js?v=297';
import { QueueModalComponent } from '../components/QueueModalComponent.js?v=297';
import { StepBannerComponent } from '../components/StepBannerComponent.js?v=297';
import { ImageListUI } from '../components/ImageListUI.js?v=297';

export const UIDraftsMixin = {
  _loadDraftsFromStorage() {
    try {
      const staffVal = localStorage.getItem('mme_staff_drafts');
      if (staffVal) this._staffDrafts = JSON.parse(staffVal);
      const userVal = localStorage.getItem('mme_user_drafts');
      if (userVal) this._userDrafts = JSON.parse(userVal);
    } catch (e) {}
  },


  _syncStaffDraftState() {
    if (!this.activeRoom) return;
    const roomData = this.rooms[this.activeRoom];
    if (!roomData || !roomData.session) return;
    const draftKey = `${this.activeRoom}_${roomData.session}`;

    this._loadDraftsFromStorage();
    if (isStaffMode) {
      if (!this._staffDrafts) this._staffDrafts = {};
      this._staffDrafts[draftKey] = {
        selectedTemplates: [...(this.selectedTemplates || [])],
        paperSize: this.paperSize,
        canvasesState: JSON.parse(JSON.stringify(this.canvasesState || [])),
        slots: JSON.parse(JSON.stringify(this.slots || [])),
        selectedPhotos: Array.from(this.selectedPhotos || []),
        activeCanvasIndex: (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0
      };
      this._staffDraftState = this._staffDrafts[draftKey];
      try { localStorage.setItem('mme_staff_drafts', JSON.stringify(this._staffDrafts)); } catch (e) {}
    } else {
      if (!this._userDrafts) this._userDrafts = {};
      this._userDrafts[draftKey] = {
        selectedTemplates: [...(this.selectedTemplates || [])],
        paperSize: this.paperSize,
        canvasesState: JSON.parse(JSON.stringify(this.canvasesState || [])),
        slots: JSON.parse(JSON.stringify(this.slots || [])),
        selectedPhotos: Array.from(this.selectedPhotos || []),
        activeCanvasIndex: (this.activeCanvasIndex !== undefined && this.activeCanvasIndex !== null) ? this.activeCanvasIndex : 0
      };
      try { localStorage.setItem('mme_user_drafts', JSON.stringify(this._userDrafts)); } catch (e) {}
    }
  },


  _commitDraftToOfficialSession(roomKey) {
    const targetRoom = roomKey || this.activeRoom;
    if (!targetRoom || !this.rooms || !this.rooms[targetRoom]) return;
    const roomData = this.rooms[targetRoom];
    if (!roomData.queue || !roomData.session) return;
    const activeSess = roomData.queue.find(s => s.id === roomData.session);
    if (!activeSess) return;
    
    const draftKey = `${targetRoom}_${roomData.session}`;

    this._loadDraftsFromStorage();
    const currentDraft = isStaffMode
      ? (this._staffDrafts && this._staffDrafts[draftKey] ? this._staffDrafts[draftKey] : null)
      : (this._userDrafts && this._userDrafts[draftKey] ? this._userDrafts[draftKey] : null);

    if (currentDraft) {
      activeSess.selectedTemplates = [...(currentDraft.selectedTemplates || [])];
      activeSess.paperSize = currentDraft.paperSize;
      activeSess.canvasesState = JSON.parse(JSON.stringify(currentDraft.canvasesState || []));
      activeSess.slots = JSON.parse(JSON.stringify(currentDraft.slots || []));
      activeSess.selectedImages = Array.from(currentDraft.selectedPhotos || []);
    } else {
      activeSess.selectedTemplates = [...(this.selectedTemplates || [])];
      activeSess.paperSize = this.paperSize;
      activeSess.canvasesState = JSON.parse(JSON.stringify(this.canvasesState || []));
      activeSess.slots = JSON.parse(JSON.stringify(this.slots || []));
      activeSess.selectedImages = Array.from(this.selectedPhotos || []);
    }

    // Clear committed draft from localStorage
    if (isStaffMode && this._staffDrafts) {
      delete this._staffDrafts[draftKey];
      try { localStorage.setItem('mme_staff_drafts', JSON.stringify(this._staffDrafts)); } catch (e) {}
    } else if (!isStaffMode && this._userDrafts) {
      delete this._userDrafts[draftKey];
      try { localStorage.setItem('mme_user_drafts', JSON.stringify(this._userDrafts)); } catch (e) {}
    }

    if (this._syncStateDirect) this._syncStateDirect(targetRoom);
  },


};
