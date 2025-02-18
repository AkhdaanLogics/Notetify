document.addEventListener('DOMContentLoaded', function() {
    // Spotify Auth Configuration
    const clientId = process.env.SPOTIFY_CLIENT_ID || 'd3c73611110e4fb58aa1d1697e272a8e';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || window.location.origin + '/';
    const scopes = [
        'user-read-private',
        'user-read-email', 
        'user-top-read',
        'user-read-recently-played'
    ].join(' ');

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    let mobileMenu = null;

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }

    function toggleMobileMenu() {
        if (!mobileMenu) {
            createMobileMenu();
        }
        mobileMenu.classList.toggle('active');
    }

    function createMobileMenu() {
        mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'close-menu';
        closeButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        `;
        closeButton.addEventListener('click', toggleMobileMenu);
        
        const menuList = document.createElement('ul');
        menuList.innerHTML = `
            <li><a href="#" class="hover:text-green-400 transition">Beranda</a></li>
            <li><a href="#" class="hover:text-green-400 transition">Tentang</a></li>
            <li><a href="#" class="hover:text-green-400 transition">Kontak</a></li>
        `;
        
        mobileMenu.appendChild(closeButton);
        mobileMenu.appendChild(menuList);
        document.body.appendChild(mobileMenu);
    }

    // Spotify Login using Authorization Code Flow with PKCE
    const spotifyLoginBtn = document.getElementById('spotify-login');
    
    if (spotifyLoginBtn) {
        spotifyLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loginWithSpotify();
        });
    }

    async function loginWithSpotify() {
        // Generate code verifier and challenge
        const codeVerifier = generateRandomString(64);
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        
        // Store verifier in localStorage for later
        localStorage.setItem('code_verifier', codeVerifier);
        
        // Create and store state
        const state = generateRandomString(16);
        localStorage.setItem('spotify_auth_state', state);

        // Construct authorization URL
        let authUrl = 'https://accounts.spotify.com/authorize';
        authUrl += '?client_id=' + encodeURIComponent(clientId);
        authUrl += '&response_type=code';
        authUrl += '&redirect_uri=' + encodeURIComponent(redirectUri);
        authUrl += '&state=' + encodeURIComponent(state);
        authUrl += '&scope=' + encodeURIComponent(scopes);
        authUrl += '&code_challenge_method=S256';
        authUrl += '&code_challenge=' + encodeURIComponent(codeChallenge);
        
        // Redirect to Spotify's authorization page
        window.location = authUrl;
    }

    function generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    }

    async function generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    // Handle callback from Spotify Auth
    async function handleCallback() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const storedState = localStorage.getItem('spotify_auth_state');
        const codeVerifier = localStorage.getItem('code_verifier');
        
        // Clear stored auth state
        localStorage.removeItem('spotify_auth_state');
        localStorage.removeItem('code_verifier');
        
        // Verify state
        if (state !== storedState) {
            showError('Authentication error: State mismatch');
            return;
        }
        
        // Exchange authorization code for access token
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: redirectUri,
                    code_verifier: codeVerifier,
                }),
            });
            
            if (!response.ok) {
                throw new Error('HTTP status ' + response.status);
            }
            
            const data = await response.json();
            processTokenResponse(data);
            
        } catch (error) {
            showError('Error exchanging code for token: ' + error);
        }
    }

    function processTokenResponse(data) {
        // Save tokens - in a real app, consider more secure storage options
        const tokenExpiry = new Date().getTime() + (data.expires_in * 1000);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('token_expiry', tokenExpiry);
        
        // Fetch user profile
        fetchUserProfile(data.access_token);
    }

    async function fetchUserProfile(accessToken) {
        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, try to refresh
                    await refreshAccessToken();
                    return;
                }
                throw new Error('HTTP status ' + response.status);
            }
            
            const profile = await response.json();
            console.log('User profile:', profile);
            
            // Redirect to dashboard or show successful login UI
            showUserInterface(profile);
            
            return profile;
            
        } catch (error) {
            showError('Error fetching user profile: ' + error);
        }
    }

    async function refreshAccessToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
            // If no refresh token, redirect to login
            loginWithSpotify();
            return;
        }
        
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: clientId
                })
            });
            
            if (!response.ok) {
                throw new Error('HTTP status ' + response.status);
            }
            
            const data = await response.json();
            
            // Update stored tokens
            const tokenExpiry = new Date().getTime() + (data.expires_in * 1000);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('token_expiry', tokenExpiry);
            
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }
            
            // Retry fetching user profile
            fetchUserProfile(data.access_token);
            
        } catch (error) {
            showError('Error refreshing token: ' + error);
            // Clear tokens and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token_expiry');
            loginWithSpotify();
        }
    }

    function showUserInterface(profile) {
        // Show main app UI, hide login button
        const loginSection = document.querySelector('.login-section');
        const appSection = document.querySelector('.app-section');
        
        if (loginSection) loginSection.classList.add('hidden');
        if (appSection) {
            appSection.classList.remove('hidden');
            
            // Set user display name
            const userNameElement = document.getElementById('user-name');
            if (userNameElement && profile.display_name) {
                userNameElement.textContent = profile.display_name;
            }
            
            // Set user profile image if available
            const userImageElement = document.getElementById('user-image');
            if (userImageElement && profile.images && profile.images.length > 0) {
                userImageElement.src = profile.images[0].url;
                userImageElement.alt = profile.display_name + "'s profile picture";
            }
            
            // Now fetch top tracks and create receipt
            fetchTopTracks();
        }
    }

    async function fetchTopTracks() {
        console.log('Fetching top tracks...');
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            console.error('No access token found');
            showError('No access token found');
            return;
        }
        
        try {
            const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term', {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    await refreshAccessToken();
                    return;
                }
                throw new Error('HTTP status ' + response.status);
            }
            
            const data = await response.json();
            
            // Fetch user profile for the header
            const profile = await fetchUserProfile(accessToken);
            
            // Update the receipt header
            updateReceiptHeader(profile);
            
            // Create the receipt with tracks
            createReceipt(data.items);
            
        } catch (error) {
            showError('Error fetching top tracks: ' + error);
        }
    }

    function updateReceiptHeader(profile) {
        const receiptHeader = document.querySelector('.receipt-header');
        if (receiptHeader && profile && profile.display_name) {
            receiptHeader.innerHTML = `
                <h2 class="text-xl font-bold">NOTETIFY</h2>
                <p>${profile.display_name}'s Top Tracks</p>
                <p class="receipt-date"></p>
            `;
        }
    }

    function createReceipt(tracks) {
        console.log('Creating receipt with tracks:', tracks);
        const receiptContent = document.querySelector('.receipt-content');
        if (!receiptContent) {
            console.error('Receipt content container not found');
            return;
        }
        
        // Clear existing content
        receiptContent.innerHTML = '';
        
        // Calculate total duration
        let totalDurationMs = 0;
        
        // Add each track to receipt
        tracks.forEach((track, index) => {
            totalDurationMs += track.duration_ms;
            const minutes = Math.floor(track.duration_ms / 60000);
            const seconds = ((track.duration_ms % 60000) / 1000).toFixed(0);
            const duration = `${minutes}:${seconds.padStart(2, '0')}`;
            
            const artists = track.artists.map(artist => artist.name).join(', ');
            
            const item = document.createElement('div');
            item.className = 'receipt-item';
            item.innerHTML = `
                <div class="flex flex-col">
                    <span class="font-bold">${index + 1}. ${track.name}</span>
                    <span class="text-xs">${artists}</span>
                </div>
                <span>${duration}</span>
            `;
            
            receiptContent.appendChild(item);
        });
        
        // Add a separator
        const separator = document.createElement('div');
        separator.className = 'my-4 border-t-2 border-dashed';
        receiptContent.appendChild(separator);
        
        // Add total duration
        const totalMinutes = Math.floor(totalDurationMs / 60000);
        const totalSeconds = ((totalDurationMs % 60000) / 1000).toFixed(0);
        const totalDuration = `${totalMinutes}:${totalSeconds.padStart(2, '0')}`;
        
        const totalItem = document.createElement('div');
        totalItem.className = 'receipt-item font-bold';
        totalItem.innerHTML = `
            <span>TOTAL DURATION</span>
            <span>${totalDuration}</span>
        `;
        receiptContent.appendChild(totalItem);
        
        // Set receipt date
        const currentDate = new Date();
        const dateString = currentDate.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const timeString = currentDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const receiptDate = document.querySelector('.receipt-date');
        if (receiptDate) {
            receiptDate.textContent = `${dateString} ${timeString}`;
        }
        
        // Show receipt
        const receiptCard = document.querySelector('.receipt-card');
        if (receiptCard) {
            console.log('Showing receipt card');
            receiptCard.style.display = 'block';
            receiptCard.classList.remove('hidden');
        } else {
            console.error('Receipt card element not found');
        }
    }

    function showError(message) {
        console.error(message);
        
        // Show error message to user
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                errorElement.classList.add('hidden');
            }, 5000);
        }
    }

    // Set up the Generate Receipt button
    const generateReceiptBtn = document.getElementById('generate-receipt');
    if (generateReceiptBtn) {
        generateReceiptBtn.addEventListener('click', fetchTopTracks);
    }

    // Set up the Download Receipt button
    const downloadReceiptBtn = document.getElementById('download-receipt');
    if (downloadReceiptBtn) {
        downloadReceiptBtn.addEventListener('click', downloadReceipt);
    }

    // Function to download receipt as image
    function downloadReceipt() {
        const receiptCard = document.querySelector('.receipt-card');
        if (!receiptCard) return;
        
        html2canvas(receiptCard).then(canvas => {
            const link = document.createElement('a');
            link.download = 'my-spotify-receipt.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    // Check if we're at the callback URL with a code parameter
    if (window.location.search.includes('code=')) {
        handleCallback();
    }
    // Check if we have a valid token and show appropriate UI
    else {
        const accessToken = localStorage.getItem('access_token');
        const tokenExpiry = localStorage.getItem('token_expiry');
        
        if (accessToken && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
            fetchUserProfile(accessToken);
        }
    }
});
