const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const tokenRouter = require('./api/token'); // Import the token exchange route

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/token', tokenRouter); // Use the token exchange route

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
