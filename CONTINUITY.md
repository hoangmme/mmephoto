# PROJECT: MMEPhoto | Photobooth Real-Time Management & A5 Layout Engine

## North Star / Success Criteria
Create a high-performance, real-time sync Photobooth management platform. Provide smooth customer experience for photo layout selection, photo rotation/zoom adjustments, QR code download, and seamless Staff printing/queue control.

---

## Strategic Decisions (Architecture / Core Logic - Hard to Reverse)
- **4-Step User & Staff Flow**:
  - Step 1: Template Selection (A4/A5 paper size & multi-canvas layout).
  - Step 2: Photo Selection from session photoshoot uploads.
  - Step 3: Layout Arrangement (Canvas rendering, normalized ratio coordinates for pan/zoom/rotate).
  - Step 4: Completion (Read-Only Preview: QR download for User; Export JPG/PDF & Next Customer for Staff).
- **Real-Time Room Sync via SSE (`/api/stream/:room`)**:
  - Synchronizes active session, selected templates, paper size, slot allocations, and current step between User iPad and Staff Panel.
- **Normalized Coordinate Math in Canvas Rendering**:
  - All slot adjustments (`zoom`, `panX`, `panY`, `rotation`) use relative ratios (0.0 to 1.0) calculated against template bounding boxes, rendering identical results across preview UI and 300DPI print outputs (A5: 1748x2480px).
- **Step 4 Shared Component & Draft vs. Committed Session Architecture**:
  - **Step 4 (Shared Component)**: Displays the committed official session (Read-Only Preview + QR Download + Cross-Sell Products) shared by both User and Staff. Strictly NEVER runs auto-fill.
  - **User Flow**:
    - Edits in Steps 1, 2, 3 update local User Draft.
    - User Draft is committed to Official Session ONLY when User clicks "Hoàn Tất (Gửi cho Staff)" to enter Step 4.
  - **Staff Flow & Per-Room Draft Isolation**:
    - Edits in Steps 1, 2, 3 in Staff mode update Per-Room Staff Draft (`_staffDrafts[roomKey]`).
    - Switching room tabs (Room 1 ↔ Room 2 ↔ Room 3) preserves each room's isolated Staff Draft.
    - Staff clicking Step 4 renders a Read-Only Preview of the committed session WITHOUT committing Staff Draft.
    - ONLY when Staff explicitly clicks "Gửi cho User" (or "Hoàn tất" in Step 3) is Staff Draft committed to the Official Session Component (Step 4) and broadcast to User.
- **Auto-Trace Template Generation via Node.js Script**:
  - For complex SVG masking templates (e.g., A5-1, A4-1, Template 3, Template 4), we use a standalone Node script.
  - **Process**: Extract the embedded SVG base64 image -> Isolate LUMINANCE mask -> Apply `lum < 128` threshold to find transparent regions -> Use Marching Squares algorithm to trace hole boundaries -> Apply path simplification to create standard SVG `clipPath` vectors -> Filter out tiny artifact regions (e.g., `count > 50000`) to separate photo slots from decorative holes.

---

## Operational Constraints (Fluid Rules & Preferences)
- **Header Canvas Action Controls**: Positioned above frame title (căn phải). Displayed ONLY when a slot inside that canvas frame is actively selected (`selectedSlotIndex >= 0`). Hidden in Step 4.
- **Empty Slot Selection & Filling**:
  - Clicking an empty slot on canvas highlights it with glowing Cyan border.
  - Clicking a photo thumbnail in the bottom gallery fills that photo directly into the selected empty slot (or first empty slot across canvases if none is selected).

---

## Status
- **Done**:
  - Phase 1: Root directory technical debt cleanup (Archived 46 temporary patch scripts into `archive/scripts/`).
  - Phase 2: Modularized monolithic UI and canvas modules into sub-components (`TemplatePicker.js`, `LightboxComponent.js`, `HeaderActions.js`, `CrossSellBanner.js`, `CanvasRenderer.js`, `CanvasExporter.js`, `RoomTabsComponent.js`, `QueueModalComponent.js`, `StepBannerComponent.js`, `ImageListUI.js`).
  - Active slot highlight & header action bar toggle (`↻ Xoay 90°`, `↺ Reset 0°`).
  - Step 4 Read-Only Preview & Staff download/next controls sync.
  - Cache versioning bumped to `v175`.
- **Current Focus**:
  - Phase 3: Build tool integration (Vite) for automated bundle hashing & cache invalidation.
- **Next**:
  - Refactor mixin pattern to explicit modular ES6 classes with clear dependency contracts.

---

## Flags (Drift / Critical / Entropy)
- **ENTROPY**: `pl-ui.js` (1,745 lines) and `pl-canvas.js` (850 lines) exceed the 500-line limit rule. -> *Resolution: Refactor into sub-components (`TemplatePicker.js`, `LightboxComponent.js`, `HeaderActions.js`, `CrossSellBanner.js`).*
- **ENTROPY**: Manual cache query string versioning (`?v=175`). -> *Resolution: Integrate Vite build tool for hashed bundle outputs.*

---

## Cost / Impact Alerts
- **[Reversible]**: Archiving patch scripts into `archive/scripts/`.
- **[Hard to Reverse]**: Vite build integration and module refactoring.

---

## Registry & Recovery
- **Active Files**:
  - [js/print-layout.js](file:///Users/hoji/Documents/code/mmephoto/js/print-layout.js)
  - [js/modules/pl-globals.js](file:///Users/hoji/Documents/code/mmephoto/js/modules/pl-globals.js)
  - [js/modules/pl-state.js](file:///Users/hoji/Documents/code/mmephoto/js/modules/pl-state.js)
  - [js/modules/pl-ui.js](file:///Users/hoji/Documents/code/mmephoto/js/modules/pl-ui.js)
  - [js/modules/pl-canvas.js](file:///Users/hoji/Documents/code/mmephoto/js/modules/pl-canvas.js)
  - [js/modules/pl-queue.js](file:///Users/hoji/Documents/code/mmephoto/js/modules/pl-queue.js)
  - [staff.html](file:///Users/hoji/Documents/code/mmephoto/staff.html)
  - [user.html](file:///Users/hoji/Documents/code/mmephoto/user.html)
  - [server.js](file:///Users/hoji/Documents/code/mmephoto/server.js)
- **Latest Logical Snapshots**: Commit `bf85357` (Version v175).
