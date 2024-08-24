let data = [];
const numChannels = 128;
const historyLength = 200;

function setup() {
  createCanvas(800, 400);
  // Initialize data
  for (let i = 0; i < historyLength; i++) {
    data.push(new Array(numChannels).fill(0));
  }
}

function draw() {
  background(240);
  
  // Simulate receiving new data
  let newData = generateNewData();
  data.push(newData);
  if (data.length > historyLength) {
    data.shift();
  }
  
  // draw waveform
  stroke(0, 0, 255);
  noFill();
  beginShape();
  for (let i = 0; i < data.length; i++) {
    let sum = data[i].reduce((a, b) => a + b, 0);
    let y = map(sum, 0, numChannels * 255, height, 0);
    let x = map(i, 0, historyLength - 1, 0, width);
    vertex(x, y);
  }
  endShape();
  
  // values
  fill(0);
  textSize(16);
  text('RF Signal Waveform', 10, 30);
  text('Time', width - 50, height - 10);
  push();
  translate(20, height / 2);
  rotate(-HALF_PI);
  text('Amplitude', 0, 0);
  pop();
}

function generateNewData() {
  // simulate RF data, giving 128 channels data from 0-255
  return Array.from({length: numChannels}, () => random(255));
}
