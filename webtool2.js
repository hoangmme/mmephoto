document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');

  const imageList = document.getElementById('imageList');
  const qrCodeImg = document.getElementById('qrCodeImg');
  const frameSelect = document.getElementById('frameSelect');
  const printFrame = document.getElementById('printFrame');
  const btnPrint = document.getElementById('btnPrint');

  let draggedImageSrc = null;

  // Render slots based on selected frame
  function renderFrameSlots() {
    const frameType = frameSelect.value;
    printFrame.className = `print-frame frame-${frameType}`;
    printFrame.innerHTML = '';

    const slotCount = frameType === 'strip_1x3' ? 3 : 4; // grid_2x2 has 4

    for (let i = 0; i < slotCount; i++) {
      const slot = document.createElement('div');
      slot.className = 'frame-slot';
      slot.innerHTML = '<span>Drop Here</span>';

      // Drag and Drop events for slots
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });

      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        if (draggedImageSrc) {
          slot.innerHTML = `<img src="${draggedImageSrc}" alt="Print photo">`;
        }
      });

      // Click to remove image
      slot.addEventListener('click', () => {
        if (slot.querySelector('img')) {
          slot.innerHTML = '<span>Drop Here</span>';
        }
      });

      printFrame.appendChild(slot);
    }
  }

  // Fetch session data
  async function loadSession() {
    if (!sessionId) {
      imageList.innerHTML = '<div class="loading-text">No session ID provided in URL.</div>';
      renderFrameSlots();
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();

      if (!data.success) {
        imageList.innerHTML = `<div class="loading-text">Error: ${data.error || 'Session not found'}</div>`;
        return;
      }

      // Generate QR Code URL again (or pass from server if preferred)
      // Since we don't have the QR data URL in the GET response, we'll ask the backend for it later or generate on client.
      // Actually, we can just use an API or reconstruct the URL.
      const sessionUrl = `${window.location.origin}/webtool2.html?session=${sessionId}`;
      qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(sessionUrl)}`;
      qrCodeImg.style.display = 'inline-block';

      // Render images
      imageList.innerHTML = '';
      data.images.forEach(imgUrl => {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.className = 'draggable-img';
        img.draggable = true;

        img.addEventListener('dragstart', (e) => {
          draggedImageSrc = imgUrl;
        });

        img.addEventListener('dragend', () => {
          draggedImageSrc = null;
        });

        imageList.appendChild(img);
      });

    } catch (err) {
      imageList.innerHTML = `<div class="loading-text">Failed to load session.</div>`;
      console.error(err);
    }
  }

  // Print
  btnPrint.addEventListener('click', () => {
    window.print();
  });

  // Frame select change
  frameSelect.addEventListener('change', renderFrameSlots);

  // Initialize
  renderFrameSlots();
  loadSession();
});
