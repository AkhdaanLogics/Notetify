async function loginWithSpotify() {
    // Your existing login logic here
    // After successful login, call fetchTopTracks
    await fetchTopTracks();
}

// Function to fetch top tracks
async function fetchTopTracks() {
    try {
        const response = await fetch('YOUR_API_ENDPOINT_HERE'); // Replace with your actual API endpoint
        const data = await response.json();
        displayTopTracks(data.tracks); // Assuming the API returns an object with a 'tracks' array
    } catch (error) {
        console.error('Error fetching top tracks:', error);
    }
}

// Function to display top tracks in the container
function displayTopTracks(tracks) {
    const topPlaylistContent = document.getElementById('top-playlist-content');
    topPlaylistContent.innerHTML = ''; // Clear previous content

    tracks.forEach(track => {
        const trackItem = document.createElement('div');
        trackItem.className = 'receipt-item';
        trackItem.innerHTML = `<span>${track.name}</span><span>${track.duration}</span>`; // Adjust according to your track object structure
        topPlaylistContent.appendChild(trackItem);
    });
}

// Call the login function when the login button is clicked
document.getElementById('spotify-login').addEventListener('click', loginWithSpotify);
