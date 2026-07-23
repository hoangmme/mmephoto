const room = window.printApp.activeRoom;
const s = window.printApp.slots[0];
if(s && s.imageId) {
   const img = window.printApp._imageCache[s.imageId];
   console.log("Image:", img, "Width:", img?.naturalWidth, "Complete:", img?.complete);
} else {
   console.log("No slot 0");
}
window.printApp._renderCanvas();
console.log("Rendered!");
