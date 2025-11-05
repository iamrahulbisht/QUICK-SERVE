require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// Import restaurant data from frontend
const restaurants = {
    burgerPalace: {
        id: "burgerPalace",
        name: "Burger Palace",
        emoji: "🍔",
        cardImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
        cuisine: "American",
        rating: 4.5,
        deliveryTime: "25-30 min",
        address: "MG Road, Connaught Place, New Delhi",
        location: {
            type: "Point",
            coordinates: [77.2167, 28.6304] // [longitude, latitude] - Connaught Place, Delhi
        },
        categories: [
            {
                name: "Burgers",
                items: [
                    { id: "bp1", name: "Classic Burger", description: "Beef patty with lettuce, tomato, cheese", price: 199, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300", vegetarian: false },
                    { id: "bp2", name: "Veggie Burger", description: "Plant-based patty with fresh veggies", price: 179, image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=300", vegetarian: true },
                    { id: "bp3", name: "Double Cheese Burger", description: "Two beef patties with extra cheese", price: 249, image: "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=300", vegetarian: false }
                ]
            },
            {
                name: "Sides",
                items: [
                    { id: "bp4", name: "French Fries", description: "Crispy golden fries", price: 99, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300", vegetarian: true },
                    { id: "bp5", name: "Onion Rings", description: "Crunchy onion rings", price: 119, image: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=300", vegetarian: true }
                ]
            }
        ]
    },
    pizzaCorner: {
        id: "pizzaCorner",
        name: "Pizza Corner",
        emoji: "🍕",
        cardImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
        cuisine: "Italian",
        rating: 4.7,
        deliveryTime: "30-35 min",
        address: "Sector 29, Gurgaon, Haryana",
        location: {
            type: "Point",
            coordinates: [77.0688, 28.4595] // Gurgaon
        },
        categories: [
            {
                name: "Pizzas",
                items: [
                    { id: "pc1", name: "Margherita Pizza", description: "Classic tomato and mozzarella", price: 299, image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300", vegetarian: true },
                    { id: "pc2", name: "Pepperoni Pizza", description: "Loaded with pepperoni slices", price: 399, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300", vegetarian: false },
                    { id: "pc3", name: "Veggie Supreme", description: "Loaded with fresh vegetables", price: 349, image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96c47?w=300", vegetarian: true }
                ]
            }
        ]
    },
    spiceOfIndia: {
        id: "spiceOfIndia",
        name: "Spice of India",
        emoji: "🍛",
        cardImage: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
        cuisine: "Indian",
        rating: 4.6,
        deliveryTime: "35-40 min",
        address: "Karol Bagh, Central Delhi",
        location: {
            type: "Point",
            coordinates: [77.1925, 28.6519] // Karol Bagh, Delhi
        },
        categories: [
            {
                name: "Main Course",
                items: [
                    { id: "si1", name: "Chicken Biryani", description: "Aromatic rice with tender chicken", price: 249, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300", vegetarian: false },
                    { id: "si2", name: "Paneer Tikka Masala", description: "Cottage cheese in creamy tomato gravy", price: 229, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300", vegetarian: true },
                    { id: "si3", name: "Dal Makhani", description: "Creamy black lentils", price: 189, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300", vegetarian: true }
                ]
            },
            {
                name: "Breads",
                items: [
                    { id: "si4", name: "Butter Naan", description: "Soft Indian bread with butter", price: 49, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300", vegetarian: true },
                    { id: "si5", name: "Garlic Naan", description: "Naan with garlic and herbs", price: 59, image: "https://images.unsplash.com/photo-1619221882004-d3b61dc5b882?w=300", vegetarian: true }
                ]
            }
        ]
    }
};

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for seeding');

        // Clear existing data
        await Restaurant.deleteMany();
        await User.deleteMany();
        console.log('Cleared existing data');

        // Insert restaurants
        const restaurantData = Object.values(restaurants);
        await Restaurant.insertMany(restaurantData);
        console.log(`${restaurantData.length} restaurants seeded`);

        // Create demo users
        await User.create([
            {
                name: 'Demo User',
                email: 'user@demo.com',
                username: 'demouser',
                mobile: '9876543210',
                password: 'demo123',
                role: 'customer'
            },
            {
                name: 'Admin',
                email: 'admin@quickserve.com',
                username: 'admin',
                mobile: '9999999999',
                password: 'admin123',
                role: 'admin'
            }
        ]);
        console.log('2 users seeded');

        console.log('\nDatabase seeded successfully!');
        console.log('\nDemo Credentials:');
        console.log('Customer - username: demouser, password: demo123');
        console.log('Admin - username: admin, password: admin123\n');
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();