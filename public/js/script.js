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
  console.log('Initializing UI components');

  // Setup login button
  const loginButton = document.getElementById('spotify-login');
  if (loginButton) {
    loginButton.addEventListener('click', async () => {
      console.log('Login button clicked');
      try {
        await spotifyAuth.login();
      } catch (error) {
        showError(`Login failed: ${error.message}`);
      }
    });
  } else {
    console.error('Login button not found');
  }

  // Setup generate receipt button
  const generateButton = document.getElementById('generate-receipt');
  if (generateButton) {
    generateButton.addEventListener('click', async () => {
      console.log('Generate button clicked');
      try {
        await fetchUserData();
      } catch (error) {
        showError(`Failed to generate receipt: ${error.message}`);
      }
    });
  } else {
    console.error('Generate button not found');
  }

  // Setup share popup
  const shareButton = document.getElementById('share');
  const sharePopup = document.getElementById('share-popup');
  const closeShareButton = document.getElementById('close-share-popup');

  if (shareButton && sharePopup && closeShareButton) {
    shareButton.addEventListener('click', () => {
      console.log('Share button clicked');
      sharePopup.classList.remove('hidden');
    });

    closeShareButton.addEventListener('click', () => {
      sharePopup.classList.add('hidden');
    });
  } else {
    console.error('Share elements not found');
  }

  // Setup download button
  // In script.js, update the download button setup:
  const downloadButton = document.getElementById('download-receipt');
  if (downloadButton) {
    downloadButton.addEventListener('click', async () => {
      console.log('Download button clicked');
      try {
        const receiptCapture = new ReceiptCapture();
        await receiptCapture.captureReceipt();
        if (sharePopup) {
          sharePopup.classList.add('hidden');
        }
      } catch (error) {
        showError(`Download failed: ${error.message}`);
      }
    });
  } else {
    console.error('Download button not found');
  }

    // Add logout button below the generate receipt button

  const appSection = document.querySelector('.app-section');
  if (appSection) {
    const logoutButton = document.createElement('button');
    logoutButton.textContent = 'Logout';
    logoutButton.className = 'spotify-btn mt-4';
    logoutButton.style.backgroundColor = '#e74c3c'; // Red color
    logoutButton.addEventListener('click', () => {
      console.log('Logout button clicked');
      spotifyAuth.logout();
      window.location.reload();
    });

    // Add logout button to the document
    const buttonContainer = document.createElement('div'); // Container for buttons

    buttonContainer.className = 'mt-4 text-center';
    buttonContainer.appendChild(logoutButton);
    appSection.appendChild(buttonContainer); // Append button container to app section
  }
  // In script.js, add these handlers

  // Setup WhatsApp share button
  const whatsAppButton = document.getElementById('share-whatsapp');
  if (whatsAppButton) {
    whatsAppButton.addEventListener('click', async () => {
      try {
        const receiptCapture = new ReceiptCapture();
        const imageUrl = await receiptCapture.captureReceipt();
        
        // Since we can't directly share an image via URL, we'll share a text message
        const text = encodeURIComponent('Check out my Notetify music receipt!');
        window.open(`https://wa.me/?text=${text}`, '_blank');
        
        if (sharePopup) {
          sharePopup.classList.add('hidden');
        }
      } catch (error) {
        showError(`WhatsApp sharing failed: ${error.message}`);
      }
    });
  }

  // Setup Instagram share button
  const instagramButton = document.getElementById('share-instagram');
  if (instagramButton) {
    instagramButton.addEventListener('click', () => {
      // Instagram doesn't support direct sharing via web links
      // Inform the user to download and share manually
      alert('To share on Instagram: \n1. Download your receipt first \n2. Open Instagram \n3. Create a new post or story with the downloaded image');
      
      // Trigger download
      const downloadButton = document.getElementById('download-receipt');
      if (downloadButton) {
        downloadButton.click();
      }
    });
  }
}

// Fetch user profile and top tracks
async function fetchUserData() {
  console.log('Fetching user data...');

  try {
    // Get receipt content element
    const receiptContent = document.querySelector('.receipt-content');
    if (!receiptContent) {
      console.error('Receipt content element not found');
      showError('Receipt content element not found');
      return;
    }

    // Show loading state
    receiptContent.innerHTML = '<div class="text-center p-4">Loading your music data...</div>';

    // Fetch user profile
    console.log('Fetching user profile...');
    const userProfile = await spotifyAuth.callApi('/me');
    console.log('User profile fetched:', userProfile);

    if (userProfile) {
      updateUserProfile(userProfile);
    }

    // Fetch top tracks (short_term = approximately last 4 weeks)
    console.log('Fetching top tracks...');
    const topTracks = await spotifyAuth.callApi('/me/top/tracks?limit=5&time_range=short_term');
    console.log('Top tracks response:', topTracks);

    if (topTracks && topTracks.items && topTracks.items.length > 0) {
      console.log(`Found ${topTracks.items.length} tracks, updating UI`);
      updateReceiptUI(topTracks.items);

      // Make sure receipt card is visible
      const receiptCard = document.querySelector('.receipt-card');
      if (receiptCard) {
        receiptCard.classList.remove('hidden');
      } else {
        console.error('Receipt card element not found');
      }
    } else {
      console.warn('No tracks found in response');
      receiptContent.innerHTML = '<div class="text-center p-4">No recent tracks found. Try listening to more music!</div>';
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    showError(`Failed to fetch top tracks: ${error.message}`);
  }
}

// Update user profile UI
function updateUserProfile(profile) {
  console.log('Updating user profile UI');

  const nameElement = document.getElementById('user-name');
  const imageElement = document.getElementById('user-image');

  if (nameElement) {
    nameElement.textContent = profile.display_name || 'Music Lover';
  } else {
    console.error('User name element not found');
  }

  if (imageElement && profile.images && profile.images.length > 0) {
    imageElement.src = profile.images[0].url;
    imageElement.alt = profile.display_name || 'Profile picture';

    // Fallback for image loading errors
    imageElement.onerror = function() {
      this.src = 'https://via.placeholder.com/50x50';
      console.log('Failed to load profile image, using placeholder');
    };
  } else {
    console.warn('User image element not found or no profile images available');
  }
}

// Update receipt UI with track data
function updateReceiptUI(tracks) {
  console.log('Updating receipt UI with', tracks.length, 'tracks');

  const receiptContent = document.querySelector('.receipt-content');
  if (!receiptContent) {
    console.error('Receipt content element not found');
    return;
  }

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
  } else {
    console.warn('Receipt date element not found');
  }

  // Build HTML string for receipt content
  let receiptHTML = '';

  // Add each track to receipt
  tracks.forEach((track, index) => {
    console.log(`Adding track ${index + 1}: ${track.name}`);

    const minutes = Math.floor(track.duration_ms / 60000);
    const seconds = ((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0');

    // Add track item
    receiptHTML += `
      <div class="receipt-item">
        <span>${index + 1}. ${track.name}</span>
        <span>${minutes}:${seconds}</span>
      </div>
    `;

    // Add artist name
    if (track.artists && track.artists.length > 0) {
      const artistNames = track.artists.map(artist => artist.name).join(', ');
      receiptHTML += `<div style="font-size: 0.75rem; color: #666; margin-bottom: 8px; margin-left: 8px;">${artistNames}</div>`;
    }

    // Add divider except for last item
    if (index < tracks.length - 1) {
      receiptHTML += `<div style="width: 100%; border-bottom: 1px dashed #ccc; margin: 4px 0;"></div>`;
    }
  });

  // Add total section
  const totalDurationMs = tracks.reduce((total, track) => total + track.duration_ms, 0);
  const totalMinutes = Math.floor(totalDurationMs / 60000);
  const totalSeconds = ((totalDurationMs % 60000) / 1000).toFixed(0).padStart(2, '0');

  receiptHTML += `
    <div style="margin-top: 16px; padding-top: 10px; border-top: 1px dashed #000;">
      <div class="receipt-item" style="font-weight: bold;">
        <span>TOTAL TRACKS</span>
        <span>${tracks.length}</span>
      </div>
      <div class="receipt-item" style="font-weight: bold;">
        <span>TOTAL DURATION</span>
        <span>${totalMinutes}:${totalSeconds}</span>
      </div>
    </div>
  `;

  // Add barcode
  receiptHTML += `
    <div style="margin-top: 16px; text-align: center;">
      <svg width="80%" height="50px" viewBox="0 0 100 20" style="margin: 0 auto; display: block;">
        ${Array.from({length: 20}, (_, i) => 
          `<rect x="${i * 5}" y="0" width="${Math.random() > 0.5 ? 3 : 2}" height="20" fill="black" />`
        ).join('')}
      </svg>
      <div style="font-size: 0.75rem; opacity: 0.75; margin-top: 8px;">${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}</div>
    </div>
  `;

  // Set the HTML content directly
  receiptContent.innerHTML = receiptHTML;

  // Show share button if it exists
  const shareButton = document.getElementById('share');
  if (shareButton) {
    shareButton.classList.remove('hidden');
  }
}

// Display error message
function showError(message) {
  console.error('Error:', message);

  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');

    // Hide after 5 seconds
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  } else {
    // Fallback if error element doesn't exist
    alert(`Error: ${message}`);
  }
}

// For testing purposes - can be called directly to test receipt layout
function testReceiptDisplay() {
  const receiptContent = document.querySelector('.receipt-content');
  if (!receiptContent) {
    console.error('Receipt content element not found');
    return;
  }
  
  // Hard-coded test content
  receiptContent.innerHTML = `
    <div class="receipt-item">
      <span>1. Test Song</span>
      <span>3:45</span>
    </div>
    <div style="font-size: 0.75rem; color: #666; margin-bottom: 8px; margin-left: 8px;">Test Artist</div>
    <div style="width: 100%; border-bottom: 1px dashed #ccc; margin: 4px 0;"></div>
    
    <div class="receipt-item">
      <span>2. Another Song</span>
      <span>4:20</span>
    </div>
    <div style="font-size: 0.75rem; color: #666; margin-bottom: 8px; margin-left: 8px;">Another Artist</div>
  `;
}

// Initialize application
async function initializeApp() {
  console.log('Initializing application...');

  // Setup event listeners
  initializeUI();

  try {
    // Check if this is a callback from Spotify auth
    if (window.location.search.includes('code=')) {
      console.log('Detected authorization code in URL, handling callback...');
      // Handle the authorization code
      await spotifyAuth.handleCallback();
      console.log('Callback handled successfully');
    }

    // Check authentication status
    if (spotifyAuth.isAuthenticated()) {
      console.log('User is authenticated, showing app section');

      // Show app section, hide login section
      const loginSection = document.querySelector('.login-section');
      const appSection = document.querySelector('.app-section');

      if (loginSection) {
        loginSection.classList.add('hidden');
      }

      if (appSection) {
        appSection.classList.remove('hidden');
      }

      // Fetch and display user data
      await fetchUserData();
    } else {
      console.log('User is not authenticated, showing login section');

      // Show login section, hide app section
      const loginSection = document.querySelector('.login-section');
      const appSection = document.querySelector('.app-section');

      if (loginSection) {
        loginSection.classList.remove('hidden');
      }

      if (appSection) {
        appSection.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Authentication error: ${error.message}`);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
