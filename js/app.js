// API Configuration
// Automatically detects if running locally or in production
const getApiUrl = () => {
    const hostname = window.location.hostname;
    
    // If running on localhost, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    
    // For production, use your deployed backend URL
    // TODO: Replace this with your actual backend URL after deployment
    return 'https://YOUR-BACKEND-URL.vercel.app/api';
};

const API_URL = getApiUrl();
let authToken = localStorage.getItem('authToken') || null;

// Application State
let currentUser = null;
let currentRestaurant = null;
let lastVisitedRestaurant = null;
let cart = [];
let orders = [];
let users = [];

// API Helper Functions
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
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'API request failed');
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
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password, role: selectedRole })
        });
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            
            document.getElementById('userName').textContent = data.user.name;
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('signupPage').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            
            if (data.user.role === 'admin') {
                document.getElementById('adminMenuBtn').classList.remove('hidden');
            } else {
                document.getElementById('adminMenuBtn').classList.add('hidden');
            }
            
            if (rememberMe) {
                localStorage.setItem('rememberedUser', JSON.stringify({
                    identifier: identifier,
                    role: selectedRole
                }));
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            await loadRestaurants();
            if (data.user.role === 'admin') {
                showAdminDashboard();
            } else {
                showHome();
            }
            return { success: true };
        }
    } catch (error) {
        return { success: false, error: error.message };
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

async function signup(name, email, username, mobile, password, role) {
    try {
        const data = await apiCall('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, username, mobile, password, role: role || 'customer' })
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
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('userDropdown').classList.remove('show');
}

// Load restaurants from API
async function loadRestaurants() {
    try {
        const data = await apiCall('/restaurants');
        if (data.success && data.data) {
            // Convert array to object format for compatibility
            const restaurantsObj = {};
            data.data.forEach(restaurant => {
                restaurantsObj[restaurant.id] = restaurant;
            });
            Object.assign(restaurants, restaurantsObj);
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        // Fall back to local data if API fails
    }
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
    
    // Clear search input and show all restaurants
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    renderRestaurants();
}

function showMenu(restaurantId) {
    if (currentUser && currentUser.role === 'admin') {
        return;
    }
    currentRestaurant = restaurants[restaurantId];
    lastVisitedRestaurant = restaurantId;
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('menuPage').classList.remove('hidden');
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
    renderCheckoutSummary();
}

function showSuccess(orderId) {
    document.getElementById('checkoutPage').classList.add('hidden');
    document.getElementById('successPage').classList.remove('hidden');
    document.getElementById('orderIdDisplay').textContent = `Order ID: ${orderId}`;
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
    if (!currentRestaurant) return;

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
    currentRestaurant.categories.forEach((category, index) => {
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
        const section = document.createElement('div');
        section.className = 'menu-section';
        section.id = `category-${category.name.replace(/\s+/g, '-').toLowerCase()}`;
        
        const title = document.createElement('h3');
        title.textContent = category.name;
        section.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'menu-grid';

        category.items.forEach(item => {
            const cartItem = cart.find(c => c.itemId === item.id);
            const quantity = cartItem ? cartItem.quantity : 0;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item';
            itemDiv.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="menu-item-image" 
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
    const item = findItemById(itemId);
    if (!item) return;

    const existingItem = cart.find(c => c.itemId === itemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            itemId: item.id,
            itemName: item.name,
            restaurantId: currentRestaurant.id,
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
    const deliveryFee = 40;
    const total = subtotal + deliveryFee;

    cartSummaryDiv.innerHTML = `
        <div class="summary-row">
            <span>Subtotal</span>
            <span>₹${subtotal}</span>
        </div>
        <div class="summary-row">
            <span>Delivery Fee</span>
            <span>₹${deliveryFee}</span>
        </div>
        <div class="summary-row total">
            <span>Total</span>
            <span>₹${total}</span>
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
    const deliveryFee = 40;
    const total = subtotal + deliveryFee;

    let itemsHtml = '';
    cart.forEach(item => {
        itemsHtml += `
            <div class="summary-row">
                <span>${item.itemName} × ${item.quantity}</span>
                <span>₹${item.price * item.quantity}</span>
            </div>
        `;
    });

    summaryDiv.innerHTML = `
        <h4 style="margin-bottom: 12px;">Order Summary</h4>
        ${itemsHtml}
        <div class="summary-row">
            <span>Delivery Fee</span>
            <span>₹${deliveryFee}</span>
        </div>
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
    if (!address) {
        alert('Please enter delivery address');
        return;
    }

    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }
    
    const paymentMethod = document.querySelector('.payment-option.selected')?.getAttribute('data-method') || 'cod';

    try {
        const data = await apiCall('/orders', {
            method: 'POST',
            body: JSON.stringify({
                items: cart,
                address,
                paymentMethod
            })
        });
        
        if (data.success) {
            cart = [];
            updateCartDisplay();
            showSuccess(data.data.orderId);
        }
    } catch (error) {
        alert('Error placing order: ' + error.message);
    }
}

function scrollToCategory(categoryName) {
    const element = document.getElementById(`category-${categoryName.replace(/\s+/g, '-').toLowerCase()}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
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
    switchAdminTab('orders');
}

function switchAdminTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide sections
    if (tab === 'orders') {
        document.getElementById('adminOrders').classList.remove('hidden');
        document.getElementById('adminUsers').classList.add('hidden');
        renderAdminOrders();
    } else if (tab === 'users') {
        document.getElementById('adminOrders').classList.add('hidden');
        document.getElementById('adminUsers').classList.remove('hidden');
        renderAdminUsers();
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
            const address = order.address || '—';
            const itemDetails = order.items.map(item => `${item.itemName} × ${item.quantity}`).join('<br>');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${order.orderId}</strong></td>
                <td>${userName}</td>
                <td>${address}</td>
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

async function renderAdminUsers() {
    try {
        const data = await apiCall('/admin/users');
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        
        if (data.success && data.data) {
            data.data.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.role === 'admin' ? '<span class="status-badge status-preparing">Admin</span>' : '<span class="status-badge status-placed">Customer</span>'}</td>
                    <td>${user.orderCount || 0}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
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
        
        const result = await login(identifier, password, selectedRole, rememberMe);
        
        if (result.success) {
            document.getElementById('loginError').classList.add('hidden');
        } else {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = result.error;
            errorDiv.classList.remove('hidden');
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
        
        const result = await signup(name, email, username, mobile, password, role);
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
});
