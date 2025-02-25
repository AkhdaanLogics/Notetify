// spotifyAuth.js - Complete OAuth 2.0 implementation with PKCE
export class SpotifyAuth {
    constructor(config) {
      // Configuration
      this.clientId = config.clientId;
      this.redirectUri = config.redirectUri;
      this.apiBase = 'https://api.spotify.com/v1';
      this.authEndpoint = 'https://accounts.spotify.com/authorize';
      this.tokenEndpoint = 'https://accounts.spotify.com/api/token';
      this.scopes = [
        'user-read-private',
        'user-read-email',
        'user-top-read'
      ];
      
      // Storage keys
      this.STORAGE_KEYS = {
        ACCESS_TOKEN: 'spotify_access_token',
        REFRESH_TOKEN: 'spotify_refresh_token',
        EXPIRATION: 'spotify_token_expiration',
        CODE_VERIFIER: 'spotify_code_verifier',
        STATE: 'spotify_auth_state'
      };
      
      // Bind methods
      this.login = this.login.bind(this);
      this.handleCallback = this.handleCallback.bind(this);
      this.refreshToken = this.refreshToken.bind(this);
      this.logout = this.logout.bind(this);
      this.callApi = this.callApi.bind(this);
    }
    
    // Generate random string for PKCE and state
    generateRandomString(length) {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let text = '';
      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    }
    
    // Generate code verifier (random string for PKCE)
    generateCodeVerifier() {
      return this.generateRandomString(64);
    }
    
    // Generate code challenge from verifier using SHA-256
    async generateCodeChallenge(codeVerifier) {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      
      return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
    
    // Check if token exists and is valid
    isAuthenticated() {
      const expirationTime = localStorage.getItem(this.STORAGE_KEYS.EXPIRATION);
      if (!expirationTime) return false;
      
      // Add a 5-minute buffer to ensure we don't use an about-to-expire token
      return Date.now() < (parseInt(expirationTime) - 300000);
    }
    
    // Start OAuth flow with PKCE
    async login() {
      console.log('Starting Spotify OAuth flow with PKCE...');
      
      // Generate and store PKCE code verifier
      const codeVerifier = this.generateCodeVerifier();
      localStorage.setItem(this.STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
      
      // Generate code challenge from verifier
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      // Generate random state to prevent CSRF
      const state = this.generateRandomString(16);
      localStorage.setItem(this.STORAGE_KEYS.STATE, state);
      
      // Build authorization URL with all required parameters
      const authUrl = new URL(this.authEndpoint);
      authUrl.searchParams.append('client_id', this.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', this.redirectUri);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', this.scopes.join(' '));
      authUrl.searchParams.append('show_dialog', 'true'); // Force login dialog each time
      
      // Redirect to Spotify authorization page
      console.log('Redirecting to Spotify authorization...');
      window.location.href = authUrl.toString();
    }
    
    // Handle redirect from Spotify after authorization
    async handleCallback() {
      console.log('Handling OAuth callback...');
      
      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      
      // Get stored state for verification
      const storedState = localStorage.getItem(this.STORAGE_KEYS.STATE);
      
      // Clear state from storage
      localStorage.removeItem(this.STORAGE_KEYS.STATE);
      
      // Handle errors from authorization server
      if (error) {
        console.error('Authorization error:', error);
        throw new Error(`Authorization failed: ${error}`);
      }
      
      // Validate state parameter to prevent CSRF attacks
      if (!state || state !== storedState) {
        console.error('State validation failed');
        throw new Error('State mismatch. Possible CSRF attack.');
      }
      
      // Make sure we have an authorization code
      if (!code) {
        console.error('No authorization code received');
        throw new Error('No authorization code received');
      }
      
      // Get code verifier from storage
      const codeVerifier = localStorage.getItem(this.STORAGE_KEYS.CODE_VERIFIER);
      if (!codeVerifier) {
        console.error('Code verifier not found');
        throw new Error('Code verifier not found');
      }
      
      try {
        // Exchange authorization code for tokens
        const tokenResponse = await this.exchangeCodeForToken(code, codeVerifier);
        
        // Store tokens securely
        this.storeTokens(tokenResponse);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        return tokenResponse;
      } catch (error) {
        console.error('Token exchange error:', error);
        throw error;
      }
    }
    
    // Exchange authorization code for access token
    async exchangeCodeForToken(code, codeVerifier) {
      // Create token request parameters
      const params = new URLSearchParams({
        client_id: this.clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier
      });
      
      // Token request to Spotify
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token exchange failed: ${errorData.error}`);
      }
      
      return await response.json();
    }
    
    // Store tokens securely
    storeTokens(tokenData) {
      const { access_token, refresh_token, expires_in } = tokenData;
      
      // Calculate expiration time
      const expirationTime = Date.now() + (expires_in * 1000);
      
      // Store in localStorage (could be improved with more secure storage in production)
      localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, access_token);
      localStorage.setItem(this.STORAGE_KEYS.EXPIRATION, expirationTime.toString());
      
      if (refresh_token) {
        localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
      }
      
      console.log('Tokens stored successfully, expires in:', expires_in, 'seconds');
    }
    
    // Get current access token
    getAccessToken() {
      return localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    }
    
    // Refresh the access token
    async refreshToken() {
      const refreshToken = localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) {
        console.error('No refresh token available');
        throw new Error('No refresh token available');
      }
      
      try {
        // Parameters for token refresh
        const params = new URLSearchParams({
          client_id: this.clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        });
        
        // Make refresh token request
        const response = await fetch(this.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Token refresh failed: ${errorData.error}`);
        }
        
        const tokenData = await response.json();
        this.storeTokens(tokenData);
        
        return tokenData.access_token;
      } catch (error) {
        console.error('Token refresh error:', error);
        throw error;
      }
    }
    
    // Make authenticated API call with automatic token refresh
    async callApi(endpoint, options = {}) {
      try {
        // Check if token needs refresh
        if (!this.isAuthenticated()) {
          console.log('Token expired or missing, attempting to refresh...');
          await this.refreshToken();
        }
        
        // Get current access token
        const accessToken = this.getAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated');
        }
        
        // Prepare request options
        const requestOptions = {
          method: options.method || 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options
        };
        
        // Make API call
        const response = await fetch(`${this.apiBase}${endpoint}`, requestOptions);
        
        // Handle API errors
        if (!response.ok) {
          if (response.status === 401) {
            // Try token refresh on 401 Unauthorized
            await this.refreshToken();
            // Retry the request with new token
            return this.callApi(endpoint, options);
          }
          
          const errorData = await response.json();
          throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('API call error:', error);
        throw error;
      }
    }
    
    // Logout user by clearing all stored data
    logout() {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('Logged out successfully');
    }
  }