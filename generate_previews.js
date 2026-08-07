import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

// We need to parse pl-globals.js. We can import it if it's an ES module.
// Let's just run a node script that imports it.
