require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/restaurants', require('./src/routes/restaurantRoutes'));
app.use('/api/orders', require('./src/routes/orderRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/location', require('./src/routes/locationRoutes'));
app.use('/api/restaurant-owner', require('./src/routes/restaurantOwnerRoutes'));

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'QuickServe API is running',
        timestamp: new Date().toISOString()
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connected successfully');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`\nServer running on http://localhost:${PORT}`);
        console.log(`Health Check: http://localhost:${PORT}/api/health`);
        console.log(`Test Login: POST http://localhost:${PORT}/api/auth/login\n`);
    });
})
.catch((error) => {
    console.error('MongoDB connection error:', error.message);
    console.error('Make sure MongoDB is running on your system');
    process.exit(1);
});