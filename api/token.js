const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const { clientId, clientSecret, redirectUri } = require('../js/config'); // Updated path to config


router.post('/', async (req, res) => {
    const { code } = req.body;

    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
    });

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });

        const data = await response.json();
        if (response.ok) {
            res.json(data);
        } else {
            res.status(response.status).json({ error: data.error });
        }
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
