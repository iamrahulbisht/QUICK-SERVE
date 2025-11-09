// Restaurant Owner Functions

let ownerRestaurant = null;
let ownerOrders = [];
let currentOrderFilter = 'all';

// Show restaurant owner signup page
function showRestaurantOwnerSignup() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('signupPage').classList.add('hidden');
    document.getElementById('restaurantOwnerSignupPage').classList.remove('hidden');
}

// Convert Google Drive link to direct image URL
function convertGoogleDriveUrl(url) {
    if (!url) return url;
    
    // Check if it's a Google Drive link
    const drivePatterns = [
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,  // Standard file link
        /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/, // Open link
        /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/  // Already converted
    ];
    
    for (const pattern of drivePatterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            const fileId = match[1];
            console.log('Converting Google Drive URL - File ID:', fileId);
            // Convert to direct image URL (works better than uc?export=view)
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        }
    }
    
    // If not a Google Drive link, return as is
    return url;
}

// Preview restaurant logo
function previewRestaurantLogo() {
    const logoInput = document.getElementById('restaurantLogo');
    const logoPreview = document.getElementById('logoPreview');
    const logoPreviewImg = document.getElementById('logoPreviewImg');
    
    let url = logoInput.value.trim();
    
    if (!url) {
        logoPreview.classList.add('hidden');
        return;
    }
    
    // Convert Google Drive URL if needed
    url = convertGoogleDriveUrl(url);
    logoInput.value = url; // Update input with converted URL
    
    // Show preview
    logoPreviewImg.src = url;
    logoPreviewImg.onerror = function() {
        alert('Unable to load image. Please check the URL and ensure:\n\n1. For Google Drive: Share link is set to "Anyone with the link"\n2. The URL is a direct link to an image\n3. The image format is supported (jpg, png, gif, etc.)');
        logoPreview.classList.add('hidden');
    };
    logoPreviewImg.onload = function() {
        logoPreview.classList.remove('hidden');
    };
}

// Clear logo preview
function clearLogoPreview() {
    document.getElementById('restaurantLogo').value = '';
    document.getElementById('logoPreview').classList.add('hidden');
}

// Preview settings logo
function previewSettingsLogo() {
    const logoInput = document.getElementById('settingsLogo');
    const logoPreview = document.getElementById('settingsLogoPreview');
    const logoPreviewImg = document.getElementById('settingsLogoPreviewImg');
    
    let url = logoInput.value.trim();
    
    if (!url) {
        logoPreview.classList.add('hidden');
        return;
    }
    
    // Convert Google Drive URL if needed
    url = convertGoogleDriveUrl(url);
    logoInput.value = url; // Update input with converted URL
    
    // Show preview
    logoPreviewImg.src = url;
    logoPreviewImg.onerror = function() {
        alert('Unable to load image. Please check the URL and ensure:\n\n1. For Google Drive: Share link is set to "Anyone with the link"\n2. The URL is a direct link to an image\n3. The image format is supported (jpg, png, gif, etc.)');
        logoPreview.classList.add('hidden');
    };
    logoPreviewImg.onload = function() {
        logoPreview.classList.remove('hidden');
    };
}

// Clear settings logo preview
function clearSettingsLogoPreview() {
    document.getElementById('settingsLogo').value = '';
    document.getElementById('settingsLogoPreview').classList.add('hidden');
}

// Track which form is using the map picker
let mapPickerContext = 'signup'; // 'signup' or 'settings'

// Open settings map picker
function openSettingsMapPicker() {
    mapPickerContext = 'settings';
    openRestaurantMapPicker();
}

// Make functions globally accessible
window.showRestaurantOwnerSignup = showRestaurantOwnerSignup;
window.openRestaurantMapPicker = openRestaurantMapPicker;
window.closeRestaurantMapPicker = closeRestaurantMapPicker;
window.detectRestaurantLocation = detectRestaurantLocation;
window.searchOnMap = searchOnMap;
window.confirmRestaurantLocation = confirmRestaurantLocation;
window.previewRestaurantLogo = previewRestaurantLogo;
window.clearLogoPreview = clearLogoPreview;
window.previewSettingsLogo = previewSettingsLogo;
window.clearSettingsLogoPreview = clearSettingsLogoPreview;
window.openSettingsMapPicker = openSettingsMapPicker;

// Map variables for owner registration
let ownerRestaurantMap = null;
let ownerRestaurantMarker = null;
let ownerSelectedLocation = null;

// Detect restaurant location
function detectRestaurantLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    const modal = document.getElementById('restaurantMapModal');
    const isMapOpen = !modal.classList.contains('hidden');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            if (isMapOpen) {
                // If map is open, update the map
                updateMapLocation(lat, lon);
            } else {
                // Otherwise update the input fields
                document.getElementById('restaurantLat').value = lat.toFixed(6);
                document.getElementById('restaurantLon').value = lon.toFixed(6);
                alert('Location detected successfully!');
            }
        },
        (error) => {
            alert('Unable to retrieve your location');
        }
    );
}

// Open restaurant map picker
function openRestaurantMapPicker() {
    // Set default context if not already set
    if (!mapPickerContext) {
        mapPickerContext = 'signup';
    }
    
    const modal = document.getElementById('restaurantMapModal');
    modal.classList.remove('hidden');
    modal.classList.add('active');
    
    // Initialize map if not already done
    setTimeout(() => {
        if (!ownerRestaurantMap) {
            initRestaurantMap();
        } else {
            ownerRestaurantMap.invalidateSize();
        }
    }, 100);
}

// Close restaurant map picker
function closeRestaurantMapPicker() {
    const modal = document.getElementById('restaurantMapModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Initialize the map
function initRestaurantMap() {
    // Default to India center
    const defaultLat = 28.6139;
    const defaultLon = 77.2090;
    
    // Get field IDs based on context
    const latFieldId = mapPickerContext === 'settings' ? 'settingsLatitude' : 'restaurantLat';
    const lonFieldId = mapPickerContext === 'settings' ? 'settingsLongitude' : 'restaurantLon';
    
    // Get current values if any
    const currentLat = parseFloat(document.getElementById(latFieldId).value) || defaultLat;
    const currentLon = parseFloat(document.getElementById(lonFieldId).value) || defaultLon;
    
    // Create map
    ownerRestaurantMap = L.map('restaurantMap').setView([currentLat, currentLon], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(ownerRestaurantMap);
    
    // Add marker on click
    ownerRestaurantMap.on('click', function(e) {
        updateMapLocation(e.latlng.lat, e.latlng.lng);
    });
    
    // If there's already a location, show it
    if (document.getElementById(latFieldId).value && document.getElementById(lonFieldId).value) {
        updateMapLocation(currentLat, currentLon);
    }
}

// Update map location with marker
function updateMapLocation(lat, lon) {
    // Remove existing marker if any
    if (ownerRestaurantMarker) {
        ownerRestaurantMap.removeLayer(ownerRestaurantMarker);
    }
    
    // Add new marker
    ownerRestaurantMarker = L.marker([lat, lon], {
        draggable: true
    }).addTo(ownerRestaurantMap);
    
    // Update marker position on drag
    ownerRestaurantMarker.on('dragend', function(e) {
        const position = e.target.getLatLng();
        updateLocationInfo(position.lat, position.lng);
    });
    
    // Center map on marker
    ownerRestaurantMap.setView([lat, lon], 15);
    
    // Update location info
    updateLocationInfo(lat, lon);
}

// Update location information display
async function updateLocationInfo(lat, lon) {
    ownerSelectedLocation = { lat, lon };
    
    // Update coordinate display
    document.getElementById('mapSelectedCoords').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    
    // Enable confirm button
    document.getElementById('confirmMapLocation').disabled = false;
    
    // Try to get address from reverse geocoding
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await response.json();
        
        if (data && data.display_name) {
            document.getElementById('mapSelectedAddress').textContent = data.display_name;
        } else {
            document.getElementById('mapSelectedAddress').textContent = `Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }
    } catch (error) {
        console.error('Error getting address:', error);
        document.getElementById('mapSelectedAddress').textContent = `Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
}

// Search on map
async function searchOnMap() {
    const searchInput = document.getElementById('mapSearchInput').value.trim();
    
    if (!searchInput) {
        alert('Please enter a location to search');
        return;
    }
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            
            updateMapLocation(lat, lon);
        } else {
            alert('Location not found. Please try a different search term.');
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('Error searching for location. Please try again.');
    }
}

// Confirm restaurant location
function confirmRestaurantLocation() {
    if (!ownerSelectedLocation) {
        alert('Please select a location on the map');
        return;
    }
    
    // Get field IDs based on context
    const latFieldId = mapPickerContext === 'settings' ? 'settingsLatitude' : 'restaurantLat';
    const lonFieldId = mapPickerContext === 'settings' ? 'settingsLongitude' : 'restaurantLon';
    const addressFieldId = mapPickerContext === 'settings' ? 'settingsAddress' : 'restaurantAddress';
    
    // Update the form fields
    document.getElementById(latFieldId).value = ownerSelectedLocation.lat.toFixed(6);
    document.getElementById(lonFieldId).value = ownerSelectedLocation.lon.toFixed(6);
    
    const address = document.getElementById('mapSelectedAddress').textContent;
    document.getElementById(addressFieldId).value = address;
    
    // Close the modal
    closeRestaurantMapPicker();
    
    // Reset context to default
    mapPickerContext = 'signup';
    
    // Show confirmation
    alert('Location selected successfully!');
}

// Register restaurant owner
async function registerRestaurantOwner(event) {
    event.preventDefault();
    
    console.log('Form submitted, processing registration...');

    const passcode = document.getElementById('ownerPasscode').value;
    const name = document.getElementById('ownerName').value;
    const email = document.getElementById('ownerEmail').value;
    const password = document.getElementById('ownerPassword').value;
    const confirmPassword = document.getElementById('ownerConfirmPassword').value;
    const mobile = document.getElementById('ownerMobile').value;
    const restaurantName = document.getElementById('restaurantName').value;
    const restaurantAddress = document.getElementById('restaurantAddress').value;
    const cuisine = document.getElementById('restaurantCuisine').value;
    const totalTables = document.getElementById('totalTables').value;
    const openTime = document.getElementById('openTime').value;
    const closeTime = document.getElementById('closeTime').value;
    const latitude = document.getElementById('restaurantLat').value;
    const longitude = document.getElementById('restaurantLon').value;
    let logo = document.getElementById('restaurantLogo').value;
    
    // Convert Google Drive URL if provided
    if (logo) {
        logo = convertGoogleDriveUrl(logo);
    }

    // Validation
    if (!passcode || !name || !email || !password || !mobile || !restaurantName || !restaurantAddress || !cuisine) {
        showOwnerSignupError('Please fill in all required fields');
        return;
    }

    if (password !== confirmPassword) {
        showOwnerSignupError('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showOwnerSignupError('Password must be at least 6 characters');
        return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
        showOwnerSignupError('Please enter a valid 10-digit mobile number');
        return;
    }

    try {
        console.log('Sending registration request...');
        const response = await apiCall('/restaurant-owner/register', {
            method: 'POST',
            body: JSON.stringify({
                passcode,
                name,
                email,
                password,
                mobile,
                restaurantName,
                restaurantAddress,
                cuisine,
                totalTables: parseInt(totalTables) || 10,
                openTime,
                closeTime,
                latitude: parseFloat(latitude) || 0,
                longitude: parseFloat(longitude) || 0,
                logo
            })
        });

        console.log('Registration response:', response);

        if (response.success) {
            // Store token and login
            authToken = response.data.token;
            localStorage.setItem('authToken', authToken);
            
            // Fetch user data and show dashboard
            await loadCurrentUser();
            
            alert('Restaurant registered successfully! Awaiting admin approval.');
        } else {
            showOwnerSignupError(response.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showOwnerSignupError(error.message || 'Registration failed. Please try again.');
    }
}

function showOwnerSignupError(message) {
    const errorDiv = document.getElementById('ownerSignupError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// Load owner dashboard
async function loadOwnerDashboard() {
    try {
        const response = await apiCall('/restaurant-owner/dashboard');
        
        if (response.success) {
            ownerRestaurant = response.data.restaurant;
            
            // Update sidebar
            document.getElementById('sidebarRestaurantInfo').innerHTML = `
                <div class="restaurant-name">${ownerRestaurant.name}</div>
            `;
            
            // Update approval status
            const approvalStatus = document.getElementById('approvalStatus');
            if (ownerRestaurant.isApproved) {
                approvalStatus.innerHTML = '<span class="approval-status approved">Approved</span>';
            } else {
                approvalStatus.innerHTML = '<span class="approval-status pending">Pending Approval</span>';
            }
            
            // Update stats
            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon"></div>
                    <div class="stat-label">Total Orders</div>
                    <div class="stat-value">${response.data.analytics.totalOrders}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"></div>
                    <div class="stat-label">Total Revenue</div>
                    <div class="stat-value">₹${response.data.analytics.totalRevenue}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"></div>
                    <div class="stat-label">Pending Orders</div>
                    <div class="stat-value">${response.data.analytics.pendingOrders}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"></div>
                    <div class="stat-label">Tables</div>
                    <div class="stat-value">${ownerRestaurant.totalTables}</div>
                </div>
            `;
            
            // Update top dishes
            const topDishes = document.getElementById('topDishes');
            if (response.data.analytics.topDishes && response.data.analytics.topDishes.length > 0) {
                topDishes.innerHTML = response.data.analytics.topDishes.map(dish => `
                    <div class="top-dish-item">
                        <div class="top-dish-name">${dish.name}</div>
                        <div class="top-dish-stats">${dish.quantity} sold | ₹${dish.revenue}</div>
                    </div>
                `).join('');
            } else {
                topDishes.innerHTML = '<p style="color: var(--text-secondary);">No sales data yet</p>';
            }
            
            // Load dishes
            await loadOwnerDishes();
            
            // Load orders
            await loadOwnerOrders();
            
            // Load settings
            loadRestaurantSettings();
            
            console.log('Dashboard loaded successfully');
        } else {
            console.error('Dashboard load failed:', response.message);
            alert('Failed to load dashboard: ' + (response.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Failed to load dashboard: ' + error.message);
    }
}

// Show dashboard tab
function showOwnerDashboardTab(tabName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Update tabs
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.classList.add('hidden');
    });
    
    const tabs = {
        'overview': 'ownerOverviewTab',
        'dishes': 'ownerDishesTab',
        'orders': 'ownerOrdersTab',
        'qrcodes': 'ownerQRTab',
        'settings': 'ownerSettingsTab'
    };
    
    const activeTab = document.getElementById(tabs[tabName]);
    activeTab.classList.remove('hidden');
    activeTab.classList.add('active');
    
    // Load tab-specific data
    if (tabName === 'dishes') {
        loadOwnerDishes();
    } else if (tabName === 'orders') {
        loadOwnerOrders();
    } else if (tabName === 'qrcodes') {
        loadQRCodes();
    } else if (tabName === 'settings') {
        loadRestaurantSettings();
    }
}

// Load owner dishes
async function loadOwnerDishes() {
    console.log('=== LOADING OWNER DISHES ===');
    console.log('Owner Restaurant:', ownerRestaurant);
    
    if (!ownerRestaurant) {
        console.error('❌ No restaurant data available');
        return;
    }
    
    const dishesContainer = document.getElementById('dishesContainer');
    if (!dishesContainer) {
        console.error('❌ Dishes container not found');
        return;
    }
    
    console.log('Categories:', ownerRestaurant.categories);
    console.log('Categories length:', ownerRestaurant.categories ? ownerRestaurant.categories.length : 0);
    
    if (!ownerRestaurant.categories || ownerRestaurant.categories.length === 0) {
        dishesContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No dishes added yet. Click "Add New Dish" to get started.</p>';
        return;
    }
    
    const allDishes = [];
    ownerRestaurant.categories.forEach(category => {
        console.log('Processing category:', category.name, 'Items:', category.items ? category.items.length : 0);
        if (category.items && category.items.length > 0) {
            category.items.forEach(item => {
                allDishes.push({ ...item, category: category.name });
            });
        }
    });
    
    console.log('✅ Total dishes to render:', allDishes.length);
    
    if (allDishes.length === 0) {
        dishesContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No dishes added yet. Click "Add New Dish" to get started.</p>';
        return;
    }
    
    dishesContainer.innerHTML = allDishes.map(dish => `
        <div class="dish-card">
            ${dish.image ? `<img src="${dish.image}" alt="${dish.name}" class="dish-image">` : '<div class="dish-image dish-image-placeholder"></div>'}
            <div class="dish-content">
                <div class="dish-header">
                    <div class="dish-name">${dish.name}</div>
                    <span class="dish-veg-badge ${dish.vegetarian ? 'veg' : 'non-veg'}">
                        ${dish.vegetarian ? '🟢 Veg' : '🔴 Non-Veg'}
                    </span>
                </div>
                <div class="dish-description">${dish.description}</div>
                <div class="dish-footer">
                    <div class="dish-price">₹${dish.price}</div>
                    <div class="dish-actions">
                        <button class="icon-btn" onclick="editDish('${dish.id}')" title="Edit">✏️</button>
                        <button class="icon-btn" onclick="deleteDish('${dish.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Show add dish modal
function showAddDishModal() {
    document.getElementById('dishModalTitle').textContent = 'Add New Dish';
    document.getElementById('dishForm').reset();
    document.getElementById('dishId').value = '';
    document.getElementById('dishModal').classList.add('active');
}

// Close dish modal
function closeDishModal() {
    document.getElementById('dishModal').classList.remove('active');
}

// Edit dish
function editDish(dishId) {
    let dish = null;
    let categoryName = '';
    
    for (const category of ownerRestaurant.categories) {
        const found = category.items.find(item => item.id === dishId);
        if (found) {
            dish = found;
            categoryName = category.name;
            break;
        }
    }
    
    if (!dish) return;
    
    document.getElementById('dishModalTitle').textContent = 'Edit Dish';
    document.getElementById('dishId').value = dish.id;
    document.getElementById('dishCategory').value = categoryName;
    document.getElementById('dishName').value = dish.name;
    document.getElementById('dishDescription').value = dish.description;
    document.getElementById('dishPrice').value = dish.price;
    document.getElementById('dishVegetarian').value = dish.vegetarian ? 'true' : 'false';
    document.getElementById('dishImage').value = dish.image || '';
    
    document.getElementById('dishModal').classList.add('active');
}

// Save dish
async function saveDish(event) {
    event.preventDefault();
    
    const dishId = document.getElementById('dishId').value;
    const categoryName = document.getElementById('dishCategory').value;
    const name = document.getElementById('dishName').value;
    const description = document.getElementById('dishDescription').value;
    const price = parseFloat(document.getElementById('dishPrice').value);
    const vegetarian = document.getElementById('dishVegetarian').value === 'true';
    const image = document.getElementById('dishImage').value;
    
    const dishData = { name, description, price, vegetarian, image };
    
    try {
        if (dishId) {
            // Update existing dish
            const response = await apiCall(`/restaurant-owner/dishes/${dishId}`, {
                method: 'PUT',
                body: JSON.stringify(dishData)
            });
            
            if (response.success) {
                alert('Dish updated successfully!');
                closeDishModal();
                await loadOwnerDashboard();
            }
        } else {
            // Add new dish
            const response = await apiCall('/restaurant-owner/dishes', {
                method: 'POST',
                body: JSON.stringify({ categoryName, dish: dishData })
            });
            
            if (response.success) {
                alert('Dish added successfully!');
                closeDishModal();
                await loadOwnerDashboard();
            }
        }
    } catch (error) {
        alert('Error saving dish: ' + error.message);
    }
}

// Delete dish
async function deleteDish(dishId) {
    if (!confirm('Are you sure you want to delete this dish?')) return;
    
    try {
        const response = await apiCall(`/restaurant-owner/dishes/${dishId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            alert('Dish deleted successfully!');
            await loadOwnerDashboard();
        }
    } catch (error) {
        alert('Error deleting dish: ' + error.message);
    }
}

// Load owner orders
async function loadOwnerOrders(filter = 'all') {
    try {
        console.log('Loading orders with filter:', filter);
        let url = '/restaurant-owner/orders';
        if (filter !== 'all') {
            url += `?mode=${filter}`;
        }
        
        const response = await apiCall(url);
        
        if (response.success) {
            ownerOrders = response.data;
            console.log('Orders loaded:', ownerOrders.length);
            renderOwnerOrders();
        } else {
            console.error('Failed to load orders:', response.message);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Filter orders
function filterOrders(mode) {
    currentOrderFilter = mode;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload orders with filter
    loadOwnerOrders(mode);
}

// Render owner orders
function renderOwnerOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    
    if (ownerOrders.length === 0) {
        ordersContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No orders found</p>';
        return;
    }
    
    ordersContainer.innerHTML = ownerOrders.map(order => `
        <div class="order-card-owner">
            <div class="order-header-owner">
                <div class="order-id-section">
                    <strong>${order.orderId}</strong>
                    <span class="order-mode-badge ${order.mode}">${order.mode === 'dinein' ? 'Dine-In' : 'Delivery'}</span>
                    ${order.mode === 'dinein' ? `<span style="color: var(--text-secondary);">Table ${order.tableNumber}</span>` : ''}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 13px; color: var(--text-secondary);">${new Date(order.createdAt).toLocaleString()}</div>
                </div>
            </div>
            <div class="order-items-list">
                ${order.items.map(item => `
                    <div class="order-item-row">
                        <span>${item.itemName} × ${item.quantity}</span>
                        <span>₹${item.price * item.quantity}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-footer-owner">
                <div class="order-total">Total: ₹${order.total}</div>
                <select class="order-status-select" onchange="updateOrderStatus('${order.orderId}', this.value)">
                    <option value="received" ${order.status === 'received' ? 'selected' : ''}>Received</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="served" ${order.status === 'served' ? 'selected' : ''}>Served</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
        </div>
    `).join('');
}

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
        const response = await apiCall(`/restaurant-owner/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        if (response.success) {
            alert('Order status updated!');
            await loadOwnerOrders(currentOrderFilter);
        }
    } catch (error) {
        alert('Error updating order status: ' + error.message);
    }
}

// Load QR codes
async function loadQRCodes() {
    try {
        const response = await apiCall('/restaurant-owner/qr-codes');
        
        if (response.success) {
            const qrCodesGrid = document.getElementById('qrCodesGrid');
            qrCodesGrid.innerHTML = response.data.map(qr => `
                <div class="qr-card">
                    <div class="table-number">Table ${qr.tableNumber}</div>
                    <canvas id="qr-canvas-${qr.tableNumber}" class="qr-code-canvas"></canvas>
                    <div class="qr-url">${qr.url}</div>
                    <button class="download-qr-btn" onclick="downloadQRCode(${qr.tableNumber}, '${qr.url}')">
                        Download QR
                    </button>
                </div>
            `).join('');
            
            // Generate QR codes using a simple library (we'll add this)
            response.data.forEach(qr => {
                generateQRCode(`qr-canvas-${qr.tableNumber}`, qr.url);
            });
        }
    } catch (error) {
        console.error('Error loading QR codes:', error);
    }
}

// Simple QR code generation (placeholder - you can use a library like qrcodejs)
function generateQRCode(canvasId, text) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 150;
    canvas.height = 150;
    
    // Draw a placeholder box (in production, use a QR code library)
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 150, 150);
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', 75, 70);
    ctx.fillText('Placeholder', 75, 85);
    
    // In production, use: new QRCode(canvas, text);
}

// Download QR code
function downloadQRCode(tableNumber, url) {
    const canvas = document.getElementById(`qr-canvas-${tableNumber}`);
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `table-${tableNumber}-qr.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// Download all QR codes
function downloadAllQRCodes() {
    const tables = ownerRestaurant.totalTables;
    for (let i = 1; i <= tables; i++) {
        setTimeout(() => {
            const canvas = document.getElementById(`qr-canvas-${i}`);
            if (canvas) {
                const link = document.createElement('a');
                link.download = `table-${i}-qr.png`;
                link.href = canvas.toDataURL();
                link.click();
            }
        }, i * 100);
    }
}

// Load restaurant settings
function loadRestaurantSettings() {
    if (!ownerRestaurant) return;
    
    document.getElementById('settingsName').value = ownerRestaurant.name;
    document.getElementById('settingsAddress').value = ownerRestaurant.address || '';
    document.getElementById('settingsCuisine').value = ownerRestaurant.cuisine || '';
    document.getElementById('settingsOpenTime').value = ownerRestaurant.openTime || '09:00';
    document.getElementById('settingsCloseTime').value = ownerRestaurant.closeTime || '22:00';
    document.getElementById('settingsTotalTables').value = ownerRestaurant.totalTables || 10;
    
    // Load location if available
    if (ownerRestaurant.location && ownerRestaurant.location.coordinates) {
        const [lon, lat] = ownerRestaurant.location.coordinates;
        document.getElementById('settingsLatitude').value = lat;
        document.getElementById('settingsLongitude').value = lon;
    }
    
    // Load logo and show preview if available
    const logo = ownerRestaurant.logo || ownerRestaurant.cardImage || '';
    document.getElementById('settingsLogo').value = logo;
    
    if (logo) {
        // Show preview
        const logoPreviewImg = document.getElementById('settingsLogoPreviewImg');
        const logoPreview = document.getElementById('settingsLogoPreview');
        logoPreviewImg.src = logo;
        logoPreviewImg.onload = function() {
            logoPreview.classList.remove('hidden');
        };
        logoPreviewImg.onerror = function() {
            logoPreview.classList.add('hidden');
        };
    }
}

// Save restaurant settings
async function saveRestaurantSettings(event) {
    event.preventDefault();
    
    let logo = document.getElementById('settingsLogo').value;
    
    // Convert Google Drive URL if provided
    if (logo) {
        logo = convertGoogleDriveUrl(logo);
    }
    
    const latitude = document.getElementById('settingsLatitude').value;
    const longitude = document.getElementById('settingsLongitude').value;
    
    const settings = {
        name: document.getElementById('settingsName').value,
        address: document.getElementById('settingsAddress').value,
        cuisine: document.getElementById('settingsCuisine').value,
        openTime: document.getElementById('settingsOpenTime').value,
        closeTime: document.getElementById('settingsCloseTime').value,
        totalTables: parseInt(document.getElementById('settingsTotalTables').value),
        logo: logo
    };
    
    // Add location if provided
    if (latitude && longitude) {
        settings.location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
    }
    
    try {
        const response = await apiCall('/restaurant-owner/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        
        if (response.success) {
            alert('Settings saved successfully!');
            await loadOwnerDashboard();
        }
    } catch (error) {
        alert('Error saving settings: ' + error.message);
    }
}

// Initialize restaurant owner forms
function initOwnerForms() {
    const ownerSignupForm = document.getElementById('ownerSignupForm');
    if (ownerSignupForm) {
        console.log('Attaching event listener to owner signup form');
        ownerSignupForm.addEventListener('submit', registerRestaurantOwner);
    } else {
        console.warn('Owner signup form not found');
    }
    
    const dishForm = document.getElementById('dishForm');
    if (dishForm) {
        dishForm.addEventListener('submit', saveDish);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOwnerForms);
} else {
    // DOM is already loaded
    initOwnerForms();
}

// Initialize settings form separately
const settingsForm = document.getElementById('restaurantSettingsForm');
if (settingsForm) {
    settingsForm.addEventListener('submit', saveRestaurantSettings);
}
