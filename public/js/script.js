import { ReceiptCapture } from './html2canvas.js';
import { config } from './config.js';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
let codeVerifier;

// PKCE Helpers
function generateCodeVerifier() {
  const array = new Uint32Array(56);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Auth Initialization
async function initializeAuth() {
    window.addEventListener('DOMContentLoaded', () => {
        document.getElementById('spotify-login').addEventListener('click', async () => {







            codeVerifier = generateCodeVerifier();





        const codeChallenge = await generateCodeChallenge(codeVerifier);

    
    localStorage.setItem('code_verifier', codeVerifier);
    
            const authUrl = new URL('https://accounts.spotify.com/authorize');






    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('scope', 'user-read-private user-read-email user-top-read');
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    
    window.location.href = authUrl.toString();
  });
}

// Token Handling
async function handleAuthCallback() {
  const params = new URLSearchParams(window.location.search);
            const code = params.get('code');






  
  if (code) {
    try {
      const codeVerifier = localStorage.getItem('code_verifier');
      
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('spotify_token')}` // Include access token
        },
        body: JSON.stringify({ code, code_verifier: codeVerifier })
      });
      
      const data = await response.json();
      localStorage.setItem('spotify_token', data.access_token);
      window.history.replaceState({}, document.title, '/');
      
      initializeApp();
    } catch (error) {
      showError('Authentication failed');
    }
  }
}

// Initialize App
function initializeApp() {
        const hasToken = localStorage.getItem('spotify_token');






  
  if (hasToken) {
    document.querySelector('.login-section').classList.add('hidden');
    document.querySelector('.app-section').classList.remove('hidden');
    fetchUserData();
  } else {
    document.querySelector('.login-section').classList.remove('hidden');
  }
}

// Error Handling
function showError(message) {
        const errorElement = document.getElementById('error-message');






  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    setTimeout(() => errorElement.classList.add('hidden'), 5000);
  }
}

// Start App
document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  handleAuthCallback();
  new ReceiptCapture();
});
