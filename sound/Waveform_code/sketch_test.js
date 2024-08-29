let data = [];
const numChannels = 128;
const historyLength = 200;
let startTime;

function setup() {
  createCanvas(800, 450);  // Increased height to accommodate timestamp
  // Initialize data
  for (let i = 0; i < historyLength; i++) {
    data.push(new Array(numChannels).fill(0));
  }
  startTime = millis();
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
    let avg = data[i].reduce((a, b) => a + b, 0) / numChannels;  // Calculate average
    let y = map(avg, 0, 1000, height - 50, 50);  // Adjusted for top and bottom margins
    let x = map(i, 0, historyLength - 1, 50, width - 10);  // Adjusted for left margin
    vertex(x, y);
  }
  endShape();
  
  // Draw axes
  stroke(0);
  line(50, 50, 50, height - 50);  // Y-axis
  line(50, height - 50, width - 10, height - 50);  // X-axis
  
  // Labels
  fill(0);
  textSize(16);
  textAlign(CENTER, CENTER);
  text('RF Signal Waveform (Average)', width / 2, 30);
  
  push();
  translate(25, height / 2);
  text('Value', 0, 0);
  pop();
  
  // Y-axis range labels
  textAlign(RIGHT, CENTER);
  text('1000', 45, 50);
  text('0', 45, height - 50);
  
  // Add timestamp
  textAlign(LEFT, CENTER);
  let currentTime = (millis() - startTime) / 1000;  // Convert to seconds
  text(`Time: ${currentTime.toFixed(2)} seconds`, 60, height - 25);
}

function generateNewData() {
  // simulate RF data, giving 128 channels data from 0-1000
  return Array.from({length: numChannels}, () => random(1000));
}