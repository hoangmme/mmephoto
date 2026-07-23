async function test() {
  // Sync to step 4
  const res = await fetch('http://localhost:3000/api/sync-state/CN01/Room1/damenumber123', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 4,
      currentTemplate: '2photos',
      selectedImages: ['img1', 'img2'],
      slots: [{imageId: 'img1'}, {imageId: 'img2'}]
    })
  });
  console.log(await res.json());
}
test();
