let currentRestaurantId = null;
let currentCategoryId = null;
let currentMenuItemId = null;

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.remove('hidden');
    event.target.classList.add('active');
        switch(tabName) {
        case 'restaurants':
            loadRestaurants();
            break;
        case 'categories':
            loadRestaurantsForSelect('restaurantSelect');
            loadCategories();
            break;
        case 'menu':
            loadRestaurantsForSelect('menuRestaurantSelect');
            loadMenuItems();
            break;
    }
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function loadRestaurants() {
    try {
        const response = await fetch('/api/restaurants');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('restaurantsTableBody');
            tbody.innerHTML = '';
            
            data.data.forEach(restaurant => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${restaurant.emoji || '🍽️'} ${restaurant.name}</td>
                    <td>${restaurant.cuisine || 'N/A'}</td>
                    <td>${'★'.repeat(Math.round(restaurant.rating || 0))} (${restaurant.rating || 'N/A'})</td>
                    <td>${restaurant.deliveryTime || 'N/A'}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-edit" onclick="editRestaurant('${restaurant.id}')">Edit</button>
                        <button class="btn btn-sm btn-delete" onclick="confirmDelete('restaurant', '${restaurant.id}', '${restaurant.name}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        alert('Failed to load restaurants. Please try again.');
    }
}

function showAddRestaurantModal() {
    document.getElementById('restaurantModalTitle').textContent = 'Add New Restaurant';
    document.getElementById('restaurantForm').reset();
    document.getElementById('restaurantId').value = '';
    openModal('restaurantModal');
}

async function editRestaurant(restaurantId) {
    try {
        const response = await fetch(`/api/restaurants/${restaurantId}`);
        const data = await response.json();
        
        if (data.success) {
            const restaurant = data.data;
            document.getElementById('restaurantModalTitle').textContent = 'Edit Restaurant';
            document.getElementById('restaurantId').value = restaurant.id;
            document.getElementById('restaurantName').value = restaurant.name;
            document.getElementById('restaurantEmoji').value = restaurant.emoji || '';
            document.getElementById('restaurantCuisine').value = restaurant.cuisine || '';
            document.getElementById('restaurantImage').value = restaurant.cardImage || '';
            document.getElementById('restaurantRating').value = restaurant.rating || '4.5';
            document.getElementById('deliveryTime').value = restaurant.deliveryTime || '20-30 min';
            
            openModal('restaurantModal');
        }
    } catch (error) {
        console.error('Error loading restaurant:', error);
        alert('Failed to load restaurant details. Please try again.');
    }
}

async function saveRestaurant(event) {
    event.preventDefault();
    
    const restaurant = {
        name: document.getElementById('restaurantName').value,
        emoji: document.getElementById('restaurantEmoji').value,
        cuisine: document.getElementById('restaurantCuisine').value,
        cardImage: document.getElementById('restaurantImage').value,
        rating: parseFloat(document.getElementById('restaurantRating').value),
        deliveryTime: document.getElementById('deliveryTime').value
    };
    
    const restaurantId = document.getElementById('restaurantId').value;
    const method = restaurantId ? 'PUT' : 'POST';
    const url = restaurantId ? `/api/restaurants/${restaurantId}` : '/api/restaurants';
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(restaurant)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('restaurantModal');
            loadRestaurants();
            // Also refresh restaurant selects in other tabs
            loadRestaurantsForSelect('restaurantSelect');
            loadRestaurantsForSelect('menuRestaurantSelect');
        } else {
            alert(data.message || 'Failed to save restaurant');
        }
    } catch (error) {
        console.error('Error saving restaurant:', error);
        alert('Failed to save restaurant. Please try again.');
    }
}

async function loadRestaurantsForSelect(selectId) {
    try {
        const response = await fetch('/api/restaurants');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById(selectId);
            // Keep the first option (Select Restaurant)
            select.innerHTML = selectId === 'restaurantSelect' 
                ? '<option value="">Select Restaurant</option>' 
                : '<option value="">All Restaurants</option>';
            
            data.data.forEach(restaurant => {
                const option = document.createElement('option');
                option.value = restaurant.id;
                option.textContent = restaurant.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading restaurants for select:', error);
    }
}

async function loadCategories() {
    const restaurantId = document.getElementById('restaurantSelect').value;
    if (!restaurantId) return;
    
    try {
        const response = await fetch(`/api/restaurants/${restaurantId}`);
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('categoriesTableBody');
            tbody.innerHTML = '';
            
            data.data.categories.forEach(category => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${category.name}</td>
                    <td>${data.data.name}</td>
                    <td>${category.items ? category.items.length : 0} items</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-edit" onclick="editCategory('${restaurantId}', '${category._id}')">Edit</button>
                        <button class="btn btn-sm btn-delete" onclick="confirmDelete('category', '${restaurantId}', '${category.name}', '${category._id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Failed to load categories. Please try again.');
    }
}

function showAddCategoryModal() {
    const restaurantId = document.getElementById('restaurantSelect').value;
    if (!restaurantId) {
        alert('Please select a restaurant first');
        return;
    }
    
    document.getElementById('categoryModalTitle').textContent = 'Add New Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryRestaurantId').value = restaurantId;
    openModal('categoryModal');
}

async function editCategory(restaurantId, categoryId) {
    try {
        const response = await fetch(`/api/restaurants/${restaurantId}`);
        const data = await response.json();
        
        if (data.success) {
            const category = data.data.categories.find(cat => cat._id === categoryId);
            if (category) {
                document.getElementById('categoryModalTitle').textContent = 'Edit Category';
                document.getElementById('categoryId').value = category._id;
                document.getElementById('categoryRestaurantId').value = restaurantId;
                document.getElementById('categoryName').value = category.name;
                
                openModal('categoryModal');
            }
        }
    } catch (error) {
        console.error('Error loading category:', error);
        alert('Failed to load category details. Please try again.');
    }
}

async function saveCategory(event) {
    event.preventDefault();
    
    const restaurantId = document.getElementById('categoryRestaurantId').value;
    const categoryId = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value;
    
    try {
        const url = categoryId 
            ? `/api/restaurants/${restaurantId}/categories/${categoryId}`
            : `/api/restaurants/${restaurantId}/categories`;
            
        const method = categoryId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('categoryModal');
            loadCategories();
            // Refresh menu items if on that tab
            if (document.getElementById('adminMenuItems') && !document.getElementById('adminMenuItems').classList.contains('hidden')) {
                loadMenuItems();
            }
        } else {
            alert(data.message || 'Failed to save category');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Failed to save category. Please try again.');
    }
}

// Menu Item Management
async function loadMenuItems() {
    const restaurantId = document.getElementById('menuRestaurantSelect').value;
    const categoryId = document.getElementById('categorySelect').value;
    
    if (!restaurantId) return;
    
    try {
        const response = await fetch(`/api/restaurants/${restaurantId}`);
        const data = await response.json();
        
        if (data.success) {
            // Update category select
            const categorySelect = document.getElementById('categorySelect');
            const currentCategory = categorySelect.value;
            
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            data.data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category._id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
            
            // Restore selected category if still available
            if (currentCategory) {
                categorySelect.value = currentCategory;
            }
            
            // Filter items by selected category if any
            let items = [];
            data.data.categories.forEach(category => {
                if (!categoryId || category._id === categoryId) {
                    category.items.forEach(item => {
                        items.push({
                            ...item,
                            categoryName: category.name,
                            categoryId: category._id
                        });
                    });
                }
            });
            
            // Display items
            const tbody = document.getElementById('menuItemsTableBody');
            tbody.innerHTML = '';
            
            items.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td class="truncate">${item.description || 'No description'}</td>
                    <td>$${item.price?.toFixed(2) || '0.00'}</td>
                    <td>${item.categoryName || 'N/A'}</td>
                    <td>${item.vegetarian ? '✅' : '❌'}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-edit" onclick="editMenuItem('${restaurantId}', '${item.categoryId}', '${item._id}')">Edit</button>
                        <button class="btn btn-sm btn-delete" onclick="confirmDelete('menuItem', '${restaurantId}', '${item.name}', '${item._id}', '${item.categoryId}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
        alert('Failed to load menu items. Please try again.');
    }
}

function showAddMenuItemModal() {
    const restaurantId = document.getElementById('menuRestaurantSelect').value;
    if (!restaurantId) {
        alert('Please select a restaurant first');
        return;
    }
    
    const categoryId = document.getElementById('categorySelect').value;
    if (!categoryId) {
        alert('Please select a category first');
        return;
    }
    
    document.getElementById('menuItemModalTitle').textContent = 'Add Menu Item';
    document.getElementById('menuItemForm').reset();
    document.getElementById('menuItemId').value = '';
    document.getElementById('menuItemCategoryId').value = categoryId;
    openModal('menuItemModal');
}

async function editMenuItem(restaurantId, categoryId, itemId) {
    try {
        const response = await fetch(`/api/restaurants/${restaurantId}`);
        const data = await response.json();
        
        if (data.success) {
            const category = data.data.categories.find(cat => cat._id === categoryId);
            if (category) {
                const item = category.items.find(i => i._id === itemId);
                if (item) {
                    document.getElementById('menuItemModalTitle').textContent = 'Edit Menu Item';
                    document.getElementById('menuItemId').value = item._id;
                    document.getElementById('menuItemCategoryId').value = categoryId;
                    document.getElementById('itemName').value = item.name;
                    document.getElementById('itemDescription').value = item.description || '';
                    document.getElementById('itemPrice').value = item.price || '0';
                    document.getElementById('itemImage').value = item.image || '';
                    document.getElementById('itemVegetarian').checked = item.vegetarian || false;
                    
                    openModal('menuItemModal');
                }
            }
        }
    } catch (error) {
        console.error('Error loading menu item:', error);
        alert('Failed to load menu item details. Please try again.');
    }
}

async function saveMenuItem(event) {
    event.preventDefault();
    
    const restaurantId = document.getElementById('menuRestaurantSelect').value;
    const categoryId = document.getElementById('menuItemCategoryId').value;
    const itemId = document.getElementById('menuItemId').value;
    
    const menuItem = {
        name: document.getElementById('itemName').value,
        description: document.getElementById('itemDescription').value,
        price: parseFloat(document.getElementById('itemPrice').value) || 0,
        image: document.getElementById('itemImage').value,
        vegetarian: document.getElementById('itemVegetarian').checked
    };
    
    try {
        const url = itemId
            ? `/api/restaurants/${restaurantId}/categories/${categoryId}/items/${itemId}`
            : `/api/restaurants/${restaurantId}/categories/${categoryId}/items`;
            
        const method = itemId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(menuItem)
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('menuItemModal');
            loadMenuItems();
        } else {
            alert(data.message || 'Failed to save menu item');
        }
    } catch (error) {
        console.error('Error saving menu item:', error);
        alert('Failed to save menu item. Please try again.');
    }
}

// Delete Confirmation
function confirmDelete(type, id, name, ...extraParams) {
    currentRestaurantId = id;
    currentCategoryId = extraParams[0];
    currentMenuItemId = extraParams[1];
    
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete ${type} "${name}"?`;
    
    const confirmButton = document.getElementById('confirmButton');
    confirmButton.onclick = async () => {
        try {
            let url = '';
            
            switch(type) {
                case 'restaurant':
                    url = `/api/restaurants/${id}`;
                    break;
                case 'category':
                    url = `/api/restaurants/${id}/categories/${extraParams[0]}`;
                    break;
                case 'menuItem':
                    url = `/api/restaurants/${id}/categories/${extraParams[0]}/items/${extraParams[1]}`;
                    break;
            }
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                closeModal('confirmModal');
                
                // Refresh the appropriate section
                if (type === 'restaurant') {
                    loadRestaurants();
                    loadRestaurantsForSelect('restaurantSelect');
                    loadRestaurantsForSelect('menuRestaurantSelect');
                } else if (type === 'category') {
                    loadCategories();
                    loadMenuItems(); // Refresh menu items if on that tab
                } else if (type === 'menuItem') {
                    loadMenuItems();
                }
            } else {
                alert(data.message || `Failed to delete ${type}`);
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            alert(`Failed to delete ${type}. Please try again.`);
        }
    };
    
    openModal('confirmModal');
}

// Initialize admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is admin
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        window.location.href = '/';
        return;
    }
    
    // Load initial data
    loadRestaurants();
    loadRestaurantsForSelect('restaurantSelect');
    loadRestaurantsForSelect('menuRestaurantSelect');
    
    // Show admin dashboard
    document.getElementById('adminPage').classList.remove('hidden');
    document.getElementById('homePage').classList.add('hidden');
    
    // Set up event listeners for category select change
    document.getElementById('menuRestaurantSelect').addEventListener('change', () => {
        const restaurantId = document.getElementById('menuRestaurantSelect').value;
        if (restaurantId) {
            loadCategories();
        }
    });
});
