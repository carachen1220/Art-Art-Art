document.addEventListener('DOMContentLoaded', function () {
// drag to rotate
document.getElementById('flip-container').addEventListener('click', function () {
    var flipContainer = document.getElementById('flip-container');
    flipContainer.classList.toggle('flipped');
});

let flipper = document.querySelector('.flipper');
let isDragging = false;
let startX;
let initialRotation = 0;
let currentRotation = 0;

flipper.addEventListener('mousedown', function (e) {
    e.preventDefault(); // Prevent default behavior
    isDragging = true;
    startX = e.clientX;
    initialRotation = currentRotation; // Store current rotation angle
    flipper.style.transition = 'none'; // Disable transition effects
    flipper.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', function (e) {
    if (isDragging) {
        let deltaX = e.clientX - startX;
        let rotation = initialRotation + deltaX; // Rotate based on initial angle
        flipper.style.transform = 'rotateY(' + rotation / 5 + 'deg)';
    }
});

document.addEventListener('mouseup', function (e) {
    if (isDragging) {
        isDragging = false;
        flipper.style.transition = 'transform 1.5s'; // Restore transition effects
        flipper.style.transform = 'rotateY(' + initialRotation / 5 + 'deg)'; // Reset to initial angle
        flipper.style.cursor = 'grab';
    }
});

// Prevent default image dragging behavior
flipper.querySelectorAll('img').forEach(img => {
    img.addEventListener('dragstart', function (e) {
        e.preventDefault();
    });
});



// Save paintings
document.getElementById('save-button').addEventListener('click', function () {
    let imageChoice = document.getElementById('image-choice').value;
    let formatChoice = document.getElementById('format-choice').value;
    let imageElement = document.getElementById(imageChoice);

    // convert div to img by using html2canvas 
    html2canvas(imageElement).then(canvas => {
       
        if (formatChoice === 'svg') {
            let svgData = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
                    <image href="${canvas.toDataURL('image/png')}" height="100%" width="100%"/>
                </svg>
            `;
            let svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            let svgUrl = URL.createObjectURL(svgBlob);
            let link = document.createElement('a');
            link.href = svgUrl;
            link.download = `${imageChoice}.svg`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(svgUrl);
        } else {
            canvas.toBlob(function (blob) {
                let imageUrl = URL.createObjectURL(blob);
                let link = document.createElement('a');
                link.href = imageUrl;
                link.download = `${imageChoice}.${formatChoice}`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(imageUrl);
            }, `image/${formatChoice}`);
        }
    }).catch(error => {
        console.error("Error generating canvas:", error);
    });
});



})

