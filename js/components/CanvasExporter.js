/**
 * CanvasExporter.js
 * Export engine for generating HiDPI JPGs, multi-page PDFs, and server uploads.
 */

export class CanvasExporter {
  static async exportJPG(appInstance) {
    if (!appInstance) return;
    appInstance._showOverlay(true);
    await new Promise(r => setTimeout(r, 50));

    try {
      const exportCanvas = document.createElement('canvas');
      const currentIdx = appInstance.activeCanvasIndex;
      const templatesToExport = appInstance.selectedTemplates && appInstance.selectedTemplates.length > 0 
        ? appInstance.selectedTemplates 
        : [appInstance.currentTemplate];

      for (let i = 0; i < templatesToExport.length; i++) {
        appInstance.activeCanvasIndex = i;
        appInstance.currentTemplate = templatesToExport[i];
        if (appInstance.canvasesState && appInstance.canvasesState[i]) {
          appInstance.slots = appInstance.canvasesState[i].slots;
          appInstance.selectedSlotIndex = -1;
        }
        await appInstance._loadTemplateImages();
        appInstance._drawToCanvas(exportCanvas, false, null, false, 4000);

        const dataUrl = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `MME_${appInstance.paperSize || 'Print'}_${Date.now()}_P${i + 1}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(r => setTimeout(r, 500));
      }

      if (templatesToExport.length > 1) {
        appInstance.activeCanvasIndex = currentIdx;
        appInstance.currentTemplate = templatesToExport[currentIdx];
        if (appInstance.canvasesState && appInstance.canvasesState[currentIdx]) {
          appInstance.slots = appInstance.canvasesState[currentIdx].slots;
        }
        await appInstance._loadTemplateImages();
      }
    } catch (err) {
      console.error('Export JPG failed:', err);
      alert('Xuất JPG thất bại.');
    }
    appInstance._showOverlay(false);
  }

  static async exportPDF(appInstance) {
    if (!appInstance) return;
    appInstance._showOverlay(true);
    await new Promise(r => setTimeout(r, 50));

    try {
      const { jsPDF } = window.jspdf;
      let formatStr = (appInstance.paperSize === 'A4') ? 'a4' : 'a5';
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: formatStr });
      const exportCanvas = document.createElement('canvas');
      const currentIdx = appInstance.activeCanvasIndex;
      const templatesToExport = appInstance.selectedTemplates && appInstance.selectedTemplates.length > 0 
        ? appInstance.selectedTemplates 
        : [appInstance.currentTemplate];

      for (let i = 0; i < templatesToExport.length; i++) {
        appInstance.activeCanvasIndex = i;
        appInstance.currentTemplate = templatesToExport[i];
        if (appInstance.canvasesState && appInstance.canvasesState[i]) {
          appInstance.slots = appInstance.canvasesState[i].slots;
          appInstance.selectedSlotIndex = -1;
        }
        await appInstance._loadTemplateImages();
        appInstance._drawToCanvas(exportCanvas, false, null, false, 4000);

        const dataUrl = exportCanvas.toDataURL('image/jpeg', 1.0);
        if (i > 0) pdf.addPage();

        const width = formatStr === 'a4' ? 210 : 148;
        const height = formatStr === 'a4' ? 297 : 210;
        pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
      }

      pdf.save(`MME_${appInstance.paperSize || 'Print'}_${Date.now()}.pdf`);

      if (templatesToExport.length > 1) {
        appInstance.activeCanvasIndex = currentIdx;
        appInstance.currentTemplate = templatesToExport[currentIdx];
        if (appInstance.canvasesState && appInstance.canvasesState[currentIdx]) {
          appInstance.slots = appInstance.canvasesState[currentIdx].slots;
        }
        await appInstance._loadTemplateImages();
      }
    } catch (err) {
      console.error('Export PDF failed:', err);
      alert('Xuất PDF thất bại. Đảm bảo jsPDF đã được tải.');
    }
    appInstance._showOverlay(false);
  }

  static async uploadFinalFrame(appInstance) {
    if (!appInstance) return;
    const room = appInstance.activeRoom || 'Room1';
    const roomData = appInstance.rooms ? appInstance.rooms[room] : null;
    const session = (roomData && roomData.session) ? roomData.session : null;
    const branch = localStorage.getItem('branchId') || 'hangkhay';
    if (!session) return;

    try {
      const exportCanvas = document.createElement('canvas');
      const templatesToExport = appInstance.selectedTemplates && appInstance.selectedTemplates.length > 0 
        ? appInstance.selectedTemplates 
        : [appInstance.currentTemplate];

      const origIdx = appInstance.activeCanvasIndex;
      for (let i = 0; i < templatesToExport.length; i++) {
        appInstance.activeCanvasIndex = i;
        appInstance.currentTemplate = templatesToExport[i];
        if (appInstance.canvasesState && appInstance.canvasesState[i]) {
          appInstance.slots = appInstance.canvasesState[i].slots;
          appInstance.selectedSlotIndex = -1;
        }
        await appInstance._loadTemplateImages();
        appInstance._drawToCanvas(exportCanvas, false, null, false, 4000);

        const blob = await new Promise(resolve => exportCanvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const formData = new FormData();
          const filename = `00_frame_P${i + 1}.png`;
          formData.append('image', blob, filename);
          await fetch(`/api/stream-upload/${branch}/${room}/${session}`, {
            method: 'POST',
            body: formData
          });
        }
      }
      appInstance.activeCanvasIndex = origIdx;
    } catch (err) {
      console.error('uploadFinalFrame error:', err);
    }
  }
}
