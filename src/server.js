import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5500;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware setup
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5500',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Route for serving the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/callback', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


// Route for token exchange
app.post('/api/token', async (req, res) => {
  try {
    const { code, code_verifier } = req.body;

    // Validate input
    if (!code || !code_verifier) {
      return res.status(400).json({ error: 'Missing code or code_verifier' });
    }

    // Parameters for Spotify API token exchange
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.REDIRECT_URI,
      code_verifier: code_verifier,
    });

    // Request token from Spotify
    const response = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // Send tokens back to client
    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token,
    });
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to authenticate with Spotify',
      details: error.response?.data || error.message
    });
  }
});

// Route for token refresh
app.post('/api/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    // Validate input
    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    // Parameters for token refresh
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    });

    // Request new access token from Spotify
    const response = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // Send new token back to client
    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      // The refresh token may or may not be returned
      refresh_token: response.data.refresh_token,
    });
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to refresh token',
      details: error.response?.data || error.message
    });
  }
});

app.get('/api/top-tracks', async (req, res) => {
  const accessToken = req.headers['authorization']?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=10', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching top tracks:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch top tracks',
      details: error.response?.data || error.message,
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Make sure to set up the correct SPOTIFY_CLIENT_ID and REDIRECT_URI in your .env file`);
});
