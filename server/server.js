const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const PORT = process.env.PORT || 5000;

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SGCEducation API' });
});

// API Routes
app.use('/api/test', require('./routes/test'));
// TODO: Add your routes here
// app.use('/api/users', require('./routes/users'));
// app.use('/api/auth', require('./routes/auth'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

