
// open Paintings page
function openLink() {
    const container = document.getElementById('container-spec');
    const shutterSound = document.getElementById('shutterSound');

    // Play the shutter sound
    shutterSound.play();

    // Add flash effect class
    container.classList.add('flash-effect');

    // Remove the flash effect class after 0.5s
    setTimeout(() => {
        container.classList.remove('flash-effect');
        // Open the new page after the effect
        window.open('snapshot.html', '_blank', 'width=800,height=600,left=100,top=100');
    }, 500);
}

