async function test() {
  const sse = await fetch('http://localhost:3000/api/stream/CN01');
  
  const reader = sse.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  while (!done) {
    const {value, done: d} = await reader.read();
    done = d;
    if (value) {
      const chunk = decoder.decode(value);
      console.log(chunk);
      if (chunk.includes('init')) break;
    }
  }
}
test();
