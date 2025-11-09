// Restaurant Data
const restaurants = {
    'burger-palace': {
        id: 'burger-palace',
        name: 'Burger Palace',
        emoji: '🍔',
        cardImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
        cuisine: 'American',
        rating: 4.5,
        deliveryTime: '25-30 mins',
        categories: [
            {
                name: 'Signature Burgers',
                items: [
                    {
                        id: 'bp001',
                        name: 'Classic Cheeseburger',
                        description: 'Juicy beef patty with melted cheddar, fresh lettuce, tomato, pickles, and special sauce',
                        price: 249,
                        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop',
                        vegetarian: false
                    },
                    {
                        id: 'bp002',
                        name: 'Bacon Deluxe Burger',
                        description: 'Double beef patty with crispy bacon, cheese, caramelized onions, and BBQ sauce',
                        price: 329,
                        image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&h=600&fit=crop',
                        vegetarian: false
                    },
                    {
                        id: 'bp003',
                        name: 'Mushroom Swiss Burger',
                        description: 'Beef patty topped with sautéed mushrooms, Swiss cheese, and garlic aioli',
                        price: 289,
                        image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&h=600&fit=crop',
                        vegetarian: false
                    }
                ]
            },
            {
                name: 'Sides',
                items: [
                    {
                        id: 'bp004',
                        name: 'Crispy French Fries',
                        description: 'Golden, perfectly seasoned french fries',
                        price: 99,
                        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&h=600&fit=crop',
                        vegetarian: true
                    },
                    {
                        id: 'bp005',
                        name: 'Onion Rings',
                        description: 'Crispy beer-battered onion rings with ranch dip',
                        price: 129,
                        image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Beverages',
                items: [
                    {
                        id: 'bp006',
                        name: 'Classic Milkshake',
                        description: 'Creamy vanilla, chocolate, or strawberry milkshake',
                        price: 149,
                        image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            }
        ]
    },
    'pizza-corner': {
        id: 'pizza-corner',
        name: 'Pizza Corner',
        emoji: '🍕',
        cardImage: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=400&h=300&fit=crop',
        cuisine: 'Italian',
        rating: 4.7,
        deliveryTime: '30-35 mins',
        categories: [
            {
                name: 'Classic Pizzas',
                items: [
                    {
                        id: 'pc001',
                        name: 'Margherita Pizza',
                        description: 'Authentic Italian pizza with fresh mozzarella, tomato sauce, and basil',
                        price: 299,
                        image: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=800&h=600&fit=crop',
                        vegetarian: true
                    },
                    {
                        id: 'pc002',
                        name: 'Pepperoni Pizza',
                        description: 'Classic pizza loaded with pepperoni slices and extra cheese',
                        price: 349,
                        image: 'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=800&h=600&fit=crop',
                        vegetarian: false
                    },
                    {
                        id: 'pc003',
                        name: 'Quattro Formaggi',
                        description: 'Four cheese pizza with mozzarella, gorgonzola, parmesan, and fontina',
                        price: 379,
                        image: 'https://images.unsplash.com/photo-1598021680135-2d835b62f728?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Specialty Pizzas',
                items: [
                    {
                        id: 'pc004',
                        name: 'Vegetarian Supreme',
                        description: 'Bell peppers, mushrooms, olives, onions, and fresh vegetables',
                        price: 329,
                        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Beverages',
                items: [
                    {
                        id: 'pc005',
                        name: 'Italian Soda',
                        description: 'Refreshing fruit-flavored sparkling beverage',
                        price: 99,
                        image: 'https://images.unsplash.com/photo-1527960669845-97b3bb7a9f5a?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            }
        ]
    },
    'chinese-garden': {
        id: 'chinese-garden',
        name: 'Chinese Garden',
        emoji: '🥡',
        cardImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
        cuisine: 'Chinese',
        rating: 4.6,
        deliveryTime: '20-25 mins',
        categories: [
            {
                name: 'Rice & Noodles',
                items: [
                    {
                        id: 'cg001',
                        name: 'Vegetable Fried Rice',
                        description: 'Authentic Chinese fried rice with mixed vegetables, eggs, and soy sauce',
                        price: 199,
                        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=600&fit=crop',
                        vegetarian: false
                    },
                    {
                        id: 'cg002',
                        name: 'Hakka Noodles',
                        description: 'Stir-fried noodles with vegetables in Chinese sauces',
                        price: 219,
                        image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&h=600&fit=crop',
                        vegetarian: true
                    },
                    {
                        id: 'cg003',
                        name: 'Schezwan Fried Rice',
                        description: 'Spicy fried rice with schezwan sauce and vegetables',
                        price: 229,
                        image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Main Dishes',
                items: [
                    {
                        id: 'cg004',
                        name: 'Sweet & Sour Chicken',
                        description: 'Crispy chicken in tangy sweet and sour sauce with bell peppers and pineapple',
                        price: 289,
                        image: 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=800&h=600&fit=crop',
                        vegetarian: false
                    },
                    {
                        id: 'cg005',
                        name: 'Spring Rolls (6 pcs)',
                        description: 'Crispy golden spring rolls filled with vegetables and served with sweet chili sauce',
                        price: 159,
                        image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Soups',
                items: [
                    {
                        id: 'cg006',
                        name: 'Hot & Sour Soup',
                        description: 'Traditional Chinese soup with mushrooms, tofu, and a spicy-sour broth',
                        price: 149,
                        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Beverages',
                items: [
                    {
                        id: 'cg007',
                        name: 'Chinese Green Tea',
                        description: 'Authentic traditional Chinese green tea served hot',
                        price: 79,
                        image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&h=600&fit=crop',
                        vegetarian: true
                    },
                    {
                        id: 'cg008',
                        name: 'Jasmine Tea',
                        description: 'Fragrant jasmine tea with delicate floral notes',
                        price: 89,
                        image: 'https://images.unsplash.com/photo-1597318130293-c8c5f0b6c6c5?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            }
        ]
    },
    'spice-of-india': {
        id: 'spice-of-india',
        name: 'Spice of India',
        emoji: '🍛',
        cardImage: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&h=300&fit=crop',
        cuisine: 'Indian',
        rating: 4.8,
        deliveryTime: '30-40 mins',
        categories: [
            {
                name: 'Biryanis',
                items: [
                    {
                        id: 'si001',
                        name: 'Hyderabadi Chicken Biryani',
                        description: 'Aromatic basmati rice layered with tender chicken, spices, and saffron',
                        price: 299,
                        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&h=600&fit=crop',
                        vegetarian: false
                    },
                    {
                        id: 'si002',
                        name: 'Vegetable Biryani',
                        description: 'Fragrant rice with mixed vegetables, herbs, and aromatic spices',
                        price: 249,
                        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Curries',
                items: [
                    {
                        id: 'si003',
                        name: 'Butter Chicken',
                        description: 'Tender chicken in rich, creamy tomato-based gravy with butter and cream',
                        price: 329,
                        image: 'https://images.unsplash.com/photo-1565557623262-b27e252489a1?w=800&h=600&fit=crop',
                        vegetarian: false
                    },
                    {
                        id: 'si004',
                        name: 'Paneer Tikka Masala',
                        description: 'Grilled cottage cheese cubes in spiced tomato-cream sauce',
                        price: 279,
                        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&h=600&fit=crop',
                        vegetarian: true
                    },
                    {
                        id: 'si005',
                        name: 'Dal Makhani',
                        description: 'Creamy black lentils slow-cooked with butter and spices',
                        price: 199,
                        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Tandoori',
                items: [
                    {
                        id: 'si006',
                        name: 'Tandoori Chicken',
                        description: 'Marinated chicken grilled in clay oven with Indian spices',
                        price: 349,
                        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&h=600&fit=crop',
                        vegetarian: false
                    }
                ]
            },
            {
                name: 'Appetizers',
                items: [
                    {
                        id: 'si007',
                        name: 'Samosa (2 pcs)',
                        description: 'Crispy pastry filled with spiced potatoes and peas',
                        price: 79,
                        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Breads',
                items: [
                    {
                        id: 'si008',
                        name: 'Butter Naan',
                        description: 'Soft leavened bread brushed with butter',
                        price: 49,
                        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=600&fit=crop',
                        vegetarian: true
                    },
                    {
                        id: 'si009',
                        name: 'Garlic Naan',
                        description: 'Naan topped with fresh garlic and cilantro',
                        price: 59,
                        image: 'https://images.unsplash.com/photo-1619158401362-c0a0e0900e0e?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            },
            {
                name: 'Beverages',
                items: [
                    {
                        id: 'si010',
                        name: 'Mango Lassi',
                        description: 'Sweet and creamy yogurt-based mango drink',
                        price: 99,
                        image: 'https://images.unsplash.com/photo-1623680737816-0b56dc6d6fa6?w=800&h=600&fit=crop',
                        vegetarian: true
                    },
                    {
                        id: 'si011',
                        name: 'Masala Chai',
                        description: 'Aromatic Indian spiced tea with milk',
                        price: 49,
                        image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&h=600&fit=crop',
                        vegetarian: true
                    }
                ]
            }
        ]
    }
};
