import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';

// Konfigurasi environment variables
dotenv.config();

// Inisialisasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// Resolve __dirname untuk ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000', // Izinkan akses dari frontend
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files dari folder public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Route untuk root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.post('/api/token', async (req, res) => {
  // Validate the access token
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  try {
    const { code, code_verifier } = req.body;

    // Validasi input
    if (!code || !code_verifier) {
      return res.status(400).json({ error: 'Missing code or code_verifier' });
    }

    // Parameter untuk Spotify API
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,
      code_verifier,
    });

    // Request token to Spotify
    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // Kirim response ke client
    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token,
    });
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Spotify' });
  }
});

app.get('/api/auth', (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&response_type=code&scope=user-read-private user-read-email`;
  res.redirect(authUrl);
});

// Middleware for token validation
app.use((req, res, next) => {
  const { access_token } = req.headers;
  if (!access_token) {
    return res.status(401).json({ error: 'Access token is required' });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack); // Added logging for errors
  res.status(500).json({ error: 'Something went wrong!' });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
