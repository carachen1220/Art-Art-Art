let bars = [];
let oscs = [];
let isPlaying = false;
let isAnimating = false;
let visualWindow = null;

function setup() {
    let canvasWidth = 576 * 0.6;
    let canvasHeight = 450 * 0.6;
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvas-container');
    background(0);

    // Create Play/Stop button
    let playButton = select('#playButton');
    playButton.mousePressed(togglePlay);

    // Create Clear Screen button
    let clearButton = select('#clearButton');
    clearButton.mousePressed(clearScreen);

    // Create Animate button
    let animateButton = select('#animateButton');
    animateButton.mousePressed(toggleAnimate);

    // Create Visual button
    let visualButton = select('#visualButton');
    visualButton.mousePressed(openVisualWindow);
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
            let oscIndex = bars.findIndex(b => b.x === barX);
            if (bar) {
                bar.y = mouseY;
                let newAmplitude = map(mouseY, height, 0, 0, 1);
                oscs[oscIndex].amp(newAmplitude, 0.1); // More dramatic amplitude change
                if (isPlaying) {
                    oscs[oscIndex].start();
                }
            } else {
                bar = { x: barX, y: mouseY };
                bars.push(bar);

                let osc = new p5.Oscillator('sine');
                let frequency = 350 + (barX / width) * (450 - 350); // Adjust frequency range
                let amplitude = map(mouseY, height, 0, 0, 1);
                osc.freq(frequency);
                osc.amp(amplitude, 0.1); // More dramatic amplitude change
                if (isPlaying) {
                    osc.start();
                }
                oscs.push(osc);
            }
        } else if (mouseButton === RIGHT) {
            let barX = Math.floor(mouseX / (6 * 0.6)) * (6 * 0.6); // Adjust the width step
            let bar = bars.find(b => b.x === barX);
            let oscIndex = bars.findIndex(b => b.x === barX);
            if (bar) {
                bar.y = height;
                oscs[oscIndex].amp(0, 0.1); // More dramatic amplitude change
            }
        }
    }

    if (isAnimating) {
        updateGroups();
    }

    sendSineWaveDataToPopup();
}

function togglePlay() {
    isPlaying = !isPlaying;
    let playButton = select('#playButton');
    if (isPlaying) {
        playButton.html('Stop');
        playButton.style('background-color', 'green');
        for (let osc of oscs) {
            osc.start();
        }
    } else {
        playButton.html('Play');
        playButton.style('background-color', 'red');
        for (let osc of oscs) {
            osc.stop();
        }
    }
}

function clearScreen() {
    bars = [];
    for (let osc of oscs) {
        osc.stop();
    }
    oscs = [];
    background(0);
}

function toggleAnimate() {
    isAnimating = !isAnimating;
    let animateButton = select('#animateButton');
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

function openVisualWindow() {
    if (visualWindow && !visualWindow.closed) {
        visualWindow.focus();
        return;
    }
    visualWindow = window.open('visual.html', 'VisualWindow', 'width=800,height=400');
}

function sendSineWaveDataToPopup() {
    if (visualWindow && !visualWindow.closed) {
        let data = bars.map(bar => ({ x: bar.x, y: bar.y }));
        visualWindow.postMessage({ type: 'sineWaveData', data: data }, '*');
    }
}

function updateGroups() {
    for (let group of activeGroups) {
        for (let bar of group) {
            bar.y += (bar.targetY - bar.y) * 0.01; // Smoothly move towards targetY
            let newAmplitude = map(bar.y, height, 0, 0, 1);
            let oscIndex = bars.indexOf(bar);
            oscs[oscIndex].amp(newAmplitude, 0.1); // More dramatic amplitude change
        }
    }
}

function updateGroupVisibility() {
    activeGroups = groups.filter(group => {
        let groupVisible = group.some(bar => bar.y >= 0 && bar.y <= height);
        return groupVisible;
    });
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

            let osc = new p5.Oscillator('sine');
            let frequency = 350 + (barX / width) * (450 - 350); // Adjust frequency range
            let amplitude = map(barY, height, 0, 0, 1);
            osc.freq(frequency);
            osc.amp(amplitude, 0.1); // More dramatic amplitude change
            if (isPlaying) {
                osc.start();
            }
            oscs.push(osc);
        }
    }

    return group;
}

function createInitialGroups() {
    for (let i = 0; i < 5; i++) { // Create 5 initial groups
        createGroup();
    }
}

