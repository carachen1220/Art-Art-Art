let fields = [];
let angles = [];
let lengths = [];
let vertices = [];
let boundaryPoint;
let perpPoint1, perpPoint2;
let canvasSlider;
let fieldSizeSlider;
let numFieldsSlider;
let bezierDistanceSlider;
let controlOffsetSlider;
let canvasSizeLabel;
let fieldSizeLabel;
let numFieldsLabel;
let bezierDistanceLabel;
let controlOffsetLabel;
let canvas;

function setup() {
  // Create the canvas size slider
  canvasSlider = createSlider(400, 800, 800, 50); // Min 400, Max 800, Default 800, Step 50
  canvasSlider.position(10, 10); // Position slider above the canvas
  canvasSlider.style('width', '200px');
  canvasSlider.input(updateCanvasSize);

  // Create the label for the canvas size slider
  canvasSizeLabel = createP('Canvas Size: ' + canvasSlider.value() + 'px');
  canvasSizeLabel.position(canvasSlider.x * 2 + canvasSlider.width, 10);

  // Create the field size slider
  fieldSizeSlider = createSlider(100, 400, 200, 10); // Min 100, Max 400, Default 200, Step 10
  fieldSizeSlider.position(10, 40); // Position slider below the canvas size slider
  fieldSizeSlider.style('width', '200px');
  fieldSizeSlider.input(updateFieldSize);

  // Create the label for the field size slider
  fieldSizeLabel = createP('Field Size Range: ' + fieldSizeSlider.value() + 'px');
  fieldSizeLabel.position(fieldSizeSlider.x * 2 + fieldSizeSlider.width, 40);

  // Create the number of fields slider
  numFieldsSlider = createSlider(10, 50, 20, 1); // Min 10, Max 50, Default 20, Step 1
  numFieldsSlider.position(10, 70); // Position slider below the field size slider
  numFieldsSlider.style('width', '200px');
  numFieldsSlider.input(updateNumFields);

  // Create the label for the number of fields slider
  numFieldsLabel = createP('Number of Fields: ' + numFieldsSlider.value());
  numFieldsLabel.position(numFieldsSlider.x * 2 + numFieldsSlider.width, 70);

  // Create the Bezier control points distance slider
  bezierDistanceSlider = createSlider(50, 200, 100, 10); // Min 50, Max 200, Default 100, Step 10
  bezierDistanceSlider.position(10, 100); // Position slider below the number of fields slider
  bezierDistanceSlider.style('width', '200px');
  bezierDistanceSlider.input(updateBezierDistance);

  // Create the label for the Bezier control points distance slider
  bezierDistanceLabel = createP('Bezier Control Points Distance: ' + bezierDistanceSlider.value() + 'px');
  bezierDistanceLabel.position(bezierDistanceSlider.x * 2 + bezierDistanceSlider.width, 100);

  // Create the control offset slider
  controlOffsetSlider = createSlider(10, 200, 100, 10); // Min 10, Max 200, Default 100, Step 10
  controlOffsetSlider.position(10, 130); // Position slider below the Bezier distance slider
  controlOffsetSlider.style('width', '200px');
  controlOffsetSlider.input(updateControlOffset);

  // Create the label for the control offset slider
  controlOffsetLabel = createP('Control Offset: ' + controlOffsetSlider.value() + 'px');
  controlOffsetLabel.position(controlOffsetSlider.x * 2 + controlOffsetSlider.width, 130);

  // Create the canvas with initial size
  canvas = createCanvas(800, 800);
  canvas.position(10, 160); // Position canvas below the sliders
  background(255);
  noLoop(); // We only need to draw once
  drawFarmLandscape();
}

function updateCanvasSize() {
  let newSize = canvasSlider.value();
  canvasSizeLabel.html('Canvas Size: ' + newSize + 'px');
  resizeCanvas(newSize, newSize);
  canvas.position(10, 160); // Reposition canvas below the sliders after resize
  drawFarmLandscape();
}

function updateFieldSize() {
  fieldSizeLabel.html('Field Size Range: ' + fieldSizeSlider.value() + 'px');
  drawFarmLandscape();
}

function updateNumFields() {
  numFieldsLabel.html('Number of Fields: ' + numFieldsSlider.value());
  drawFarmLandscape();
}

function updateBezierDistance() {
  bezierDistanceLabel.html('Bezier Control Points Distance: ' + bezierDistanceSlider.value() + 'px');
  drawFarmLandscape();
}

function updateControlOffset() {
  controlOffsetLabel.html('Control Offset: ' + controlOffsetSlider.value() + 'px');
  drawFarmLandscape();
}

function drawFarmLandscape() {
  let root = { x: -100, y: -100, w: width + 200, h: height + 200 };
  fields = [];
  generateRandomFields(root);
  background(255);
  for (let field of fields) {
    drawField(field);
  }
}

function generateRandomFields(rect) {
  let numFields = numFieldsSlider.value(); // Use the number of fields from the slider
  for (let i = 0; i < numFields; i++) {
    let fieldWidth = random(100, fieldSizeSlider.value());
    let fieldHeight = random(100, fieldSizeSlider.value());
    let fieldX = random(rect.x, rect.x + rect.w - fieldWidth);
    let fieldY = random(rect.y, rect.y + rect.h - fieldHeight);
    let field = { x: fieldX, y: fieldY, w: fieldWidth, h: fieldHeight };
    fields.push(field);
  }
}

function drawField(field) {
  let x = field.x;
  let y = field.y;
  let w = field.w;
  let h = field.h;
  
  // Create an irregular shape
  angles = [];
  lengths = [];
  vertices = [];
  
  let sides = int(random(3, 8)); // Random number of sides between 3 and 7

  for (let i = 0; i < sides; i++) {
    angles.push(TWO_PI / sides * i); // Evenly distribute the angles
    lengths.push(random(1.5, 3) * min(w, h) / 2); // Larger random length for each side
  }

  for (let i = 0; i < sides; i++) {
    let vx = x + w / 2 + cos(angles[i]) * lengths[i];
    let vy = y + h / 2 + sin(angles[i]) * lengths[i];
    vertices.push(createVector(vx, vy));
  }

  beginShape();
  for (let v of vertices) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);

  // Select a random point on the boundary that is not a vertex
  let edgeIndex = int(random(sides));
  let nextEdgeIndex = (edgeIndex + 1) % sides;
  let edgeStart = vertices[edgeIndex];
  let edgeEnd = vertices[nextEdgeIndex];
  
  let t = random(0.1, 0.9); // Random position along the edge, not at the vertices
  boundaryPoint = p5.Vector.lerp(edgeStart, edgeEnd, t);

  // Find the farthest point from the boundary point
  let maxDistance = 0;
  let farthestPoint;
  for (let i = 0; i < vertices.length; i++) {
    let d = dist(boundaryPoint.x, boundaryPoint.y, vertices[i].x, vertices[i].y);
    if (d > maxDistance) {
      maxDistance = d;
      farthestPoint = vertices[i];
    }
  }

  // Find the vector perpendicular to the line from the boundary point to the farthest point
  let perpVector = createVector(-(farthestPoint.y - boundaryPoint.y), farthestPoint.x - boundaryPoint.x);
  perpVector.normalize();
  perpVector.mult(maxDistance);

  // Find the point on the perpendicular line through the farthest point
  perpPoint1 = p5.Vector.add(farthestPoint, perpVector);
  perpPoint2 = p5.Vector.sub(farthestPoint, perpVector);

  // Create a clipping mask
  let fieldMask = createGraphics(width, height);
  fieldMask.fill(255);
  fieldMask.beginShape();
  for (let v of vertices) {
    fieldMask.vertex(v.x, v.y);
  }
  fieldMask.endShape(CLOSE);

  // Draw bezier curves using the mask
  let maskApplied = createGraphics(width, height);
  maskApplied.background(255); // Change the background to white
  drawBezierCurves(maskApplied, boundaryPoint, perpPoint1, perpPoint2);

  // Apply the mask
  maskApplied.loadPixels();
  fieldMask.loadPixels();
  for (let i = 0; i < maskApplied.pixels.length; i += 4) {
    if (fieldMask.pixels[i] == 0) {
      maskApplied.pixels[i + 3] = 0;
    }
  }
  maskApplied.updatePixels();

  image(maskApplied, 0, 0);

  // Draw the outline of the field
  stroke(0);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let v of vertices) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);
}

function drawBezierCurves(pg, startPoint, endPoint1, endPoint2) {
  let numCurves = int(random(5, 15));
  let spacing = 1.0 / numCurves;
  let bezierDist = bezierDistanceSlider.value(); // Use the distance from the slider
  let controlOffset = controlOffsetSlider.value(); // Use the control offset from the slider

  for (let i = 0; i < numCurves; i++) {
    let t = lerp(0, 1, i * spacing + random(-spacing / 2, spacing / 2));
    let endPoint = p5.Vector.lerp(endPoint1, endPoint2, t);
    let controlOffset1 = p5.Vector.random2D().mult(controlOffset);
    let controlOffset2 = p5.Vector.random2D().mult(controlOffset);
    
    pg.noFill();
    pg.strokeWeight(2);
    pg.stroke(255, 0, 0); // Set the stroke color to red
    pg.bezier(startPoint.x, startPoint.y, 
              startPoint.x + controlOffset1.x, startPoint.y + controlOffset1.y, 
              endPoint.x + controlOffset2.x, endPoint.y + controlOffset2.y, 
              endPoint.x, endPoint.y);
  }
}
