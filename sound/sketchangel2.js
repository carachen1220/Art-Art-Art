let bars = [];
let sounds = [];
let isPlaying = false;
let playButton;
let clearButton;
let animateButton;
let isAnimating = false;

let groups = [];
let activeGroups = [];

let soundFile;

function preload() {
  soundFile = loadSound('angel.mp3'); // Load the MP3 file
}

function setup() {
  let canvasWidth = 576 * 0.6;
  let canvasHeight = 450 * 0.6;
  
  let canvas = createCanvas(canvasWidth, canvasHeight); 
  canvas.parent('canvas-container');
  background(0);
  
  // Create Play/Stop button
  playButton = createButton('Play');
  playButton.style('background-color', 'red');
  playButton.mousePressed(togglePlay);
  playButton.parent('button-container');
  
  // Create Clear Screen button
  clearButton = createButton('Clear Screen');
  clearButton.mousePressed(clearScreen);
  clearButton.parent('button-container');

  // Create Animate button
  animateButton = createButton('Animate');
  animateButton.style('background-color', 'blue');
  animateButton.mousePressed(toggleAnimate);
  animateButton.parent('button-container');
}

function draw() {
  background(0);
  stroke(255);
  noFill();
  
  for (let bar of bars) {
    fill(0, 255, 0); // Set bar color to green
    rect(bar.x, bar.y, 6 * 0.6, height - bar.y); // Adjust the width of the bars
  }

  if (mouseIsPressed && mouseX < width && mouseY < height) {
    if (mouseButton === LEFT) {
      let barX = Math.floor(mouseX / (6 * 0.6)) * (6 * 0.6); // Adjust the width step
      let bar = bars.find(b => b.x === barX);
      let soundIndex = bars.findIndex(b => b.x === barX);
      if (bar) {
        bar.y = mouseY;
        let newPlaybackRate = map(mouseY, height, 0, 0.5, 2); // More dramatic rate change
        sounds[soundIndex].rate(newPlaybackRate);
      } else {
        bar = { x: barX, y: mouseY };
        bars.push(bar);
        
        let newSound = soundFile;
        let playbackRate = map(mouseY, height, 0, 0.5, 2); // More dramatic rate change
        newSound.rate(playbackRate);
        newSound.loop(); // Loop the sound continuously
        sounds.push(newSound);
      }
    } else if (mouseButton === RIGHT) {
      let barX = Math.floor(mouseX / (6 * 0.6)) * (6 * 0.6); // Adjust the width step
      let bar = bars.find(b => b.x === barX);
      let soundIndex = bars.findIndex(b => b.x === barX);
      if (bar) {
        bar.y = height;
        sounds[soundIndex].stop();
      }
    }
  }

  if (isAnimating) {
    updateGroups();
  }
}

function togglePlay() {
  isPlaying = !isPlaying;
  if (isPlaying) {
    playButton.html('Stop');
    playButton.style('background-color', 'green');
    for (let sound of sounds) {
      sound.loop(); // Loop the sound continuously
    }
  } else {
    playButton.html('Play');
    playButton.style('background-color', 'red');
    for (let sound of sounds) {
      sound.stop();
    }
  }
}

function clearScreen() {
  bars = [];
  for (let sound of sounds) {
    sound.stop();
  }
  sounds = [];
  background(0);
}

function toggleAnimate() {
  isAnimating = !isAnimating;
  if (isAnimating) {
    animateButton.html('Stop Animation');
    animateButton.style('background-color', 'orange');
    createInitialGroups();
    updateGroupVisibility();
  } else {
    animateButton.html('Animate');
    animateButton.style('background-color', 'blue');
    activeGroups = [];
  }
}

function createGroup() {
  let groupSize = 5 + Math.floor(Math.random() * 5); // 5-9 bars
  let group = [];
  let centerX = random(width);
  
  for (let i = 0; i < groupSize; i++) {
    let barX = centerX + (i - Math.floor(groupSize / 2)) * (6 * 0.6); // Spread bars around centerX
    let barY = height / 2 + randomGaussian(0, height / 6); // Bell curve distribution

    if (barX >= 0 && barX <= width) {
      let bar = { x: barX, y: barY, initialY: barY, targetY: barY };
      bars.push(bar);
      group.push(bar);
      
      let newSound = soundFile;
      let playbackRate = map(barY, height, 0, 0.5, 2); // More dramatic rate change
      newSound.rate(playbackRate);
      newSound.loop(); // Loop the sound continuously
      sounds.push(newSound);
    }
  }
  
  groups.push(group);
  fluctuateGroup(group);
}

function createInitialGroups() {
  let initialGroupsCount = 3 + Math.floor(Math.random() * 3); // Create 3-5 groups initially
  for (let i = 0; i < initialGroupsCount; i++) {
    createGroup();
  }
}

function fluctuateGroup(group) {
  if (isAnimating) {
    for (let bar of group) {
      let maxY = bar.initialY * 1.2;
      let minY = bar.initialY * 0.8;
      bar.targetY = constrain(bar.initialY + random(-0.2 * height, 0.2 * height), minY, maxY);
      bar.targetY = constrain(bar.targetY, 0, height); // Ensure targetY stays within canvas
    }
    setTimeout(() => fluctuateGroup(group), 2000 + Math.random() * 8000); // Change targetY every 2-10 seconds
  }
}

function updateGroups() {
  for (let group of activeGroups) {
    for (let bar of group) {
      bar.y += (bar.targetY - bar.y) * 0.01; // Smoothly move towards targetY
      let newPlaybackRate = map(bar.y, height, 0, 0.5, 2); // More dramatic rate change
      let soundIndex = bars.indexOf(bar);
      sounds[soundIndex].rate(newPlaybackRate);
    }
  }
}

function updateGroupVisibility() {
  if (isAnimating) {
    let newGroupCount = 1 + Math.floor(Math.random() * 10); // 1-10 groups
    while (groups.length < newGroupCount) {
      createGroup();
    }
    activeGroups = [];
    for (let i = 0; i < newGroupCount; i++) {
      let groupIndex;
      do {
        groupIndex = Math.floor(Math.random() * groups.length);
      } while (activeGroups.includes(groups[groupIndex]));
      activeGroups.push(groups[groupIndex]);
    }
    setTimeout(updateGroupVisibility, 20000 + Math.random() * 20000); // Update every 20-40 seconds
  }
}

function mousePressed() {
  // Prevent the default context menu from appearing on right-click
  return false;
}
