const getApiUrl = () => {
    const { hostname, origin } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    if (origin && origin.startsWith('http')) {
        return `${origin.replace(/\/$/, '')}/api`;
    }

    return 'https://quick-serve-7n8b.onrender.com/api';
};

const API_URL = getApiUrl();
let authToken = localStorage.getItem('authToken') || null;

let currentUser = null;
let currentRestaurant = null;
let lastVisitedRestaurant = null;
let cart = [];
let orderMode = 'delivery'; // 'delivery' or 'dinein'
let selectedTableNumber = null;
let orders = [];
let users = [];
let userLocation = JSON.parse(localStorage.getItem('userLocation')) || null;
let restaurantBackendMap = {}; // Maps frontend restaurant ids to backend ids

const apiCall = async (endpoint, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 204 || response.status === 205) {
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        let data = null;

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) {
                throw new Error(text || `Request failed with status ${response.status}`);
            }
            throw new Error('Server returned an unexpected response format');
        }

        if (!response.ok) {
            throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        throw error;
    }
};

// Authentication Functions
function showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('signupPage').classList.add('hidden');
}

function showSignup() {
    document.getElementById('signupPage').classList.remove('hidden');
    document.getElementById('loginPage').classList.add('hidden');
}

async function login(identifier, password, selectedRole, rememberMe) {
    try {
        console.log('=== LOGIN ATTEMPT ===');
        console.log('Identifier:', identifier);
        console.log('Role Selected:', selectedRole);
        
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password, role: selectedRole })
        });
        
        console.log('Login response:', data);
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            
            console.log('Login successful. User role:', data.user.role);
            
            document.getElementById('userName').textContent = data.user.name;
            
            // Hide all pages first to prevent overlap
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('signupPage').classList.add('hidden');
            document.getElementById('restaurantOwnerSignupPage').classList.add('hidden');
            document.getElementById('mainApp').classList.add('hidden');
            document.getElementById('restaurantOwnerDashboard').classList.add('hidden');
            document.getElementById('adminPage').classList.add('hidden');
            
            if (data.user.role === 'restaurantOwner') {
                console.log('Showing restaurant owner dashboard');
                // Show restaurant owner dashboard
                document.getElementById('restaurantOwnerDashboard').classList.remove('hidden');
                await loadOwnerDashboard();
            } else {
                console.log('Showing main app for role:', data.user.role);
                // Show main app
                document.getElementById('mainApp').classList.remove('hidden');
                
                if (data.user.role === 'admin') {
                    document.getElementById('adminMenuBtn').classList.remove('hidden');
                    await loadRestaurants();
                    showAdminDashboard();
                } else {
                    document.getElementById('adminMenuBtn').classList.add('hidden');
                    await loadRestaurants();
                    checkDineInMode(); // Check if accessing via QR code
                    showHome();
                }
            }
            
            if (rememberMe) {
                localStorage.setItem('rememberedUser', JSON.stringify({
                    identifier: identifier,
                    role: selectedRole
                }));
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            return { success: true };
        }
    } catch (error) {
        console.error('=== LOGIN ERROR ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        return { success: false, error: error.message };
    }
}
async function loadCurrentUser() {
    if (!authToken) return;
    
    try {
        const response = await apiCall('/auth/me');
        if (response.success && response.data) {
            currentUser = response.data;
            
            // Hide all pages first
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('signupPage').classList.add('hidden');
            document.getElementById('restaurantOwnerSignupPage').classList.add('hidden');
            document.getElementById('mainApp').classList.add('hidden');
            document.getElementById('restaurantOwnerDashboard').classList.add('hidden');
            document.getElementById('adminPage').classList.add('hidden');
            
            if (currentUser.role === 'restaurantOwner') {
                document.getElementById('restaurantOwnerDashboard').classList.remove('hidden');
                await loadOwnerDashboard();
            } else if (currentUser.role === 'admin') {
                document.getElementById('mainApp').classList.remove('hidden');
                document.getElementById('adminMenuBtn').classList.remove('hidden');
                await loadRestaurants();
                showAdminDashboard();
            } else {
                document.getElementById('mainApp').classList.remove('hidden');
                document.getElementById('adminMenuBtn').classList.add('hidden');
                await loadRestaurants();
                showHome();
            }
        } else {
            // If user data is invalid, logout
            console.log('Invalid user data, logging out');
            logout();
        }
    } catch (error) {
        console.error('Error loading user:', error);
        // If there's an error loading user, logout
        logout();
    }
}

function showForgotPassword() {
    alert('Password reset functionality:\n\nFor Demo Account:\nEmail: user@demo.com\nUsername: demouser\nPassword: demo123\n\nFor Admin Account:\nEmail: admin@quickserve.com\nUsername: admin\nPassword: admin123');
}

function loadRememberedUser() {
    const remembered = localStorage.getItem('rememberedUser');
    if (remembered) {
        const userData = JSON.parse(remembered);
        document.getElementById('loginEmail').value = userData.identifier;
        document.getElementById('rememberMe').checked = true;
        
        // Set the correct role button
        if (userData.role === 'admin') {
            document.getElementById('loginAdminBtn').click();
        }
    }
}

async function signup(name, email, username, mobile, password, role, adminAccessCode) {
    try {
        const data = await apiCall('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, username, mobile, password, role: role || 'customer', adminAccessCode })
        });
        
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrengthBar');
    const strengthText = document.getElementById('passwordStrengthText');
    
    if (!password) {
        strengthBar.className = 'password-strength-bar';
        strengthText.textContent = '';
        return;
    }
    
    let strength = 0;
    
    // Check length
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Check for lowercase and uppercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    
    // Check for numbers
    if (/\d/.test(password)) strength++;
    
    // Check for special characters
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    // Determine strength level
    let level = '';
    if (strength <= 2) {
        level = 'weak';
        strengthText.textContent = 'Weak password';
    } else if (strength <= 3) {
        level = 'medium';
        strengthText.textContent = 'Medium password';
    } else {
        level = 'strong';
        strengthText.textContent = 'Strong password';
    }
    
    strengthBar.className = `password-strength-bar ${level}`;
    strengthText.className = `password-strength-text ${level}`;
}

function logout() {
    currentUser = null;
    authToken = null;
    cart = [];
    localStorage.removeItem('authToken');
    localStorage.removeItem('rememberedUser');
    updateCartDisplay();
    
    // Hide all possible pages/dashboards
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('restaurantOwnerDashboard').classList.add('hidden');
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('menuPage').classList.add('hidden');
    document.getElementById('checkoutPage').classList.add('hidden');
    document.getElementById('successPage').classList.add('hidden');
    document.getElementById('profilePage').classList.add('hidden');
    document.getElementById('orderHistoryPage').classList.add('hidden');
    document.getElementById('signupPage').classList.add('hidden');
    document.getElementById('restaurantOwnerSignupPage').classList.add('hidden');
    
    // Show login page
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('userDropdown').classList.remove('show');
    
    console.log('Logged out successfully');
}

// Load restaurants from API
function initializeStaticRestaurantData() {
    if (!window.restaurants) {
        window.restaurants = {};
        return;
    }

    Object.entries(restaurants).forEach(([key, restaurant]) => {
        if (!restaurant) return;

        if (!restaurant.backendId) {
            restaurant.backendId = key;
        }

        (restaurant.categories || []).forEach(category => {
            (category.items || []).forEach(item => {
                if (!item.backendId) {
                    item.backendId = item.id;
                }
            });
        });
    });
}

initializeStaticRestaurantData();

function generateFrontendRestaurantId(backendId) {
    if (!backendId) return '';
    if (backendId.includes('-')) {
        return backendId.toLowerCase();
    }
    return backendId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function normalizeRestaurantData(restaurant) {
    if (!restaurant) return null;

    const backendId = restaurant.id || restaurant._id || restaurant.backendId;
    const frontendId = generateFrontendRestaurantId(backendId);

    const normalizedCategories = (restaurant.categories || []).map(category => ({
        name: category.name,
        items: (category.items || []).map(item => {
            const backendItemId = item.id || item.backendId;
            return {
                id: backendItemId,
                backendId: backendItemId,
                name: item.name,
                description: item.description,
                price: Number(item.price) || 0,
                image: item.image,
                vegetarian: Boolean(item.vegetarian)
            };
        })
    }));

    const normalized = {
        ...restaurant,
        id: frontendId,
        backendId,
        name: restaurant.name,
        emoji: restaurant.emoji || '🍽️',
        cuisine: restaurant.cuisine || 'Multi-Cuisine',
        rating: restaurant.rating || 4.5,
        deliveryTime: restaurant.deliveryTime || '30-40 mins',
        categories: normalizedCategories
    };

    normalized.logo = convertGoogleDriveUrlForDisplay(restaurant.logo || restaurant.cardImage || '');
    normalized.cardImage = convertGoogleDriveUrlForDisplay(restaurant.cardImage || restaurant.logo || '');

    return normalized;
}

async function loadRestaurants() {
    try {
        console.log('Loading restaurants from API...');
        const data = await apiCall('/restaurants');
        if (data.success && data.data) {
            console.log('Restaurants loaded:', data.data.length);
            // Reset current restaurants map and backend map
            Object.keys(restaurants).forEach(key => delete restaurants[key]);
            restaurantBackendMap = {};

            data.data.forEach(restaurant => {
                const normalized = normalizeRestaurantData(restaurant);
                if (!normalized) return;

                restaurants[normalized.id] = normalized;
                restaurantBackendMap[normalized.id] = normalized.backendId;
                console.log('Restaurant:', normalized.name, 'Categories:', normalized.categories?.length || 0);
            });
            console.log('Total restaurants in object:', Object.keys(restaurants).length);
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        // Fall back to local data if API fails
    }
}

// Convert Google Drive URL for display (copied from owner.js for use in app.js)
function convertGoogleDriveUrlForDisplay(url) {
    if (!url) return url;
    
    // Check if it's a Google Drive link
    const drivePatterns = [
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of drivePatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            const fileId = match[1];
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        }
    }
    
    return url;
}

// Page Navigation
function showHome() {
    if (currentUser && currentUser.role === 'admin') {
        showAdminDashboard();
        return;
    }
    document.getElementById('homePage').classList.remove('hidden');
    document.getElementById('menuPage').classList.add('hidden');
    document.getElementById('checkoutPage').classList.add('hidden');
    document.getElementById('successPage').classList.add('hidden');
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('profilePage').classList.add('hidden');
    document.getElementById('orderHistoryPage').classList.add('hidden');
    
    // Clear search input and show all restaurants
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    renderRestaurants();
}

// Order Mode Functions
function selectOrderMode(mode) {
    orderMode = mode;
    
    // Update button states
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        }
    });
    
    // Show/hide table number section
    const tableSection = document.getElementById('tableNumberSection');
    if (mode === 'dinein') {
        tableSection.classList.remove('hidden');
    } else {
        tableSection.classList.add('hidden');
        selectedTableNumber = null;
    }
    
    console.log('Order mode selected:', mode);
}

function isDineInMode() {
    return orderMode === 'dinein';
}

function getDineInTable() {
    const tableSelect = document.getElementById('tableNumber');
    const tableValue = tableSelect ? tableSelect.value : selectedTableNumber;
    console.log('Getting dine-in table:', tableValue);
    return tableValue ? parseInt(tableValue) : null;
}

function showMenu(restaurantId) {
    if (currentUser && currentUser.role === 'admin') {
        return;
    }
    currentRestaurant = restaurants[restaurantId];
    lastVisitedRestaurant = restaurantId;
    
    // Reset order mode to delivery
    orderMode = 'delivery';
    selectedTableNumber = null;
    
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('menuPage').classList.remove('hidden');
    
    // Reset mode buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === 'delivery') {
            btn.classList.add('active');
        }
    });
    
    // Hide table number section
    const tableSection = document.getElementById('tableNumberSection');
    if (tableSection) {
        tableSection.classList.add('hidden');
    }
    
    renderMenu();
}

function backToMenu() {
    if (lastVisitedRestaurant && restaurants[lastVisitedRestaurant]) {
        showMenu(lastVisitedRestaurant);
    } else {
        showHome();
    }
}

function showCheckout() {
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('menuPage').classList.add('hidden');
    document.getElementById('checkoutPage').classList.remove('hidden');
    
    // Show order mode info
    const orderModeInfo = document.getElementById('orderModeInfo');
    const addressSection = document.getElementById('addressSection');
    
    if (isDineInMode()) {
        const tableNum = getDineInTable();
        if (!tableNum) {
            alert('Please select a table number before proceeding to checkout');
            backToMenu();
            return;
        }
        
        addressSection.style.display = 'none';
        orderModeInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="mode-badge dinein">🍽️ Dine-In</span>
                <span style="font-weight: 600;">Table ${tableNum}</span>
                <span style="color: var(--text-light);">|</span>
                <span style="color: var(--text-secondary);">Your order will be served at your table</span>
            </div>
        `;
    } else {
        addressSection.style.display = 'block';
        orderModeInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="mode-badge delivery">🚚 Delivery</span>
                <span style="color: var(--text-secondary);">Your order will be delivered to your address</span>
            </div>
        `;
        updateDeliveryInfo();
    }
    
    renderCheckoutSummary();
}

function showSuccess(orderId) {
    document.getElementById('checkoutPage').classList.add('hidden');
    document.getElementById('successPage').classList.remove('hidden');
    
    // Update order ID
    document.getElementById('orderIdDisplay').textContent = `Order ID: ${orderId}`;
    
    // Update success message based on order mode
    const successPage = document.getElementById('successPage');
    const messageElement = successPage.querySelector('p');
    
    if (isDineInMode()) {
        messageElement.textContent = 'Thank you for your order. Your food will be served at your table soon.';
    } else {
        messageElement.textContent = 'Thank you for your order. Your food will be delivered soon.';
    }
    
    // Clear cart after showing success
    cart = [];
    updateCartDisplay();
}

// Render Functions
function renderRestaurants() {
    const grid = document.getElementById('restaurantsGrid');
    grid.innerHTML = '';

    Object.values(restaurants).forEach(restaurant => {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        card.innerHTML = `
            <img src="${restaurant.cardImage}" alt="${restaurant.name}" class="restaurant-card-image" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="restaurant-emoji" style="display: none;">${restaurant.emoji}</div>
            <div class="restaurant-header">
                <div class="restaurant-name">${restaurant.name}</div>
                <div class="restaurant-meta">
                    <span class="rating">⭐ ${restaurant.rating}</span>
                    <span class="cuisine-badge">${restaurant.cuisine}</span>
                </div>
                <div class="restaurant-meta">
                    <span>🕒 ${restaurant.deliveryTime}</span>
                </div>
                <button class="order-btn" onclick="showMenu('${restaurant.id}')">
                    Order Now
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderMenu() {
    if (!currentRestaurant) {
        console.error('No current restaurant selected');
        return;
    }

    console.log('Rendering menu for:', currentRestaurant.name);
    console.log('Categories:', currentRestaurant.categories?.length || 0);

    // Restaurant Info
    const infoDiv = document.getElementById('restaurantInfo');
    infoDiv.innerHTML = `
        <div class="restaurant-emoji">${currentRestaurant.emoji}</div>
        <h2>${currentRestaurant.name}</h2>
        <div class="restaurant-meta">
            <span class="rating">⭐ ${currentRestaurant.rating}</span>
            <span class="cuisine-badge">${currentRestaurant.cuisine}</span>
            <span>🕒 ${currentRestaurant.deliveryTime}</span>
        </div>
    `;

    // Categories
    const categoriesDiv = document.getElementById('menuCategories');
    categoriesDiv.innerHTML = '';
    
    if (!currentRestaurant.categories || currentRestaurant.categories.length === 0) {
        console.warn('No categories found for restaurant');
        const sectionsDiv = document.getElementById('menuSections');
        sectionsDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No menu items available yet.</p>';
        return;
    }
    
    currentRestaurant.categories.forEach((category, index) => {
        console.log('Category:', category.name, 'Items:', category.items?.length || 0);
        const btn = document.createElement('button');
        btn.className = `category-btn ${index === 0 ? 'active' : ''}`;
        btn.textContent = category.name;
        btn.onclick = () => scrollToCategory(category.name);
        categoriesDiv.appendChild(btn);
    });

    // Menu Sections
    const sectionsDiv = document.getElementById('menuSections');
    sectionsDiv.innerHTML = '';
    currentRestaurant.categories.forEach(category => {
        console.log('Processing category:', category.name, 'Items array:', category.items);
        
        const section = document.createElement('div');
        section.className = 'menu-section';
        section.id = `category-${category.name.replace(/\s+/g, '-').toLowerCase()}`;
        
        const title = document.createElement('h3');
        title.textContent = category.name;
        section.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'menu-grid';

        // Check if items exist and is an array
        if (!category.items || !Array.isArray(category.items) || category.items.length === 0) {
            console.warn('No items in category:', category.name);
            const emptyMsg = document.createElement('p');
            emptyMsg.style.cssText = 'text-align: center; padding: 20px; color: #999;';
            emptyMsg.textContent = 'No items in this category yet';
            section.appendChild(emptyMsg);
            sectionsDiv.appendChild(section);
            return;
        }

        category.items.forEach(item => {
            console.log('Rendering item:', item.name, 'ID:', item.id);
            const cartItem = cart.find(c => c.itemId === item.id);
            const quantity = cartItem ? cartItem.quantity : 0;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item';
            itemDiv.innerHTML = `
                <img src="${item.image || ''}" alt="${item.name}" class="menu-item-image" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="menu-item-image-placeholder" style="display: none;">🍽️</div>
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <div class="menu-item-name">${item.name}</div>
                        <div class="veg-indicator ${item.vegetarian ? 'veg' : 'non-veg'}"></div>
                    </div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-footer">
                        <div class="menu-item-price">₹${item.price}</div>
                        <div class="item-controls">
                            ${quantity === 0 ? 
                                `<button class="add-btn" onclick="addToCart('${item.id}')">Add</button>` :
                                `<div class="quantity-controls">
                                    <button class="qty-btn" onclick="updateQuantity('${item.id}', ${quantity - 1})">-</button>
                                    <span class="qty-display">${quantity}</span>
                                    <button class="qty-btn" onclick="updateQuantity('${item.id}', ${quantity + 1})">+</button>
                                </div>`
                            }
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(itemDiv);
        });

        section.appendChild(grid);
        sectionsDiv.appendChild(section);
    });
}

// Cart Functions
function addToCart(itemId) {
    // Validate table selection for dine-in mode
    if (isDineInMode()) {
        const tableNum = getDineInTable();
        if (!tableNum) {
            alert('Please select a table number before adding items to your cart');
            // Scroll to table selection
            const tableSection = document.getElementById('tableNumberSection');
            if (tableSection) {
                tableSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
    }
    
    const item = findItemById(itemId);
    if (!item) return;

    const existingItem = cart.find(c => c.itemId === itemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            itemId: item.id,
            itemName: item.name,
            restaurantId: currentRestaurant.backendId,
            restaurantName: currentRestaurant.name,
            price: item.price,
            quantity: 1,
            image: item.image
        });
    }
    updateCartDisplay();
    renderMenu(); // Re-render to update buttons
}

function updateQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
        cart = cart.filter(item => item.itemId !== itemId);
    } else {
        const item = cart.find(c => c.itemId === itemId);
        if (item) {
            item.quantity = newQuantity;
        }
    }
    updateCartDisplay();
    renderMenu(); // Re-render to update buttons
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.itemId !== itemId);
    updateCartDisplay();
    renderCartItems();
}

function updateCartDisplay() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    document.getElementById('cartBadge').textContent = totalItems;
    document.getElementById('stickyCartTotal').textContent = totalPrice;

    const stickyCart = document.getElementById('stickyCart');
    if (totalItems > 0) {
        stickyCart.classList.add('show');
    } else {
        stickyCart.classList.remove('show');
    }

    renderCartItems();
}

function renderCartItems() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartSummaryDiv = document.getElementById('cartSummary');

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Your cart is empty</p>';
        cartSummaryDiv.innerHTML = '';
        return;
    }

    cartItemsDiv.innerHTML = '';
    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.itemName}</div>
                <div class="cart-item-restaurant">${item.restaurantName}</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateQuantity('${item.itemId}', ${item.quantity - 1})">-</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity('${item.itemId}', ${item.quantity + 1})">+</button>
                <button class="remove-item" onclick="removeFromCart('${item.itemId}')">×</button>
            </div>
        `;
        cartItemsDiv.appendChild(itemDiv);
    });

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Dine-in mode has NO delivery fee
    let deliveryFee = 0;
    if (!isDineInMode()) {
        deliveryFee = 40;
    }
    
    const total = subtotal + deliveryFee;

    cartSummaryDiv.innerHTML = `
        <div class="summary-row">
            <span>Subtotal</span>
            <span>₹${subtotal.toFixed(2)}</span>
        </div>
        ${!isDineInMode() ? `
        <div class="summary-row">
            <span>Delivery Fee</span>
            <span>₹${deliveryFee.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="summary-row total">
            <span>Total</span>
            <span>₹${total.toFixed(2)}</span>
        </div>
    `;
}

function renderCheckoutSummary() {
    const summaryDiv = document.getElementById('checkoutSummary');
    
    if (cart.length === 0) {
        summaryDiv.innerHTML = '<p>No items in cart</p>';
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Dine-in mode has no delivery fee
    let deliveryFee = 0;
    if (!isDineInMode()) {
        deliveryFee = (window.currentDeliveryData && window.currentDeliveryData.deliveryFee) 
            ? window.currentDeliveryData.deliveryFee 
            : 40;
    }
    
    const total = subtotal + deliveryFee;

    let itemsHtml = '';
    cart.forEach(item => {
        itemsHtml += `
            <div class="summary-row">
                <span>${item.itemName} × ${item.quantity}</span>
                <span>₹${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `;
    });

    summaryDiv.innerHTML = `
        <h4 style="margin-bottom: 12px;">Order Summary</h4>
        ${itemsHtml}
        ${!isDineInMode() ? `
        <div class="summary-row">
            <span>Delivery Fee</span>
            <span>₹${deliveryFee}</span>
        </div>
        ` : ''}
        <div class="summary-row total">
            <span>Total</span>
            <span>₹${total}</span>
        </div>
    `;
}

// Search Functions
function searchRestaurantsAndItems(query) {
    query = query.toLowerCase().trim();
    
    if (!query) {
        renderRestaurants(); // Show all restaurants if search is empty
        return;
    }
    
    const grid = document.getElementById('restaurantsGrid');
    grid.innerHTML = '';
    
    let resultsFound = false;
    
    Object.values(restaurants).forEach(restaurant => {
        // Check if restaurant name or cuisine matches
        const restaurantMatches = 
            restaurant.name.toLowerCase().includes(query) ||
            restaurant.cuisine.toLowerCase().includes(query);
        
        // Check if any menu items match
        let matchingItems = [];
        restaurant.categories.forEach(category => {
            category.items.forEach(item => {
                if (item.name.toLowerCase().includes(query) || 
                    item.description.toLowerCase().includes(query)) {
                    matchingItems.push(item);
                }
            });
        });
        
        // Show restaurant if it or its items match
        if (restaurantMatches || matchingItems.length > 0) {
            resultsFound = true;
            
            const card = document.createElement('div');
            card.className = 'restaurant-card';
            
            let matchInfo = '';
            if (matchingItems.length > 0) {
                matchInfo = `<div style="color: var(--success); font-size: 12px; margin-top: 8px;">
                    ✓ ${matchingItems.length} matching ${matchingItems.length === 1 ? 'item' : 'items'}
                </div>`;
            }
            
            card.innerHTML = `
                <img src="${restaurant.cardImage}" alt="${restaurant.name}" class="restaurant-card-image" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="restaurant-emoji" style="display: none;">${restaurant.emoji}</div>
                <div class="restaurant-header">
                    <div class="restaurant-name">${restaurant.name}</div>
                    <div class="restaurant-meta">
                        <span class="rating">⭐ ${restaurant.rating}</span>
                        <span class="cuisine-badge">${restaurant.cuisine}</span>
                    </div>
                    <div class="restaurant-meta">
                        <span>🕒 ${restaurant.deliveryTime}</span>
                    </div>
                    ${matchInfo}
                    <button class="order-btn" onclick="showMenu('${restaurant.id}')">
                        Order Now
                    </button>
                </div>
            `;
            grid.appendChild(card);
        }
    });
    
    if (!resultsFound) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
                <h3 style="color: var(--text-secondary); margin-bottom: 8px;">No results found</h3>
                <p style="color: var(--text-light);">Try searching for something else</p>
            </div>
        `;
    }
}

// Utility Functions
function findItemById(itemId) {
    for (const restaurant of Object.values(restaurants)) {
        for (const category of restaurant.categories) {
            const item = category.items.find(i => i.id === itemId);
            if (item) return item;
        }
    }
    return null;
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    sidebar.classList.toggle('open');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

function proceedToCheckout() {
    if (cart.length === 0) return;
    toggleCart();
    showCheckout();
}

async function placeOrder() {
    const address = document.getElementById('deliveryAddress').value.trim();
    
    console.log('=== PLACE ORDER DEBUG ===');
    console.log('Order Mode:', orderMode);
    console.log('Is Dine-In?:', isDineInMode());
    console.log('Table Number:', getDineInTable());
    console.log('Address:', address);
    
    // Skip address validation for dine-in mode
    if (!isDineInMode() && !address) {
        alert('Please enter delivery address');
        return;
    }
    
    // Validate table number for dine-in mode
    if (isDineInMode()) {
        const tableNum = getDineInTable();
        if (!tableNum) {
            alert('Please select a table number for dine-in orders');
            return;
        }
    }

    if (cart.length === 0) {
        alert('Your cart is empty. Please add items to your cart before placing an order.');
        return;
    }
    
    const paymentMethod = document.querySelector('.payment-option.selected')?.getAttribute('data-method') || 'cod';

    // Check if user is logged in
    if (!authToken) {
        alert('Please login to place an order');
        showLogin();
        return;
    }

    try {
        // Prepare order data
        const orderItems = cart.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            restaurantId: item.restaurantId
        }));

        console.log('Formatted cart items:', orderItems);

        const orderData = {
            items: orderItems,
            paymentMethod
        };
        
        // Check if dine-in mode
        if (isDineInMode()) {
            orderData.mode = 'dinein';
            orderData.tableNumber = getDineInTable();
            console.log('✅ DINE-IN ORDER - No address, no delivery fee');
            console.log('Table Number:', orderData.tableNumber);
        } else {
            orderData.mode = 'delivery';
            orderData.address = address;
            console.log('🚚 DELIVERY ORDER - Address required');
            console.log('Address:', orderData.address);
            
            // Add location coordinates if available
            if (userLocation && userLocation.latitude && userLocation.longitude) {
                orderData.latitude = userLocation.latitude;
                orderData.longitude = userLocation.longitude;
            }
        }
        
        console.log('📦 Final Order Data being sent:', JSON.stringify(orderData, null, 2));
        
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to place order');
        }

        if (data.success) {
            // Show success page with order ID
            showSuccess(data.data.orderId);
            // Hide checkout page
            document.getElementById('checkoutPage').classList.add('hidden');
        } else {
            throw new Error(data.message || 'Failed to place order');
        }
    } catch (error) {
        console.error('Order error:', error);
        alert('Error placing order: ' + (error.message || 'Please try again later'));
    }
}

function scrollToCategory(categoryName) {
    const element = document.getElementById(`category-${categoryName.replace(/\s+/g, '-').toLowerCase()}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Profile Functions
async function showProfile() {
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('menuPage').classList.add('hidden');
    document.getElementById('checkoutPage').classList.add('hidden');
    document.getElementById('successPage').classList.add('hidden');
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('profilePage').classList.remove('hidden');
    document.getElementById('orderHistoryPage').classList.add('hidden');
    document.getElementById('userDropdown').classList.remove('show');
    
    // Load user profile data
    try {
        const data = await apiCall('/auth/me');
        if (data.success && data.user) {
            document.getElementById('profileName').value = data.user.name || '';
            document.getElementById('profileEmail').value = data.user.email || '';
            document.getElementById('profileUsername').value = data.user.username || '';
            document.getElementById('profileMobile').value = data.user.mobile || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile(event) {
    event.preventDefault();
    
    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const mobile = document.getElementById('profileMobile').value.trim();
    
    const errorDiv = document.getElementById('profileError');
    const successDiv = document.getElementById('profileSuccess');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    try {
        const data = await apiCall('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, email, mobile })
        });
        
        if (data.success) {
            currentUser = data.user;
            document.getElementById('userName').textContent = data.user.name;
            successDiv.textContent = data.message || 'Profile updated successfully!';
            successDiv.classList.remove('hidden');
            
            setTimeout(() => {
                successDiv.classList.add('hidden');
            }, 3000);
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to update profile';
        errorDiv.classList.remove('hidden');
    }
}

async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    const errorDiv = document.getElementById('profileError');
    const successDiv = document.getElementById('profileSuccess');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    if (newPassword !== confirmNewPassword) {
        errorDiv.textContent = 'New passwords do not match';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (newPassword.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    try {
        const data = await apiCall('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (data.success) {
            successDiv.textContent = 'Password changed successfully!';
            successDiv.classList.remove('hidden');
            document.getElementById('passwordForm').reset();
            
            setTimeout(() => {
                successDiv.classList.add('hidden');
            }, 3000);
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to change password';
        errorDiv.classList.remove('hidden');
    }
}

// Order History Functions
async function showOrderHistory() {
    // Redirect restaurant owners to their dashboard
    if (currentUser && currentUser.role === 'restaurantOwner') {
        console.log('Restaurant owners should use the owner dashboard for orders');
        // Show the orders tab in owner dashboard
        document.getElementById('restaurantOwnerDashboard').classList.remove('hidden');
        document.getElementById('homePage').classList.add('hidden');
        document.getElementById('menuPage').classList.add('hidden');
        document.getElementById('checkoutPage').classList.add('hidden');
        document.getElementById('successPage').classList.add('hidden');
        document.getElementById('adminPage').classList.add('hidden');
        document.getElementById('profilePage').classList.add('hidden');
        document.getElementById('orderHistoryPage').classList.add('hidden');
        
        // Switch to orders tab in owner dashboard
        if (typeof showOwnerDashboardTab === 'function') {
            showOwnerDashboardTab('orders');
        }
        return;
    }
    
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('menuPage').classList.add('hidden');
    document.getElementById('checkoutPage').classList.add('hidden');
    document.getElementById('successPage').classList.add('hidden');
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('profilePage').classList.add('hidden');
    document.getElementById('orderHistoryPage').classList.remove('hidden');
    document.getElementById('userDropdown').classList.remove('show');
    
    await loadOrderHistory();
}

async function loadOrderHistory() {
    const container = document.getElementById('orderHistoryList');
    
    try {
        const data = await apiCall('/orders/my-orders');
        
        if (!data.success || data.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h3>No orders yet</h3>
                    <p>Start exploring restaurants and place your first order!</p>
                    <button class="btn" onclick="showHome()">Browse Restaurants</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        data.data.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            
            const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `
                    <div class="order-item-row">
                        <span class="order-item-name">${item.itemName}</span>
                        <span class="order-item-quantity">× ${item.quantity}</span>
                        <span class="order-item-price">₹${item.price * item.quantity}</span>
                    </div>
                `;
            });
            
            // Determine order mode badge
            const orderMode = order.mode || 'delivery';
            const modeBadge = orderMode === 'dinein' 
                ? `<span class="mode-badge dinein">🍽️ Dine-In</span>` 
                : `<span class="mode-badge delivery">🚚 Delivery</span>`;
            
            // Show appropriate location info based on mode
            let locationInfo = '';
            if (orderMode === 'dinein') {
                locationInfo = `
                    <div class="order-location">
                        <strong>Table Number:</strong> ${order.tableNumber}
                    </div>
                `;
            } else if (order.address) {
                locationInfo = `
                    <div class="order-address">
                        <strong>Delivery Address:</strong>
                        ${order.address}
                    </div>
                `;
            }
            
            orderCard.innerHTML = `
                <div class="order-card-header">
                    <div>
                        <div class="order-id">${order.orderId}</div>
                        ${modeBadge}
                        <div class="order-date">${orderDate}</div>
                    </div>
                    <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
                </div>
                
                <div class="order-items-list">
                    ${itemsHtml}
                </div>
                
                ${locationInfo}
                
                <div class="order-card-footer">
                    <span>Payment: ${order.paymentMethod.toUpperCase()}</span>
                    <span class="order-total">₹${order.total}</span>
                </div>
            `;
            
            container.appendChild(orderCard);
        });
    } catch (error) {
        console.error('Error loading order history:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Failed to load orders</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Admin Functions
function showAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Access denied. Admin only.');
        return;
    }
    
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('menuPage').classList.add('hidden');
    document.getElementById('checkoutPage').classList.add('hidden');
    document.getElementById('successPage').classList.add('hidden');
    document.getElementById('adminPage').classList.remove('hidden');
    document.getElementById('userDropdown').classList.remove('show');
    const adminBackButton = document.querySelector('#adminPage .btn');
    if (adminBackButton) {
        adminBackButton.textContent = 'Logout';
        adminBackButton.onclick = logout;
    }
    
    renderAdminStats();
    renderAdminOrders();
    switchAdminTab('orders', null);
}

function switchAdminTab(tab, evt) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    if (evt?.target) {
        evt.target.classList.add('active');
    }
    
    // Show/hide sections
    document.getElementById('adminOrders').classList.add('hidden');
    document.getElementById('adminUsers').classList.add('hidden');
    document.getElementById('adminRestaurants').classList.add('hidden');
    
    if (tab === 'orders') {
        document.getElementById('adminOrders').classList.remove('hidden');
        renderAdminOrders();
    } else if (tab === 'users') {
        document.getElementById('adminUsers').classList.remove('hidden');
        renderAdminUsers();
    } else if (tab === 'restaurants') {
        document.getElementById('adminRestaurants').classList.remove('hidden');
        loadRestaurantManagement();
    }
}

async function renderAdminStats() {
    try {
        const data = await apiCall('/admin/stats');
        if (data.success) {
            const stats = data.data;
            const statsDiv = document.getElementById('adminStats');
            statsDiv.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${stats.totalOrders}</div>
                    <div class="stat-label">Total Orders</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">Rs ${stats.totalRevenue}</div>
                    <div class="stat-label">Total Revenue</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalUsers}</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.pendingOrders}</div>
                    <div class="stat-label">Pending Orders</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function renderAdminOrders() {
    try {
        const data = await apiCall('/admin/orders');
        const tbody = document.getElementById('ordersTableBody');
        
        if (!data.success || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No orders yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        data.data.forEach(order => {
            const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const date = new Date(order.createdAt).toLocaleString();
            const userName = order.userId?.name || order.userEmail || 'Unknown';
            const orderMode = order.mode || 'delivery';
            
            // Show appropriate location info based on mode
            let locationInfo = '';
            if (orderMode === 'dinein') {
                locationInfo = `<span class="mode-badge dinein">🍽️ Table ${order.tableNumber}</span>`;
            } else {
                locationInfo = order.address || '—';
            }
            
            const itemDetails = order.items.map(item => `${item.itemName} × ${item.quantity}`).join('<br>');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${order.orderId}</strong></td>
                <td>${userName}</td>
                <td>${locationInfo}</td>
                <td>${itemDetails || `${itemsCount} items`}</td>
                <td><strong>Rs ${order.total}</strong></td>
                <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                <td>${date}</td>
                <td>
                    ${order.status === 'Placed' ? `<button class="action-btn success" onclick="updateOrderStatus('${order.orderId}', 'Preparing')">Prepare</button>` : ''}
                    ${order.status === 'Preparing' ? `<button class="action-btn success" onclick="updateOrderStatus('${order.orderId}', 'Delivered')">Deliver</button>` : ''}
                    ${order.status !== 'Cancelled' && order.status !== 'Delivered' ? `<button class="action-btn" onclick="updateOrderStatus('${order.orderId}', 'Cancelled')">Cancel</button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Admin Users Management
let allUsersData = [];
let currentUserFilter = { role: 'all', status: 'all' };

async function renderAdminUsers() {
    try {
        const data = await apiCall('/admin/users');
        
        if (data.success && data.data) {
            allUsersData = data.data;
            updateUserStats(allUsersData);
            renderUsersTable(allUsersData);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red; padding: 40px;">Error loading users</td></tr>';
        }
    }
}

function updateUserStats(users) {
    const total = users.length;
    const customers = users.filter(u => u.role === 'customer').length;
    const owners = users.filter(u => u.role === 'restaurantOwner').length;
    const admins = users.filter(u => u.role === 'admin').length;
    
    document.getElementById('totalUsersCount').textContent = total;
    document.getElementById('customersCount').textContent = customers;
    document.getElementById('ownersCount').textContent = owners;
    document.getElementById('adminsCount').textContent = admins;
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    const roleFilter = document.getElementById('userFilterRole')?.value || 'all';
    const statusFilter = document.getElementById('userFilterStatus')?.value || 'all';
    
    // Filter users
    let filteredUsers = users;
    
    if (roleFilter !== 'all') {
        filteredUsers = filteredUsers.filter(u => u.role === roleFilter);
    }
    
    if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
            filteredUsers = filteredUsers.filter(u => !u.isSuspended);
        } else if (statusFilter === 'suspended') {
            filteredUsers = filteredUsers.filter(u => u.isSuspended);
        }
    }
    
    // Search filter
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase();
        filteredUsers = filteredUsers.filter(u => 
            u.name.toLowerCase().includes(searchTerm) ||
            u.email.toLowerCase().includes(searchTerm) ||
            u.username?.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-light);">
                    <div style="font-size: 16px;">No users found</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => {
        const isCurrentUser = currentUser && currentUser.email === user.email;
        const isSuspended = user.isSuspended || false;
        const orderCount = user.orderCount || 0;
        const totalSpent = user.totalSpent || 0;
        
        // Role badge
        let roleBadge = '';
        switch(user.role) {
            case 'admin':
                roleBadge = '<span class="status-pill approved">Admin</span>';
                break;
            case 'restaurantOwner':
                roleBadge = '<span class="status-pill active">Owner</span>';
                break;
            case 'customer':
            default:
                roleBadge = '<span class="status-pill pending">Customer</span>';
                break;
        }
        
        // Status badge
        const statusBadge = isSuspended 
            ? '<span class="status-pill inactive">Suspended</span>' 
            : '<span class="status-pill active">Active</span>';
        
        const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <tr>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: 500;">${user.name}${isCurrentUser ? ' (You)' : ''}</div>
                        <div style="font-size: 12px; color: var(--text-light);">${user.email}</div>
                        ${user.mobile ? `<div style="font-size: 12px; color: var(--text-light);">${user.mobile}</div>` : ''}
                    </div>
                </td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td><strong>${orderCount}</strong></td>
                <td><strong>₹${totalSpent}</strong></td>
                <td>${joinedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small view" onclick="viewUserDetails('${user._id}')">
                            View
                        </button>
                        ${!isCurrentUser ? `
                            <button class="action-btn-small edit" onclick="openEditUserRole('${user._id}')">
                                Change Role
                            </button>
                            <button class="action-btn-small toggle ${isSuspended ? '' : 'active'}" onclick="toggleUserStatus('${user._id}', ${!isSuspended})">
                                ${isSuspended ? 'Activate' : 'Suspend'}
                            </button>
                            <button class="action-btn-small delete" onclick="deleteUser('${user._id}', '${user.name}')">
                                Delete
                            </button>
                        ` : '<span style="color: var(--text-light); font-size: 12px;">Current User</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// View User Details
async function viewUserDetails(userId) {
    try {
        const user = allUsersData.find(u => u._id === userId);
        
        if (!user) {
            alert('User not found');
            return;
        }
        
        const modal = document.getElementById('userDetailsModal');
        const body = document.getElementById('userDetailsBody');
        
        // Role display
        let roleDisplay = user.role;
        if (user.role === 'restaurantOwner') roleDisplay = 'Restaurant Owner';
        else if (user.role === 'admin') roleDisplay = 'Admin';
        else roleDisplay = 'Customer';
        
        body.innerHTML = `
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Full Name</div>
                    <div class="detail-value">${user.name}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email Address</div>
                    <div class="detail-value">${user.email}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Username</div>
                    <div class="detail-value">${user.username || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Mobile Number</div>
                    <div class="detail-value">${user.mobile || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Role</div>
                    <div class="detail-value">${roleDisplay}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Account Status</div>
                    <div class="detail-value">
                        <span class="status-pill ${user.isSuspended ? 'inactive' : 'active'}">
                            ${user.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total Orders</div>
                    <div class="detail-value">${user.orderCount || 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total Spent</div>
                    <div class="detail-value">₹${user.totalSpent || 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Member Since</div>
                    <div class="detail-value">${new Date(user.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Last Updated</div>
                    <div class="detail-value">${new Date(user.updatedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading user details:', error);
        alert('Failed to load user details');
    }
}

function closeUserDetailsModal() {
    document.getElementById('userDetailsModal').classList.remove('active');
}

// Edit User Role
function openEditUserRole(userId) {
    const user = allUsersData.find(u => u._id === userId);
    
    if (!user) {
        alert('User not found');
        return;
    }
    
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = `${user.name} (${user.email})`;
    document.getElementById('editUserRole').value = user.role;
    
    document.getElementById('editUserRoleModal').classList.add('active');
}

function closeEditUserRoleModal() {
    document.getElementById('editUserRoleModal').classList.remove('active');
    document.getElementById('editUserRoleForm').reset();
}

// Toggle User Status (Suspend/Activate)
async function toggleUserStatus(userId, suspend) {
    const action = suspend ? 'suspend' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }
    
    try {
        const data = await apiCall(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isSuspended: suspend })
        });
        
        if (data.success) {
            alert(`User ${action}d successfully!`);
            renderAdminUsers();
        }
    } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        alert(`Failed to ${action} user: ` + error.message);
    }
}

// Delete User
async function deleteUser(userId, userName) {
    if (!confirm(`WARNING: Delete user "${userName}"?\n\nThis will permanently delete the user and all associated data. This action cannot be undone.`)) {
        return;
    }
    
    const confirmText = prompt('Type "DELETE" to confirm deletion:');
    
    if (confirmText !== 'DELETE') {
        alert('Deletion cancelled');
        return;
    }
    
    try {
        const data = await apiCall(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            alert('User deleted successfully');
            renderAdminUsers();
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user: ' + error.message);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const data = await apiCall(`/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (data.success) {
            await renderAdminOrders();
            await renderAdminStats();
        }
    } catch (error) {
        alert('Error updating order status: ' + error.message);
    }
}

async function changeUserRole(userId, newRole) {
    if (!newRole) {
        return; // No role selected
    }
    
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
        // Reset the dropdown
        event.target.value = '';
        return;
    }
    
    try {
        const data = await apiCall(`/admin/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: newRole })
        });
        
        if (data.success) {
            alert('User role updated successfully!');
            await renderAdminUsers();
        } else {
            alert('Failed to update user role: ' + (data.message || 'Unknown error'));
            event.target.value = '';
        }
    } catch (error) {
        alert('Error updating user role: ' + error.message);
        event.target.value = '';
    }
}

// Make changeUserRole globally accessible
window.changeUserRole = changeUserRole;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (authToken) {
        loadCurrentUser();
    }
    
    // Load remembered user if exists
    loadRememberedUser();
    
    const adminAccessGroup = document.getElementById('adminAccessGroup');
    const adminAccessInput = document.getElementById('adminAccessCode');

    // Login role selection
    document.querySelectorAll('.login-role-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.login-role-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const identifier = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const selectedRole = document.querySelector('.login-role-btn.selected').getAttribute('data-role');
        const rememberMe = document.getElementById('rememberMe').checked;
        
        console.log('Attempting login as:', selectedRole);
        
        const result = await login(identifier, password, selectedRole, rememberMe);
        
        if (result.success) {
            document.getElementById('loginError').classList.add('hidden');
        } else {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = result.error || 'Login failed. Please check your credentials and selected role.';
            errorDiv.classList.remove('hidden');
            
            console.error('Login failed:', result.error);
        }
    });

    // Signup Form
    document.getElementById('signupForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const username = document.getElementById('signupUsername').value;
        const mobile = document.getElementById('signupMobile').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const adminAccessCode = adminAccessInput ? adminAccessInput.value.trim() : '';
        const role = document.querySelector('input[name="role"]:checked').value;
        const finalAdminAccessCode = role === 'admin' ? adminAccessCode : undefined;
        
        if (password !== confirmPassword) {
            const errorDiv = document.getElementById('signupError');
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (role === 'admin' && adminAccessCode !== 'ADMIN123') {
            const errorDiv = document.getElementById('signupError');
            errorDiv.textContent = 'Invalid admin access code';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        if (mobile.length !== 10) {
            const errorDiv = document.getElementById('signupError');
            errorDiv.textContent = 'Mobile number must be 10 digits';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        const result = await signup(name, email, username, mobile, password, role, finalAdminAccessCode);
        if (result.success) {
            // Clear form
            document.getElementById('signupForm').reset();
            document.getElementById('signupError').classList.add('hidden');
            
            // Reset role selection to customer
            document.getElementById('customerRole').classList.add('selected');
            document.getElementById('adminRole').classList.remove('selected');
            if (adminAccessGroup && adminAccessInput) {
                adminAccessGroup.classList.add('hidden');
                adminAccessInput.required = false;
                adminAccessInput.value = '';
            }
            
            // Show success message and redirect to login
            alert(result.message + '\n\nPlease login with your credentials.');
            showLogin();
            
            // Pre-fill login with username or email
            document.getElementById('loginEmail').value = username;
        } else {
            const errorDiv = document.getElementById('signupError');
            errorDiv.textContent = result.error;
            errorDiv.classList.remove('hidden');
        }
    });

    // Password strength checker
    document.getElementById('signupPassword').addEventListener('input', function(e) {
        checkPasswordStrength(e.target.value);
    });

    // Role selection
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input[type="radio"]').checked = true;

            const selectedRole = this.querySelector('input[type="radio"]').value;
            if (adminAccessGroup && adminAccessInput) {
                if (selectedRole === 'admin') {
                    adminAccessGroup.classList.remove('hidden');
                    adminAccessInput.required = true;
                } else {
                    adminAccessGroup.classList.add('hidden');
                    adminAccessInput.required = false;
                    adminAccessInput.value = '';
                }
            }
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchRestaurantsAndItems(e.target.value);
        });
        
        // Clear search when navigating away from home
        searchInput.addEventListener('focus', function() {
            if (document.getElementById('homePage').classList.contains('hidden')) {
                showHome();
            }
        });
    }

    // Password visibility toggle
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', function() {
            const targetInput = document.getElementById(this.dataset.target);
            if (!targetInput) return;

            const isPassword = targetInput.getAttribute('type') === 'password';
            targetInput.setAttribute('type', isPassword ? 'text' : 'password');
            this.classList.toggle('active', isPassword);
            this.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    });

    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }

    // Password change form submission
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', changePassword);
    }

    // Payment method selection
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('payment-option')) {
            document.querySelectorAll('.payment-option').forEach(option => {
                option.classList.remove('selected');
            });
            e.target.classList.add('selected');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-menu')) {
            document.getElementById('userDropdown').classList.remove('show');
        }
    });

    // Initialize cart display
    updateCartDisplay();
    
    // Initialize location display
    updateLocationDisplay();
});

// Location Functions
function showLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.classList.add('active');
    
    // Pre-fill saved location if exists
    if (userLocation && userLocation.address) {
        document.getElementById('manualAddress').value = userLocation.address;
    }
}

function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.classList.remove('active');
    hideLocationError();
    document.getElementById('locationPreview').classList.add('hidden');
}

function showLocationError(message) {
    const errorDiv = document.getElementById('locationError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideLocationError() {
    document.getElementById('locationError').classList.add('hidden');
}

async function detectLocation() {
    hideLocationError();
    
    if (!navigator.geolocation) {
        showLocationError('Geolocation is not supported by your browser');
        return;
    }

    const detectBtn = document.querySelector('.detect-location-btn');
    const originalText = detectBtn.innerHTML;
    detectBtn.innerHTML = '<span class="btn-icon">⏳</span><div><div class="btn-title">Detecting...</div></div>';
    detectBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            try {
                // Reverse geocode to get address
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
                    {
                        headers: {
                            'User-Agent': 'QuickServe Food Delivery App'
                        }
                    }
                );
                
                if (!response.ok) {
                    throw new Error('Failed to get address');
                }
                
                const data = await response.json();
                const address = data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                
                showLocationPreview(address, lat, lon);
            } catch (error) {
                console.error('Geocoding error:', error);
                showLocationPreview(`Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`, lat, lon);
            } finally {
                detectBtn.innerHTML = originalText;
                detectBtn.disabled = false;
            }
        },
        (error) => {
            let message = 'Unable to retrieve your location';
            if (error.code === 1) {
                message = 'Location access denied. Please enable location permissions.';
            } else if (error.code === 2) {
                message = 'Location unavailable. Please try again.';
            } else if (error.code === 3) {
                message = 'Location request timeout. Please try again.';
            }
            showLocationError(message);
            detectBtn.innerHTML = originalText;
            detectBtn.disabled = false;
        }
    );
}

async function searchAddress() {
    const addressInput = document.getElementById('manualAddress');
    const address = addressInput.value.trim();
    
    if (!address) {
        showLocationError('Please enter an address');
        return;
    }
    
    hideLocationError();
    const searchBtn = document.querySelector('.btn-secondary');
    const originalText = searchBtn.textContent;
    searchBtn.textContent = 'Searching...';
    searchBtn.disabled = true;
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
            {
                headers: {
                    'User-Agent': 'QuickServe Food Delivery App'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            showLocationError('Address not found. Please try a different address.');
            return;
        }
        
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        showLocationPreview(result.display_name, lat, lon);
    } catch (error) {
        console.error('Address search error:', error);
        showLocationError('Failed to search address. Please try again.');
    } finally {
        searchBtn.textContent = originalText;
        searchBtn.disabled = false;
    }
}

function showLocationPreview(address, latitude, longitude) {
    document.getElementById('selectedAddress').textContent = address;
    document.getElementById('selectedLat').textContent = latitude.toFixed(6);
    document.getElementById('selectedLon').textContent = longitude.toFixed(6);
    document.getElementById('locationPreview').classList.remove('hidden');
    
    // Store temporary location
    window.tempLocation = { address, latitude, longitude };
}

async function saveLocation() {
    if (!window.tempLocation) {
        showLocationError('No location selected');
        return;
    }
    
    const { address, latitude, longitude } = window.tempLocation;
    
    try {
        const response = await apiCall('/location/save', {
            method: 'POST',
            body: JSON.stringify({ address, latitude, longitude })
        });
        
        if (response.success) {
            userLocation = { address, latitude, longitude };
            localStorage.setItem('userLocation', JSON.stringify(userLocation));
            updateLocationDisplay();
            closeLocationModal();
            
            // Show success message
            alert('Location saved successfully!');
        } else {
            showLocationError(response.message || 'Failed to save location');
        }
    } catch (error) {
        console.error('Save location error:', error);
        showLocationError('Failed to save location. Please try again.');
    }
}

function updateLocationDisplay() {
    const locationText = document.getElementById('locationText');
    if (userLocation && userLocation.address) {
        // Show shortened address
        const parts = userLocation.address.split(',');
        const shortAddress = parts[0] || userLocation.address;
        locationText.textContent = shortAddress.length > 20 
            ? shortAddress.substring(0, 20) + '...' 
            : shortAddress;
        locationText.title = userLocation.address;
    } else {
        locationText.textContent = 'Set location';
    }
}

async function calculateDeliveryInfo() {
    if (!userLocation || !currentRestaurant) {
        return null;
    }
    
    try {
        const response = await apiCall('/location/calculate', {
            method: 'POST',
            body: JSON.stringify({
                restaurantId: currentRestaurant.id,
                userLatitude: userLocation.latitude,
                userLongitude: userLocation.longitude
            })
        });
        
        if (response.success) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Calculate delivery error:', error);
        return null;
    }
}

async function updateDeliveryInfo() {
    const deliveryInfoDiv = document.getElementById('deliveryInfo');
    
    if (!deliveryInfoDiv) return;
    
    if (!userLocation) {
        deliveryInfoDiv.innerHTML = `
            <div style="text-align: center; padding: 12px;">
                <p style="color: var(--text-secondary); margin-bottom: 12px;">Set your location for accurate delivery details</p>
                <button class="btn-secondary" onclick="showLocationModal()">Set Location</button>
            </div>
        `;
        return;
    }
    
    const deliveryData = await calculateDeliveryInfo();
    
    if (deliveryData && deliveryData.hasLocation) {
        deliveryInfoDiv.innerHTML = `
            <h3>🚴 Delivery Information</h3>
            <div class="delivery-detail">
                <span>Distance:</span>
                <span>${deliveryData.distance.toFixed(2)} km</span>
            </div>
            <div class="delivery-detail">
                <span>Estimated Time:</span>
                <span>${deliveryData.estimatedTime}</span>
            </div>
            <div class="delivery-detail">
                <span>Delivery Fee:</span>
                <span>₹${deliveryData.deliveryFee}</span>
            </div>
        `;
        
        // Store delivery data for order placement
        window.currentDeliveryData = deliveryData;
    } else {
        deliveryInfoDiv.innerHTML = `
            <h3>🚴 Delivery Information</h3>
            <div class="delivery-detail">
                <span>Estimated Time:</span>
                <span>30-40 mins</span>
            </div>
            <div class="delivery-detail">
                <span>Delivery Fee:</span>
                <span>₹40</span>
            </div>
        `;
        window.currentDeliveryData = null;
    }
}

// Dine-In Mode Functions
let dineInMode = {
    active: false,
    restaurantId: null,
    tableNumber: null
};

function checkDineInMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const restaurant = urlParams.get('restaurant');
    const table = urlParams.get('table');
    const mode = urlParams.get('mode');
    
    if (mode === 'dinein' && restaurant && table) {
        dineInMode = {
            active: true,
            restaurantId: restaurant,
            tableNumber: parseInt(table)
        };
        
        // Show dine-in indicator
        const header = document.querySelector('.header');
        if (header && !document.getElementById('dineInBanner')) {
            const banner = document.createElement('div');
            banner.id = 'dineInBanner';
            banner.style.cssText = 'background: var(--accent-purple); color: white; padding: 12px; text-align: center; font-weight: 500;';
            banner.innerHTML = `🍽️ Dine-In Mode - Table ${table}`;
            header.parentNode.insertBefore(banner, header.nextSibling);
        }
        
        // Auto-navigate to the restaurant
        const restaurantObj = restaurants.find(r => r.id === restaurant);
        if (restaurantObj) {
            showMenu(restaurant);
        }
    }
}

function isDineInMode() {
    return dineInMode.active;
}

function getDineInTable() {
    return dineInMode.tableNumber;
}

// Restaurant Management Functions
let allRestaurantsData = [];
let currentRestaurantFilter = 'all';

async function loadRestaurantManagement() {
    try {
        const filterStatus = document.getElementById('restaurantFilterStatus')?.value || 'all';
        currentRestaurantFilter = filterStatus;
        
        const data = await apiCall('/admin/restaurants/management');
        
        if (data.success) {
            allRestaurantsData = data.data || [];
            updateRestaurantStats(allRestaurantsData);
            renderRestaurantsTable(allRestaurantsData);
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        const tbody = document.getElementById('restaurantsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red; padding: 40px;">Error loading restaurants</td></tr>';
        }
    }
}

function updateRestaurantStats(restaurants) {
    const total = restaurants.length;
    const pending = restaurants.filter(r => !r.isApproved).length;
    const approved = restaurants.filter(r => r.isApproved).length;
    const active = restaurants.filter(r => r.isActive).length;
    const inactive = restaurants.filter(r => !r.isActive).length;
    
    document.getElementById('totalRestaurantsCount').textContent = total;
    document.getElementById('pendingRestaurantsCount').textContent = pending;
    document.getElementById('activeRestaurantsCount').textContent = active;
    document.getElementById('inactiveRestaurantsCount').textContent = inactive;
}

function renderRestaurantsTable(restaurants) {
    const tbody = document.getElementById('restaurantsTableBody');
    const filterStatus = currentRestaurantFilter;
    
    // Filter restaurants based on status
    let filteredRestaurants = restaurants;
    if (filterStatus === 'pending') {
        filteredRestaurants = restaurants.filter(r => !r.isApproved);
    } else if (filterStatus === 'approved') {
        filteredRestaurants = restaurants.filter(r => r.isApproved);
    } else if (filterStatus === 'active') {
        filteredRestaurants = restaurants.filter(r => r.isActive);
    } else if (filterStatus === 'inactive') {
        filteredRestaurants = restaurants.filter(r => !r.isActive);
    }
    
    // Search filter
    const searchInput = document.getElementById('restaurantSearchInput');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase();
        filteredRestaurants = filteredRestaurants.filter(r => 
            r.name.toLowerCase().includes(searchTerm) ||
            r.cuisine.toLowerCase().includes(searchTerm) ||
            r.address?.toLowerCase().includes(searchTerm) ||
            r.ownerId?.name?.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredRestaurants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-light);">
                    <div style="font-size: 16px;">No restaurants found</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredRestaurants.map(restaurant => {
        const ownerName = restaurant.ownerId?.name || 'Unknown';
        const ownerEmail = restaurant.ownerId?.email || 'N/A';
        const stats = restaurant.stats || {};
        const totalOrders = stats.totalOrders || 0;
        const totalRevenue = stats.totalRevenue || 0;
        const avgRating = restaurant.rating || 4.0;
        
        // Determine status
        let statusClass = '';
        let statusText = '';
        if (!restaurant.isApproved) {
            statusClass = 'pending';
            statusText = 'Pending';
        } else if (restaurant.isActive) {
            statusClass = 'active';
            statusText = 'Active';
        } else {
            statusClass = 'inactive';
            statusText = 'Inactive';
        }
        
        return `
            <tr>
                <td>
                    <div class="restaurant-info">
                        <div class="restaurant-logo">${restaurant.emoji || '🍽️'}</div>
                        <div class="restaurant-name-block">
                            <div class="restaurant-name">${restaurant.name}</div>
                            <div class="restaurant-address">${restaurant.address || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500;">${ownerName}</div>
                    <div style="font-size: 12px; color: var(--text-light);">${ownerEmail}</div>
                </td>
                <td>${restaurant.cuisine || 'N/A'}</td>
                <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td><strong>${totalOrders}</strong></td>
                <td><strong>₹${totalRevenue}</strong></td>
                <td>${avgRating.toFixed(1)}</td>
                <td>
                    <div class="action-buttons">
                        ${!restaurant.isApproved ? `
                            <button class="action-btn-small approve" onclick="approveRestaurant('${restaurant._id}')">
                                Approve
                            </button>
                            <button class="action-btn-small reject" onclick="rejectRestaurant('${restaurant._id}', '${restaurant.name}')">
                                Reject
                            </button>
                        ` : ''}
                        <button class="action-btn-small view" onclick="viewRestaurantDetails('${restaurant._id}')">
                            View
                        </button>
                        <button class="action-btn-small edit" onclick="editRestaurant('${restaurant._id}')">
                            Edit
                        </button>
                        ${restaurant.isApproved ? `
                            <button class="action-btn-small toggle ${restaurant.isActive ? 'active' : ''}" onclick="toggleRestaurantStatus('${restaurant._id}', ${!restaurant.isActive})">
                                ${restaurant.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                        ` : ''}
                        <button class="action-btn-small delete" onclick="deleteRestaurant('${restaurant._id}', '${restaurant.name}')">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// View Restaurant Details
async function viewRestaurantDetails(restaurantId) {
    try {
        const data = await apiCall(`/admin/restaurants/${restaurantId}/details`);
        
        if (data.success) {
            const restaurant = data.data;
            const stats = restaurant.stats || {};
            
            const modal = document.getElementById('restaurantDetailsModal');
            const body = document.getElementById('restaurantDetailsBody');
            
            body.innerHTML = `
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Restaurant Name</div>
                        <div class="detail-value">${restaurant.name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Cuisine Type</div>
                        <div class="detail-value">${restaurant.cuisine}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Owner Name</div>
                        <div class="detail-value">${restaurant.ownerId?.name || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Owner Email</div>
                        <div class="detail-value">${restaurant.ownerId?.email || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Owner Phone</div>
                        <div class="detail-value">${restaurant.ownerId?.mobile || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Total Tables</div>
                        <div class="detail-value">${restaurant.totalTables || 0}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Opening Time</div>
                        <div class="detail-value">${restaurant.openTime || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Closing Time</div>
                        <div class="detail-value">${restaurant.closeTime || 'N/A'}</div>
                    </div>
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <div class="detail-label">Address</div>
                        <div class="detail-value">${restaurant.address || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="status-pill ${restaurant.isApproved ? 'approved' : 'pending'}">
                                ${restaurant.isApproved ? 'Approved' : 'Pending Approval'}
                            </span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Visibility</div>
                        <div class="detail-value">
                            <span class="status-pill ${restaurant.isActive ? 'active' : 'inactive'}">
                                ${restaurant.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="performance-stats">
                    <h3>Performance Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-box-value">${stats.totalOrders || 0}</div>
                            <div class="stat-box-label">Total Orders</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-box-value">₹${stats.totalRevenue || 0}</div>
                            <div class="stat-box-label">Total Revenue</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-box-value">${restaurant.rating || 4.0}</div>
                            <div class="stat-box-label">Rating</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-item" style="margin-top: 20px;">
                    <div class="detail-label">Registered On</div>
                    <div class="detail-value">${new Date(restaurant.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                </div>
            `;
            
            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading restaurant details:', error);
        alert('Failed to load restaurant details');
    }
}

function closeRestaurantDetailsModal() {
    document.getElementById('restaurantDetailsModal').classList.remove('active');
}

// Edit Restaurant
async function editRestaurant(restaurantId) {
    try {
        const restaurant = allRestaurantsData.find(r => r._id === restaurantId);
        
        if (!restaurant) {
            alert('Restaurant not found');
            return;
        }
        
        // Populate form
        document.getElementById('editRestaurantId').value = restaurantId;
        document.getElementById('editRestaurantName').value = restaurant.name;
        document.getElementById('editRestaurantCuisine').value = restaurant.cuisine || '';
        document.getElementById('editRestaurantAddress').value = restaurant.address || '';
        document.getElementById('editRestaurantTables').value = restaurant.totalTables || 10;
        document.getElementById('editRestaurantDeliveryTime').value = restaurant.deliveryTime || '30-40 min';
        document.getElementById('editRestaurantOpenTime').value = restaurant.openTime || '';
        document.getElementById('editRestaurantCloseTime').value = restaurant.closeTime || '';
        
        // Show modal
        document.getElementById('editRestaurantModal').classList.add('active');
    } catch (error) {
        console.error('Error opening edit modal:', error);
        alert('Failed to open edit form');
    }
}

function closeEditRestaurantModal() {
    document.getElementById('editRestaurantModal').classList.remove('active');
    document.getElementById('editRestaurantForm').reset();
}

// Approve Restaurant
async function approveRestaurant(restaurantId) {
    if (!confirm('Are you sure you want to approve this restaurant?')) {
        return;
    }
    
    try {
        const data = await apiCall(`/admin/restaurants/${restaurantId}/approve`, {
            method: 'PUT'
        });
        
        if (data.success) {
            alert('Restaurant approved successfully!');
            loadRestaurantManagement();
        }
    } catch (error) {
        console.error('Error approving restaurant:', error);
        alert('Failed to approve restaurant: ' + error.message);
    }
}

// Reject Restaurant
async function rejectRestaurant(restaurantId, restaurantName) {
    const reason = prompt(`Reject "${restaurantName}"?\n\nEnter reason for rejection (optional):`);
    
    if (reason === null) return;
    
    try {
        const data = await apiCall(`/admin/restaurants/${restaurantId}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
        
        if (data.success) {
            alert('Restaurant rejected successfully');
            loadRestaurantManagement();
        }
    } catch (error) {
        console.error('Error rejecting restaurant:', error);
        alert('Failed to reject restaurant: ' + error.message);
    }
}

// Toggle Restaurant Status (Active/Inactive)
async function toggleRestaurantStatus(restaurantId, newStatus) {
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this restaurant?`)) {
        return;
    }
    
    try {
        const data = await apiCall(`/admin/restaurants/${restaurantId}/toggle-status`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: newStatus })
        });
        
        if (data.success) {
            alert(`Restaurant ${action}d successfully!`);
            loadRestaurantManagement();
        }
    } catch (error) {
        console.error('Error toggling restaurant status:', error);
        alert(`Failed to ${action} restaurant: ` + error.message);
    }
}

// Delete Restaurant
async function deleteRestaurant(restaurantId, restaurantName) {
    if (!confirm(`WARNING: Delete "${restaurantName}"?\n\nThis will permanently delete the restaurant and all associated data. This action cannot be undone.`)) {
        return;
    }
    
    const confirmText = prompt('Type "DELETE" to confirm deletion:');
    
    if (confirmText !== 'DELETE') {
        alert('Deletion cancelled');
        return;
    }
    
    try {
        const data = await apiCall(`/admin/restaurants/${restaurantId}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            alert('Restaurant deleted successfully');
            loadRestaurantManagement();
        }
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        alert('Failed to delete restaurant: ' + error.message);
    }
}

// Handle Edit Restaurant Form Submit
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('editRestaurantForm');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const restaurantId = document.getElementById('editRestaurantId').value;
            const updateData = {
                name: document.getElementById('editRestaurantName').value,
                cuisine: document.getElementById('editRestaurantCuisine').value,
                address: document.getElementById('editRestaurantAddress').value,
                totalTables: parseInt(document.getElementById('editRestaurantTables').value),
                deliveryTime: document.getElementById('editRestaurantDeliveryTime').value,
                openTime: document.getElementById('editRestaurantOpenTime').value,
                closeTime: document.getElementById('editRestaurantCloseTime').value
            };
            
            try {
                const data = await apiCall(`/admin/restaurants/${restaurantId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });
                
                if (data.success) {
                    alert('Restaurant updated successfully!');
                    closeEditRestaurantModal();
                    loadRestaurantManagement();
                }
            } catch (error) {
                console.error('Error updating restaurant:', error);
                alert('Failed to update restaurant: ' + error.message);
            }
        });
    }
    
    // Add search input listener for restaurants
    const searchInput = document.getElementById('restaurantSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (allRestaurantsData.length > 0) {
                renderRestaurantsTable(allRestaurantsData);
            }
        });
    }
    
    // Add search input listener for users
    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', function() {
            if (allUsersData.length > 0) {
                renderUsersTable(allUsersData);
            }
        });
    }
    
    // Handle Edit User Role Form Submit
    const editUserRoleForm = document.getElementById('editUserRoleForm');
    if (editUserRoleForm) {
        editUserRoleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const userId = document.getElementById('editUserId').value;
            const newRole = document.getElementById('editUserRole').value;
            
            if (!newRole) {
                alert('Please select a role');
                return;
            }
            
            try {
                const data = await apiCall(`/admin/users/${userId}/role`, {
                    method: 'PATCH',
                    body: JSON.stringify({ role: newRole })
                });
                
                if (data.success) {
                    alert('User role updated successfully!');
                    closeEditUserRoleModal();
                    renderAdminUsers();
                }
            } catch (error) {
                console.error('Error updating user role:', error);
                alert('Failed to update user role: ' + error.message);
            }
        });
    }
});

// Make restaurant management functions globally available
window.loadRestaurantManagement = loadRestaurantManagement;
window.viewRestaurantDetails = viewRestaurantDetails;
window.closeRestaurantDetailsModal = closeRestaurantDetailsModal;
window.editRestaurant = editRestaurant;
window.closeEditRestaurantModal = closeEditRestaurantModal;
window.approveRestaurant = approveRestaurant;
window.rejectRestaurant = rejectRestaurant;
window.toggleRestaurantStatus = toggleRestaurantStatus;
window.deleteRestaurant = deleteRestaurant;

// Make user management functions globally available
window.renderAdminUsers = renderAdminUsers;
window.viewUserDetails = viewUserDetails;
window.closeUserDetailsModal = closeUserDetailsModal;
window.openEditUserRole = openEditUserRole;
window.closeEditUserRoleModal = closeEditUserRoleModal;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;

// Google Maps Autocomplete initialization
let autocomplete;
let selectedPlaceDetails = null;

function initAutocomplete() {
    console.log('Initializing Google Maps Autocomplete...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAutocomplete);
    } else {
        setupAutocomplete();
    }
}

function setupAutocomplete() {
    const addressInput = document.getElementById('deliveryAddress');
    
    if (!addressInput) {
        console.log('Address input not found yet, will retry when checkout is opened');
        return;
    }
    
    // Make input writable when user clicks on it
    addressInput.addEventListener('click', function() {
        this.removeAttribute('readonly');
        this.focus();
    });
    
    try {
        // Initialize autocomplete with restrictions to India (you can change this)
        autocomplete = new google.maps.places.Autocomplete(addressInput, {
            componentRestrictions: { country: 'in' }, // Change 'in' to your country code
            fields: ['formatted_address', 'geometry', 'name', 'address_components'],
            types: ['address']
        });
        
        // Listen for place selection
        autocomplete.addListener('place_changed', onPlaceSelected);
        
        console.log('Google Maps Autocomplete initialized successfully');
    } catch (error) {
        console.error('Error initializing autocomplete:', error);
    }
}

function onPlaceSelected() {
    const place = autocomplete.getPlace();
    
    if (!place.geometry) {
        console.log('No details available for input:', place.name);
        return;
    }
    
    // Store the selected place details
    selectedPlaceDetails = {
        address: place.formatted_address,
        name: place.name,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
    };
    
    console.log('Selected place:', selectedPlaceDetails);
    
    // Update the input with formatted address
    document.getElementById('deliveryAddress').value = place.formatted_address;
}

// Reinitialize autocomplete when checkout page is shown
const originalShowCheckout = showCheckout;
showCheckout = function() {
    originalShowCheckout.apply(this, arguments);
    
    // Setup autocomplete after a small delay to ensure DOM is ready
    setTimeout(() => {
        setupAutocomplete();
        
        // Add GPS button listener
        const gpsBtn = document.getElementById('gpsButton');
        if (gpsBtn) {
            console.log('Adding click listener to GPS button');
            gpsBtn.addEventListener('click', getCurrentLocation);
        }
    }, 100);
};

// Make initAutocomplete globally available for the callback
window.initAutocomplete = initAutocomplete;

// GPS Location Function
function getCurrentLocation() {
    console.log('=== GPS BUTTON CLICKED ===');
    
    const gpsButton = document.getElementById('gpsButton');
    const addressInput = document.getElementById('deliveryAddress');
    
    console.log('GPS Button:', gpsButton);
    console.log('Address Input:', addressInput);
    
    // Check if Google Maps is loaded
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps not loaded');
        alert('Google Maps is still loading. Please wait a moment and try again.');
        return;
    }
    
    console.log('Google Maps loaded successfully');
    
    if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    console.log('Starting geolocation request...');
    
    // Disable button and show loading state
    gpsButton.disabled = true;
    gpsButton.classList.add('loading');
    gpsButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg><span>Getting Location...</span>';
    
    addressInput.value = 'Getting your location...';
    
    navigator.geolocation.getCurrentPosition(
        // Success callback
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            console.log('✓ Got coordinates:', { lat, lng });
            
            // Use Google Maps Geocoding API to get address from coordinates
            try {
                console.log('Starting geocoding...');
                const geocoder = new google.maps.Geocoder();
                const latlng = { lat, lng };
                
                geocoder.geocode({ location: latlng }, (results, status) => {
                    console.log('Geocoding status:', status);
                    console.log('Geocoding results:', results);
                    
                    if (status === 'OK' && results[0]) {
                        const address = results[0].formatted_address;
                        
                        console.log('✓ Address found:', address);
                        
                        // Store the location details
                        selectedPlaceDetails = {
                            address: address,
                            lat: lat,
                            lng: lng
                        };
                        
                        // Update the input
                        addressInput.value = address;
                        addressInput.removeAttribute('readonly');
                        
                        console.log('✓ Address successfully set');
                    } else {
                        console.error('Geocoding failed:', status);
                        addressInput.value = '';
                        addressInput.removeAttribute('readonly');
                        alert('Could not get address from your location. Please try typing your address.');
                    }
                    
                    // Re-enable button
                    resetGPSButton(gpsButton);
                });
                
            } catch (error) {
                console.error('Error getting address:', error);
                addressInput.value = '';
                addressInput.removeAttribute('readonly');
                alert('Error getting your address. Please try typing it manually.');
                resetGPSButton(gpsButton);
            }
        },
        // Error callback
        (error) => {
            console.error('Geolocation error:', error);
            addressInput.value = '';
            addressInput.removeAttribute('readonly');
            
            let errorMessage = 'Unable to get your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
            }
            
            alert(errorMessage);
            resetGPSButton(gpsButton);
        },
        // Options
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function resetGPSButton(gpsButton) {
    gpsButton.disabled = false;
    gpsButton.classList.remove('loading');
    gpsButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg><span>Use My Location</span>';
}

// Make getCurrentLocation globally available
window.getCurrentLocation = getCurrentLocation;

// Restaurant Map Picker Functions
let restaurantMap;
let restaurantMarker;
let restaurantGeocoder;
let selectedRestaurantLocation = null;

function openRestaurantMapPicker() {
    const modal = document.getElementById('restaurantMapModal');
    modal.classList.add('active');
    
    // Initialize map after modal is shown
    setTimeout(() => {
        initRestaurantMap();
    }, 100);
}

function closeRestaurantMapPicker() {
    const modal = document.getElementById('restaurantMapModal');
    modal.classList.remove('active');
    document.getElementById('mapSearchInput').value = '';
}

function initRestaurantMap() {
    // Check if Google Maps is loaded
    if (typeof google === 'undefined' || !google.maps) {
        alert('Google Maps is still loading. Please wait a moment and try again.');
        closeRestaurantMapPicker();
        return;
    }
    
    // If map already exists, just center it
    if (restaurantMap) {
        restaurantMap.setCenter({ lat: 28.6139, lng: 77.2090 }); // Default to Delhi
        return;
    }
    
    // Default location (Delhi, India - you can change this)
    const defaultLocation = { lat: 28.6139, lng: 77.2090 };
    
    // Create map
    const mapDiv = document.getElementById('restaurantMap');
    restaurantMap = new google.maps.Map(mapDiv, {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true
    });
    
    // Initialize geocoder
    restaurantGeocoder = new google.maps.Geocoder();
    
    // Add click listener to map
    restaurantMap.addListener('click', (event) => {
        placeRestaurantMarker(event.latLng);
    });
    
    // Add autocomplete to search input
    const searchInput = document.getElementById('mapSearchInput');
    const autocomplete = new google.maps.places.Autocomplete(searchInput, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry', 'name']
    });
    
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry) {
            console.log('No details for:', place.name);
            return;
        }
        
        // Move map to selected place
        restaurantMap.setCenter(place.geometry.location);
        restaurantMap.setZoom(17);
        
        // Place marker
        placeRestaurantMarker(place.geometry.location);
    });
}

function placeRestaurantMarker(location) {
    // Remove existing marker
    if (restaurantMarker) {
        restaurantMarker.setMap(null);
    }
    
    // Create new marker
    restaurantMarker = new google.maps.Marker({
        position: location,
        map: restaurantMap,
        animation: google.maps.Animation.DROP,
        draggable: true
    });
    
    // Add drag listener
    restaurantMarker.addListener('dragend', (event) => {
        updateRestaurantLocationInfo(event.latLng);
    });
    
    // Update location info
    updateRestaurantLocationInfo(location);
    
    // Center map on marker
    restaurantMap.panTo(location);
}

function updateRestaurantLocationInfo(location) {
    const lat = location.lat();
    const lng = location.lng();
    
    // Update coordinates display
    document.getElementById('mapSelectedCoords').textContent = 
        `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
    
    // Geocode to get address
    restaurantGeocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const address = results[0].formatted_address;
            document.getElementById('mapSelectedAddress').textContent = address;
            
            // Store selected location
            selectedRestaurantLocation = {
                address: address,
                lat: lat,
                lng: lng
            };
            
            // Enable confirm button
            document.getElementById('confirmMapLocation').disabled = false;
        } else {
            document.getElementById('mapSelectedAddress').textContent = 
                'Click on the map to select a location';
            document.getElementById('confirmMapLocation').disabled = true;
        }
    });
}

function searchOnMap() {
    const searchInput = document.getElementById('mapSearchInput');
    const address = searchInput.value.trim();
    
    if (!address) {
        alert('Please enter an address to search');
        return;
    }
    
    restaurantGeocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            restaurantMap.setCenter(location);
            restaurantMap.setZoom(17);
            placeRestaurantMarker(location);
        } else {
            alert('Location not found. Please try a different search term.');
        }
    });
}

function detectRestaurantLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    const gpsBtn = document.querySelector('.map-gps-btn');
    if (gpsBtn) {
        gpsBtn.disabled = true;
        gpsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>';
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            if (restaurantMap) {
                restaurantMap.setCenter(location);
                restaurantMap.setZoom(17);
                placeRestaurantMarker(location);
            } else {
                // If modal is not open, just fill the lat/lng fields
                document.getElementById('restaurantLat').value = location.lat;
                document.getElementById('restaurantLon').value = location.lng;
            }
            
            if (gpsBtn) {
                gpsBtn.disabled = false;
                gpsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to get your location. Please search manually or click on the map.');
            
            if (gpsBtn) {
                gpsBtn.disabled = false;
                gpsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        }
    );
}

function confirmRestaurantLocation() {
    if (!selectedRestaurantLocation) {
        alert('Please select a location first');
        return;
    }
    
    // Fill the form fields
    document.getElementById('restaurantAddress').value = selectedRestaurantLocation.address;
    document.getElementById('restaurantLat').value = selectedRestaurantLocation.lat.toFixed(6);
    document.getElementById('restaurantLon').value = selectedRestaurantLocation.lng.toFixed(6);
    
    // Close modal
    closeRestaurantMapPicker();
    
    console.log('Restaurant location confirmed:', selectedRestaurantLocation);
}

// Make functions globally available
window.openRestaurantMapPicker = openRestaurantMapPicker;
window.closeRestaurantMapPicker = closeRestaurantMapPicker;
window.searchOnMap = searchOnMap;
window.detectRestaurantLocation = detectRestaurantLocation;
window.confirmRestaurantLocation = confirmRestaurantLocation;




