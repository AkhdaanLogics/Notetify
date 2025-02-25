import { SpotifyAuth } from './spotifyAuth.js';
import { config } from './config.js';
import { ReceiptCapture } from './html2canvas.js';

// Create SpotifyAuth instance
const spotifyAuth = new SpotifyAuth({
  clientId: config.clientId,
  redirectUri: config.redirectUri
});

// Initialize UI Components
function initializeUI() {
  // Setup login button
  const loginButton = document.getElementById('spotify-login');
  if (loginButton) {
    loginButton.addEventListener('click', async () => {
      try {
        await spotifyAuth.login();
      } catch (error) {
        showError(`Login failed: ${error.message}`);
      }
    });
  }

  // Setup generate receipt button
  const generateButton = document.getElementById('generate-receipt');
  if (generateButton) {
    generateButton.addEventListener('click', async () => {
      try {
        await fetchUserData();
      } catch (error) {
        showError(`Failed to generate receipt: ${error.message}`);
      }
    });
  }

  // Setup share popup
  const shareButton = document.getElementById('share');
  const sharePopup = document.getElementById('share-popup');
  const closeShareButton = document.getElementById('close-share-popup');

  if (shareButton && sharePopup && closeShareButton) {
    shareButton.addEventListener('click', () => {
      sharePopup.classList.remove('hidden');
    });

    closeShareButton.addEventListener('click', () => {
      sharePopup.classList.add('hidden');
    });
  }

  // Setup download button
  const downloadButton = document.getElementById('download-receipt');
  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      try {
        new ReceiptCapture().captureReceipt();
        sharePopup.classList.add('hidden');
      } catch (error) {
        showError(`Download failed: ${error.message}`);
      }
    });
  }
}

// Fetch user profile and top tracks
async function fetchUserData() {
  try {
    // Show loading state
    document.querySelector('.receipt-content').innerHTML = '<div class="text-center p-4">Loading your music data...</div>';
    
    // Fetch user profile
    const userProfile = await spotifyAuth.callApi('/me');
    if (userProfile) {
      updateUserProfile(userProfile);
    }
    
    // Fetch top tracks (short_term = approximately last 4 weeks)
    const topTracks = await spotifyAuth.callApi('/me/top/tracks?limit=10&time_range=short_term');
    if (topTracks && topTracks.items && topTracks.items.length > 0) {
      updateReceiptUI(topTracks.items);
    } else {
      document.querySelector('.receipt-content').innerHTML = '<div class="text-center p-4">No recent tracks found. Try listening to more music!</div>';
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    showError(error.message);
  }
}

// Update user profile UI
function updateUserProfile(profile) {
  const nameElement = document.getElementById('user-name');
  const imageElement = document.getElementById('user-image');
  
  if (nameElement) {
    nameElement.textContent = profile.display_name || 'Music Lover';
  }
  
  if (imageElement && profile.images && profile.images.length > 0) {
    imageElement.src = profile.images[0].url;
    imageElement.alt = profile.display_name || 'Profile picture';
    
    // Fallback for image loading errors
    imageElement.onerror = function() {
      this.src = 'https://via.placeholder.com/50x50';
      console.log('Failed to load profile image, using placeholder');
    };
  }
}

// Update receipt UI with track data
function updateReceiptUI(tracks) {
  const receiptContent = document.querySelector('.receipt-content');
  if (!receiptContent) return;
  
  // Clear previous content
  receiptContent.innerHTML = '';
  
  // Update receipt date
  const dateElement = document.querySelector('.receipt-date');
  if (dateElement) {
    const now = new Date();
    dateElement.textContent = now.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Add each track to receipt
  tracks.forEach((track, index) => {
    const minutes = Math.floor(track.duration_ms / 60000);
    const seconds = ((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0');
    
    const trackElement = document.createElement('div');
    trackElement.className = 'receipt-item';
    
    trackElement.innerHTML = `
      <span>${index + 1}. ${track.name}</span>
      <span>${minutes}:${seconds}</span>
    `;
    
    // Add artist name in smaller text below
    const artistElement = document.createElement('div');
    artistElement.className = 'text-xs opacity-75 ml-4';
    artistElement.textContent = track.artists.map(artist => artist.name).join(', ');
    
    receiptContent.appendChild(trackElement);
    receiptContent.appendChild(artistElement);
  });
}

// Display error message
function showError(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  }
}

// Initialize application
async function initializeApp() {
  // Setup event listeners
  initializeUI();
  
  try {
    // Check if this is a callback from Spotify auth
    if (window.location.search.includes('code=')) {
      // Handle the authorization code
      await spotifyAuth.handleCallback();
    }
    
    // Check authentication status
    if (spotifyAuth.isAuthenticated()) {
      // Show app section, hide login section
      document.querySelector('.login-section')?.classList.add('hidden');
      document.querySelector('.app-section')?.classList.remove('hidden');
      
      // Fetch and display user data
      await fetchUserData();
    } else {
      // Show login section, hide app section
      document.querySelector('.login-section')?.classList.remove('hidden');
      document.querySelector('.app-section')?.classList.add('hidden');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Authentication error: ${error.message}`);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);