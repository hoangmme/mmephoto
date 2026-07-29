async function simulate() {
  const sse = await fetch('http://localhost:3000/api/stream/CN01');
  const reader = sse.body.getReader();
  const decoder = new TextDecoder();
  const {value} = await reader.read();
  const initData = JSON.parse(decoder.decode(value).replace('data: ', '').trim());
  console.log("Server Init Data:", initData);
  
  // Simulate _updateActiveSession
  let roomData = { step: 1, session: null, images: [], queue: initData.sessions };
  let active = roomData.queue[0];
  console.log("active:", active);
  if (active) {
    roomData.session = active.id;
    roomData.step = active.step || 1;
    console.log("Step after active.step || 1:", roomData.step);
    
    // smart step recovery
    if (active.slots && active.slots.some(s => s.imageId)) {
        if (roomData.step < 3) roomData.step = 4;
        console.log("Step after smart recovery:", roomData.step);
    }
    
    if (roomData.images.length > 0 && !active.step && roomData.step === 1) {
        console.log("_setStep(room, 1) called!");
    }
  }
}
simulate();
