// Get environment variables
const clientId = 'd3c73611110e4fb58aa1d1697e272a8e'; // Replace with your actual Client ID
const redirectUri = 'http://localhost:5500/callback'; // Ensure this matches your registered redirect URI

// Function to log in with Spotify
async function loginWithSpotify() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user-top-read`;
    window.location.href = authUrl; // Redirect to Spotify for authorization
}

// Function to fetch top tracks
async function fetchTopTracks() {
    const accessToken = 'BQDRPA9eTg9j8GbuyqXz5EoPfVKa8cRXjlApCr_OABNypB3XHKQ-CEMmw1vWLqn15ewk8C_VI3XEr6aAeffrgLOMHjBWZCZdy5UFmi6aOTrM3VbrMNIWpsjSLbGMaInUjUX41seaRR-Va6KQuZ_xrb8epBPB_hAM-7Z-L3h7qL-2D84FEDNrsWF6GqT_82Lc5hM0iowENxzz3c8jgE1Jnlm6PKYTk_qg0szyYWa5iA'; // Replace with the actual access token
    try {
        const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }

        const data = await response.json();
        if (data.items) {
            displayTopTracks(data.items); // Use 'items' array if available
        } else {
            console.error('No items found in the response.');
        }
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
        trackItem.innerHTML = `<span>${track.name}</span><span>${track.duration_ms}</span>`; // Adjust according to your track object structure
        topPlaylistContent.appendChild(trackItem);
    });
}

// Call the login function when the login button is clicked
document.getElementById('spotify-login').addEventListener('click', loginWithSpotify);
