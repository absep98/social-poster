const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');
const cors = require('cors');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Basic test route
app.get('/', (req, res) => {
  res.send("Social Poster API is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
