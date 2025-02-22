const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const app = express();
const port = 5500; // Set the port to 5500

// Replace with your actual Client ID and Client Secret
const clientId = 'd3c73611110e4fb58aa1d1697e272a8e';
const clientSecret = '45e058b4371640dcb7169c694a09505f';
const redirectUri = 'http://localhost:5500/callback';

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Route to handle Spotify login
app.get('/login', (req, res) => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user-top-read`;
    res.redirect(authUrl); // Redirect to Spotify for authorization
});

// Callback route
app.get('/callback', async (req, res) => {
    const code = req.query.code; // Get the authorization code from the query parameters

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const accessToken = response.data.access_token;
        res.send('Access Token: ' + accessToken);
    } catch (error) {
        console.error('Error exchanging code for access token:', error.response ? error.response.data : error.message);
        res.status(500).send('Error exchanging code for access token: ' + (error.response ? error.response.data : error.message));
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
