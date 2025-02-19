import { config } from './config.js';

// Constants
const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Better token management
const tokenManager = {
    getToken: () => localStorage.getItem('spotify_token'),
    setToken: (token) => {
        if (token) {
            localStorage.setItem('spotify_token', token);
            return true;
        }
        return false;
    },
    clearToken: () => {
        localStorage.removeItem('spotify_token');
    },
    isValid: () => {
        return !!localStorage.getItem('spotify_token');
    }
};

// Initialize auth
function initializeAuth() {
    const scopes = [
        'user-read-private',
        'user-read-email',
        'user-top-read'
    ].join(' '); // Changed from %20 to space

    document.getElementById('spotify-login').addEventListener('click', () => {
        // Clear any existing tokens before new login
        tokenManager.clearToken();
        
        const authUrl = new URL(SPOTIFY_AUTH_ENDPOINT);
        authUrl.searchParams.append('client_id', config.clientId);
        authUrl.searchParams.append('redirect_uri', config.redirectUri);
        authUrl.searchParams.append('scope', scopes);
        authUrl.searchParams.append('response_type', 'token');
        authUrl.searchParams.append('show_dialog', 'true');

        window.location.href = authUrl.toString();
    });
}

// Parse hash for token
function handleCallback() {
    const hash = window.location.hash
        .substring(1)
        .split('&')
        .reduce((initial, item) => {
            if (item) {
                const parts = item.split('=');
                initial[parts[0]] = decodeURIComponent(parts[1]);
            }
            return initial;
        }, {});

    // Store token if present in hash
    if (hash.access_token) {
        tokenManager.setToken(hash.access_token);
        window.location.hash = ''; // Clear hash
        return true;
    }
    return false;
}

// API call with enhanced rate limiting and caching
const apiCache = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 50;
let requestTimestamps = [];

async function callSpotifyAPI(endpoint, retries = 3) {
    const token = tokenManager.getToken();
    if (!token) {
        throw new Error('No authentication token available');
    }

    // Check cache first
    if (apiCache.has(endpoint)) {
        const { data, timestamp } = apiCache.get(endpoint);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
    }

    // Rate limiting check
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        const waitTime = RATE_LIMIT_WINDOW - (now - requestTimestamps[0]);
        showError(`Approaching rate limit. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    let delay = 2000; // Increased initial delay
    let lastError = null;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            requestTimestamps.push(Date.now());
            const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After')) || 10; // Increased default wait
                showError(`Rate limited. Waiting ${retryAfter} seconds... (${attempt + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }


            if (response.status === 401) {
                tokenManager.clearToken();
                window.location.reload();
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // Cache the response
            apiCache.set(endpoint, {
                data: data,
                timestamp: Date.now()
            });
            return data;


        } catch (error) {
            lastError = error;
            if (attempt === retries - 1) break;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }

    throw lastError;
}

// Fetch user data with caching and rate limit awareness
async function fetchUserData() {
    try {
        // Get user profile with cache check
        const profile = await callSpotifyAPI('/me');
        if (profile) {
            updateUserProfile(profile);
        }

        // Get top tracks with increased delay and cache
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
        const tracksData = await callSpotifyAPI('/me/top/tracks?limit=5&time_range=medium_term');
        if (tracksData && tracksData.items) {
            updateReceiptUI(tracksData.items);
        }
        
        // Show rate limit status
        const remainingRequests = MAX_REQUESTS_PER_WINDOW - requestTimestamps.length;
        showError(`API requests remaining: ${remainingRequests}`);

    } catch (error) {
        console.error('Error fetching data:', error);
        const errorMessage = error && error.message ? error.message : 'An unknown error occurred';
        showError(errorMessage);
    }

}

// Update profile UI
function updateUserProfile(data) {
    if (!data) return;

    const nameElement = document.getElementById('user-name');
    const imageElement = document.getElementById('user-image');
    
    // Update name
    if (nameElement) {
        nameElement.textContent = data.display_name || data.id || 'User';
    }

    // Update image
    if (imageElement) {
        const profileImage = data.images && data.images.length > 0 ? 
            data.images[0].url : 
            './assets/default-profile.png';
            
        imageElement.src = profileImage;
        imageElement.onerror = () => {
            imageElement.src = './assets/default-profile.png';
        };
    }
}

// Update receipt UI
function updateReceiptUI(tracks) {
    const receiptContent = document.querySelector('.receipt-content');
    if (!receiptContent) return;

    receiptContent.innerHTML = '';
    
    tracks.forEach((track, index) => {
        const minutes = Math.floor(track.duration_ms / 60000);
        const seconds = ((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0');
        
        const trackElement = document.createElement('div');
        trackElement.className = 'receipt-item';
        trackElement.innerHTML = `
            <div class="flex flex-col">
                <span class="font-bold">${index + 1}. ${track.name}</span>
                <span class="text-xs">${track.artists.map(artist => artist.name).join(', ')}</span>
            </div>
            <span>${minutes}:${seconds}</span>
        `;
        
        receiptContent.appendChild(trackElement);
    });

    // Update receipt date
    const now = new Date();
    const dateElement = document.querySelector('.receipt-date');
    if (dateElement) {
        dateElement.textContent = now.toLocaleString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Error display
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => errorElement.classList.add('hidden'), 5000);
    }
}

// Initialize app
function initializeApp() {
    initializeAuth();

    // Check for callback
    const isCallback = handleCallback();
    const hasToken = tokenManager.isValid();

    if (hasToken) {
        document.querySelector('.login-section')?.classList.add('hidden');
        document.querySelector('.app-section')?.classList.remove('hidden');
        fetchUserData();
    } else {
        document.querySelector('.login-section')?.classList.remove('hidden');
        document.querySelector('.app-section')?.classList.add('hidden');
    }

    // Setup logout
    document.getElementById('logout')?.addEventListener('click', () => {
        tokenManager.clearToken();
        window.location.reload();
    });

    // Setup refresh
    document.getElementById('generate-receipt')?.addEventListener('click', () => {
        if (tokenManager.isValid()) {
            fetchUserData();
        }
    });
}

// Start app
document.addEventListener('DOMContentLoaded', initializeApp);
