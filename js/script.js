import { ReceiptCapture } from './html2canvas.js';

function logout() {
    // Logic for logout
    alert('You have logged out.');
    // Redirect to login page or clear session
}

// Configuration from window object or defaults
const config = {
    clientId: 'd3c73611110e4fb58aa1d1697e272a8e',
    redirectUri: 'http://127.0.0.1:5500',
};

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
    ].join(' ');
    
    document.getElementById('spotify-login').addEventListener('click', () => {
        tokenManager.clearToken();
        
        const authUrl = new URL(SPOTIFY_AUTH_ENDPOINT);
        authUrl.searchParams.append('client_id', config.clientId);
        authUrl.searchParams.append('redirect_uri', config.redirectUri);
        authUrl.searchParams.append('scope', scopes);
        authUrl.searchParams.append('response_type', 'token');
        authUrl.searchParams.append('show_dialog', 'true');
        // Tambahkan ini
        authUrl.searchParams.append('state', 'spotify_auth_state');

        window.location.href = authUrl.toString();
    });
}

// API call with enhanced rate limiting and caching
const apiCache = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 50;
let requestTimestamps = [];

async function callSpotifyAPI(endpoint, retries = 3) {
    console.log(`🔍 Attempting to call API endpoint: ${endpoint}`);
    console.log(`🎫 Current token: ${tokenManager.getToken()?.substring(0, 10)}...`);

    const token = tokenManager.getToken();
    if (!token) {
        console.error('❌ No token found');
        throw new Error('No authentication token available');
    }

    // Check cache first
    if (apiCache.has(endpoint)) {
        console.log(`📦 Found cached data for ${endpoint}`);
        const { data, timestamp } = apiCache.get(endpoint);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
    }

    let delay = 2000;
    let lastError = null;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            console.log(`📡 API Request attempt ${attempt + 1}/${retries}`);
            
            const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`📥 Response status: ${response.status}`);
            const responseText = await response.text();
            console.log(`📄 Raw response:`, responseText);

            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After')) || 10;
                console.warn(`⚠️ Rate limited. Waiting ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }

            if (response.status === 401) {
                console.error('❌ Token expired or invalid');
                tokenManager.clearToken();
                window.location.reload();
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = JSON.parse(responseText);
            console.log(`✅ Parsed data:`, data);
            
            apiCache.set(endpoint, {
                data: data,
                timestamp: Date.now()
            });
            return data;

        } catch (error) {
            console.error(`❌ Attempt ${attempt + 1} failed:`, error);
            lastError = error;
            if (attempt === retries - 1) break;
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }

    throw lastError;
}

async function fetchUserData() {
    console.log('🚀 Starting fetchUserData');
    try {
        console.log('👤 Fetching user profile...');
        const profile = await callSpotifyAPI('/me');
        console.log('👤 Profile data:', profile);
        
        if (profile) {
            console.log('🔄 Updating user profile UI');
            updateUserProfile(profile);
        }

        console.log('🎵 Fetching top tracks...');
        const tracksData = await callSpotifyAPI('/me/top/tracks?limit=5&time_range=short_term');
        console.log('🎵 Tracks data:', tracksData);
        
        if (tracksData && tracksData.items) {
            console.log('🔄 Updating receipt UI with tracks');
            console.log('📝 Track items:', tracksData.items);
            updateReceiptUI(tracksData.items);
        } else {
            console.warn('⚠️ No tracks data available');
        }

    } catch (error) {
        console.error('❌ Error in fetchUserData:', error);
        const errorMessage = error?.message || 'An unknown error occurred';
        showError(errorMessage);
    }
}

// Tambahkan debugging untuk token initialization
function handleCallback() {
    console.log('🔍 Checking URL hash for token');
    console.log('📍 Current hash:', window.location.hash);
    
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

    console.log('🎫 Parsed hash:', hash);

    if (hash.access_token) {
        console.log('✅ Token found in hash');
        tokenManager.setToken(hash.access_token);
        window.location.hash = '';
        return true;
    }
    console.log('❌ No token found in hash');
    return false;
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
        // Di script.js, updateUserProfile()
        imageElement.onerror = function() {
            this.src = 'https://via.placeholder.com/50x50'; // Fallback URL
            console.error('Failed to load profile image');
        };
    }
}

// Update receipt UI
function updateReceiptUI(tracks) {
    console.log('Updating receipt with tracks:', tracks);

    // 1. Pastikan app section terlihat
    const appSection = document.querySelector('.app-section');
    appSection?.classList.remove('hidden');
    
    // 2. Pastikan receipt card terlihat dengan style yang tepat
    const receiptCard = document.querySelector('.receipt-card');
    if (receiptCard) {
        receiptCard.style.display = 'block';
        receiptCard.style.visibility = 'visible';
        receiptCard.style.opacity = '1';
    }

    const receiptContent = document.querySelector('.app-section .receipt-content');
    if (!receiptContent) return;

    // 3. Bersihkan dan set style dasar
    receiptContent.innerHTML = '';
    receiptContent.style.display = 'block';
    receiptContent.style.minHeight = '200px';
    receiptContent.style.width = '100%';
    
    tracks.forEach((track, index) => {
        const minutes = Math.floor(track.duration_ms / 60000);
        const seconds = ((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0');
        
        const trackElement = document.createElement('div');
        trackElement.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 8px 0;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            width: 100%;
        `;
        
        trackElement.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 4px;">
                    ${(index + 1).toString().padStart(2, '0')}. ${track.name}
                </div>
                <div style="font-size: 12px; opacity: 0.75;">
                    ${track.artists[0].name}
                </div>
            </div>
            <div style="margin-left: 16px;">
                ${minutes}:${seconds}
            </div>
        `;
        
        receiptContent.appendChild(trackElement);
    });

    // 4. Update receipt date
    const dateElem = document.querySelector('.receipt-date');
    if (dateElem) {
        dateElem.textContent = new Date().toLocaleDateString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    if (tracks.length === 0) {
        receiptContent.innerHTML = `<div class="text-center">Belum ada data track yang tersedia</div>`;
        return;
    }
    console.log('Track count:', tracks.length);
    console.log('First track:', tracks[0]);
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

    console.log('Token status:', { isCallback, hasToken }); // Debug line

    if (hasToken) {
        console.log('Has token, showing app section'); // Debug line
        const loginSection = document.querySelector('.login-section');
        const appSection = document.querySelector('.app-section');
        
        if (loginSection && appSection) {
            loginSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            fetchUserData();
        } else {
            console.error('Sections not found:', { loginSection, appSection });
        }
    } else {
        console.log('No token, showing login section'); // Debug line
        document.querySelector('.login-section')?.classList.remove('hidden');
        document.querySelector('.app-section')?.classList.add('hidden');
    }
}
// Start app
document.addEventListener('DOMContentLoaded', initializeApp);
