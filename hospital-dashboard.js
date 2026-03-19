// Hospital Dashboard Initialization
let inventoryChartInstance = null; // Global variable for inventory chart

// API Configuration
const storedApiBaseUrl = localStorage.getItem('apiBaseUrl');
// Normalize old/stale local config that still points to port 3001.
const API_BASE_URL = storedApiBaseUrl
    ? storedApiBaseUrl.replace('localhost:3001', 'localhost:3000')
    : 'http://localhost:3000/api';

// Helper function to get current hospital user
function getCurrentHospitalUser() {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API call failed');
        }
        
        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Format date to simple readable format
function formatSimpleDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Format time to simple readable format
function formatSimpleTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    let hours = date.getHours();
    let minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Hospital Dashboard initializing via DOMContentLoaded...');
    initializeHospitalDashboardFull();
});

// Also provide a manual init function for when loaded via AJAX
window.initializeHospitalDashboardManually = function() {
    console.log('Hospital Dashboard initializing manually...');
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        initializeHospitalDashboardFull();
    }, 100);
};

// Full initialization function
function initializeHospitalDashboardFull() {
    console.log('Hospital Dashboard full initialization starting...');
    initializeHospitalDashboard();
    loadHospitalProfile();
    // Immediately update hospital name display on page load
    updateHospitalNameDisplay();
    initializeCharts();
    loadBloodInventory();
    loadRecentRequests();
    loadAppointments();
    loadDonations();
    setupSidebarMenu();
    startLiveUpdates();
    console.log('Hospital Dashboard initialization complete!');
}

// Setup Sidebar Menu
function setupSidebarMenu() {
    hideHomePageElements(); // Hide home page when dashboard loads
    hideAllSections(); // Hide all sections on load
    showSection('overview'); // Show overview section by default
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default anchor behavior
            
            if (!this.classList.contains('logout')) {
                // Remove active class from all items
                menuItems.forEach(i => i.classList.remove('active'));
                // Add active class to clicked item
                this.classList.add('active');
                
                // Add visual feedback
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 100);
            }
        });
    });
}

// Scroll to Section
function scrollToSection(sectionId) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.menu-item')?.classList.add('active');
    
    hideAllSections(); // Hide all sections first
    showSection(sectionId); // Show only the selected section
    
    const section = document.getElementById(sectionId);
    if (section) {
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // Load section-specific data
            if (sectionId === 'analytics') {
                loadAnalytics();
            } else if (sectionId === 'inventory') {
                loadBloodInventory();
            } else if (sectionId === 'requests') {
                loadRecentRequests();
            } else if (sectionId === 'appointments') {
                loadAppointments();
            } else if (sectionId === 'donations') {
                loadDonations();
            } else if (sectionId === 'hospital-requests') {
                loadHospitalRequests();
            } else if (sectionId === 'hospital-blood-requests') {
                loadOtherHospitalBloodRequests();
            } else if (sectionId === 'overview') {
                loadDashboardData();
                initializeCharts();
            }
        }
    } else {
        console.warn(`Section '${sectionId}' not found`);
    }
}

// Hide all sections
function hideAllSections() {
    const sections = document.querySelectorAll('.content-area .section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
}

// Show specific section
function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
}

// Initialize Hospital Dashboard
function initializeHospitalDashboard() {
    // Check if hospital user is logged in
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.type !== 'hospital') {
        window.location.href = 'index.html';
        return;
    }
    
    // Load dashboard data
    loadDashboardData();
}

// Load Hospital Profile from localStorage
function loadHospitalProfile() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const hospitalName = user.hospitalName || user.name || 'Hospital';
    const hospitalType = user.hospitalType || '--';
    
    // Update header
    document.getElementById('page-title').textContent = hospitalName;
    document.getElementById('page-subtitle').textContent = `Welcome back to ${hospitalName}`;
    document.getElementById('user-name').textContent = hospitalName;
}

// Update Hospital Name Display (called immediately after login)
function updateHospitalNameDisplay() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const hospitalName = user.hospitalName || user.name || 'Hospital';
    
    // Update user name display
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        userNameEl.textContent = hospitalName;
        console.log('✓ Updated user-name to: ' + hospitalName);
    }
}

// Load Dashboard Data
function loadDashboardData() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const inventory = JSON.parse(localStorage.getItem(user.email + '_inventory')) || {};
    
    // Initialize timestamps if not exist
    let inventoryTimestamps = JSON.parse(localStorage.getItem(user.email + '_inventory_timestamps'));
    if (!inventoryTimestamps) {
        inventoryTimestamps = {};
        Object.keys(inventory).forEach(type => {
            inventoryTimestamps[type] = new Date().toISOString();
        });
        localStorage.setItem(user.email + '_inventory_timestamps', JSON.stringify(inventoryTimestamps));
    }
    
    // Calculate stats
    const totalBloodUnits = Object.values(inventory).reduce((sum, units) => sum + units, 0);
    const connectedDonors = localStorage.getItem(user.email + '_donors_count') || 150;
    const activeRequests = localStorage.getItem(user.email + '_active_requests') || 8;
    const fulfilledOrders = localStorage.getItem(user.email + '_fulfilled_orders') || 42;
    
    // Update stat cards with animation
    updateStatWithAnimation('total-blood-units', totalBloodUnits || 35);
    updateStatWithAnimation('connected-donors', connectedDonors);
    updateStatWithAnimation('active-requests', activeRequests);
    updateStatWithAnimation('fulfilled-orders', fulfilledOrders);
}

// Update Stat with Animation
function updateStatWithAnimation(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const oldValue = parseInt(element.textContent) || 0;
    
    if (oldValue !== newValue) {
        // Add pulse animation to stat card or stat box
        const card = element.closest('.stat-card') || element.closest('.stat-box');
        if (card) {
            card.classList.add('updating');
            setTimeout(() => card.classList.remove('updating'), 500);
        }
        
        // Animate value change
        animateValue(element, oldValue, newValue, 800);
    }
}

// Load Blood Inventory
function loadBloodInventory() {
    const user = getCurrentHospitalUser();
    if (!user || !user.id) {
        console.error('No hospital user found');
        return;
    }
    
    // Fetch inventory from database API
    apiCall(`/hospitals/${user.id}/inventory`)
        .then(inventoryData => {
            console.log('Inventory loaded from database:', inventoryData.length);
            displayInventory(inventoryData);
        })
        .catch(error => {
            console.error('Failed to load inventory from database:', error);
            // Fallback to localStorage
            loadInventoryFromLocalStorage(user);
        });
}

function displayInventory(inventoryData) {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    
    // Create a map from the inventory data
    const inventoryMap = {};
    inventoryData.forEach(item => {
        inventoryMap[item.blood_type] = item.units_available || 0;
    });
    
    let totalUnits = 0;
    
    bloodTypes.forEach(type => {
        const units = inventoryMap[type] || 0;
        totalUnits += units;
        
        let status = '✅ Adequate';
        let actionRequired = '✔️ No action needed';
        
        if (units > 5) {
            status = '✅ Adequate';
            actionRequired = '✔️ No action needed';
        } else if (units > 2) {
            status = '⚠️ Low';
            actionRequired = '⚠️ Reorder needed';
        } else {
            status = '🔴 Critical';
            actionRequired = '🚨 Urgent reorder';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${type}</strong></td>
            <td><span class="unit-count">${units}</span> units</td>
            <td><span class="live-timestamp">🕐 Just now</span></td>
        `;
        tableBody.appendChild(row);
    });
    
    // Update timestamp
    const inventoryUpdated = document.getElementById('inventory-updated');
    if (inventoryUpdated) {
        const now = new Date();
        inventoryUpdated.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

function loadInventoryFromLocalStorage(user) {
    const inventory = JSON.parse(localStorage.getItem(user.email + '_inventory')) || {
        'O+': 8,
        'O-': 4,
        'A+': 6,
        'A-': 3,
        'B+': 7,
        'B-': 2,
        'AB+': 5,
        'AB-': 2
    };
    
    const inventoryData = Object.keys(inventory).map(bloodType => ({
        blood_type: bloodType,
        units_available: inventory[bloodType]
    }));
    
    displayInventory(inventoryData);
}

// Load Recent Requests - Connected to Blood Request form
function loadRecentRequests() {
    // Get all blood requests from the global localStorage (submitted from home page)
    const allRequests = JSON.parse(localStorage.getItem('bloodRequests')) || [];
    
    const tableBody = document.getElementById('requests-table-body');
    tableBody.innerHTML = '';
    
    // Calculate stats
    let totalRequests = allRequests.length;
    let pendingCount = 0;
    let fulfilledCount = 0;
    let urgentCount = 0;
    
    if (totalRequests === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #999;">No blood requests yet.</td></tr>';
        // Update stats
        updateStatWithAnimation('requests-total-count', 0);
        updateStatWithAnimation('requests-pending-count', 0);
        updateStatWithAnimation('requests-fulfilled-count', 0);
        updateStatWithAnimation('requests-urgent-count', 0);
        return;
    }
    
    // Display all requests
    allRequests.forEach((req, index) => {
        // Calculate stats
        if (req.status === 'Pending') pendingCount++;
        if (req.status === 'Fulfilled') fulfilledCount++;
        if (req.urgency === 'Urgent') urgentCount++;
        
        // Format date
        const reqDate = new Date(req.date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Determine status color and icon
        let statusColor = '#ff9800';
        let statusIcon = '⏳';
        if (req.status === 'Fulfilled') {
            statusColor = '#4caf50';
            statusIcon = '✅';
        } else if (req.status === 'In Progress') {
            statusColor = '#2196F3';
            statusIcon = '⏳';
        }
        
        // Determine urgency color and icon
        let urgencyColor = '#4caf50';
        let urgencyIcon = '✔️';
        if (req.urgency === 'Urgent') {
            urgencyColor = '#f44336';
            urgencyIcon = '🚨';
        } else if (req.urgency === 'High') {
            urgencyColor = '#ff9800';
            urgencyIcon = '⚠️';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reqDate}</td>
            <td><strong>${req.patientName}</strong></td>
            <td><strong style="color: #ff6b6b;">${req.bloodType}</strong></td>
            <td>${req.units} units</td>
            <td><span style="color: ${urgencyColor}; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;">${urgencyIcon} ${req.urgency}</span></td>
            <td>
                <div style="font-size: 0.85em;">
                    <div>📞 ${req.contact}</div>
                    <div>📧 ${req.email}</div>
                </div>
            </td>
            <td><span style="color: ${statusColor}; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;">${statusIcon} ${req.status}</span></td>
            <td>
                <button onclick="viewBloodRequestDetails(${index})" style="padding: 6px 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px;">View</button>
                <button onclick="fulfillBloodRequest(${index})" style="padding: 6px 12px; ${req.status === 'Fulfilled' ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${req.status === 'Fulfilled' ? 'disabled' : ''}>Fulfill</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Update stats
    updateStatWithAnimation('requests-total-count', totalRequests);
    updateStatWithAnimation('requests-pending-count', pendingCount);
    updateStatWithAnimation('requests-fulfilled-count', fulfilledCount);
    updateStatWithAnimation('requests-urgent-count', urgentCount);
    
    // Update timestamp
    const requestsUpdated = document.getElementById('requests-updated');
    if (requestsUpdated) {
        const now = new Date();
        requestsUpdated.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}



// Initialize Charts
function initializeCharts() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const inventory = JSON.parse(localStorage.getItem(user.email + '_inventory')) || {
        'O+': 8,
        'O-': 4,
        'A+': 6,
        'A-': 3,
        'B+': 7,
        'B-': 2,
        'AB+': 5,
        'AB-': 2
    };
    
    // Blood Inventory Chart
    const inventoryCtx = document.getElementById('bloodInventoryChart');
    if (inventoryCtx) {
        new Chart(inventoryCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(inventory),
                datasets: [{
                    label: 'Blood Units',
                    data: Object.values(inventory),
                    backgroundColor: [
                        '#ff6b6b',
                        '#ff5252',
                        '#f50057',
                        '#ff1744',
                        '#d50000',
                        '#c41c3b',
                        '#f44336',
                        '#e53935'
                    ],
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10
                    }
                }
            }
        });
    }
    
    // Requests Trend Chart
    const trendCtx = document.getElementById('requestsTrendChart');
    if (trendCtx) {
        new Chart(trendCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Blood Requested',
                        data: [12, 15, 10, 18, 14, 9, 7],
                        backgroundColor: '#ff6b6b',
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Blood Received',
                        data: [10, 14, 9, 17, 13, 8, 6],
                        backgroundColor: '#4caf50',
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Update Inventory Chart - Real-time
function updateInventoryChart(inventory, bloodTypes) {
    const chartCanvas = document.getElementById('inventoryRealTimeChart');
    if (!chartCanvas) return;
    
    const inventoryData = bloodTypes.map(type => inventory[type] || 0);
    
    // Color code based on stock level
    const backgroundColors = inventoryData.map(units => {
        if (units > 5) return '#4caf50'; // Green - Adequate
        else if (units > 2) return '#ff9800'; // Orange - Low
        else return '#f44336'; // Red - Critical
    });
    
    // Destroy existing chart if it exists
    if (inventoryChartInstance) {
        inventoryChartInstance.destroy();
    }
    
    // Create new chart
    inventoryChartInstance = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: bloodTypes,
            datasets: [{
                label: 'Available Units',
                data: inventoryData,
                backgroundColor: backgroundColors,
                borderRadius: 6,
                borderSkipped: false,
                borderColor: 'rgba(0,0,0,0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Units'
                    }
                }
            }
        }
    });
}

// View Blood Inventory
// View Blood Request Details
function viewBloodRequestDetails(index) {
    // Get all blood requests from global storage
    const allRequests = JSON.parse(localStorage.getItem('bloodRequests')) || [];
    
    if (!allRequests[index]) {
        alert('Request not found');
        return;
    }
    
    const req = allRequests[index];
    
    // Format date and time
    const reqDate = new Date(req.date);
    const formattedDate = reqDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const formattedTime = reqDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Determine status color and badge
    let statusColor = '#ff9800';
    let statusBgColor = 'rgba(255, 152, 0, 0.1)';
    if (req.status === 'Fulfilled') {
        statusColor = '#4caf50';
        statusBgColor = 'rgba(76, 175, 80, 0.1)';
    } else if (req.status === 'In Progress') {
        statusColor = '#2196F3';
        statusBgColor = 'rgba(33, 150, 243, 0.1)';
    }
    
    // Create modal content
    const modalContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
            <!-- Donation Record Section -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2196F3; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span>✏️</span> Patient Request Record
                </h3>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Request ID:</div>
                        <div style="color: #666;">${req.requestId || 'N/A'}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Date:</div>
                        <div style="color: #666;">${formattedDate}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Time:</div>
                        <div style="color: #666;">${formattedTime}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px;">
                        <div style="font-weight: bold; color: #333;">Status:</div>
                        <div>
                            <span style="padding: 4px 12px; background: ${statusBgColor}; color: ${statusColor}; border-radius: 4px; font-weight: bold; font-size: 0.9em;">
                                ${req.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Patient Information Section -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #ff6b6b; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span>👤</span> Patient Information
                </h3>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Patient Name:</div>
                        <div style="color: #666;">${req.patientName}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Contact:</div>
                        <div style="color: #666;">📞 ${req.contact}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Email:</div>
                        <div style="color: #666;">📧 ${req.email}</div>
                    </div>
                </div>
            </div>
            
            <!-- Blood Details Section -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #4caf50; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span>🩸</span> Blood Details
                </h3>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Blood Type:</div>
                        <div style="color: #ff6b6b; font-weight: bold; font-size: 1.1em;">${req.bloodType}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Units Required:</div>
                        <div style="color: #666;">${req.units} units</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px;">
                        <div style="font-weight: bold; color: #333;">Urgency:</div>
                        <div style="color: ${req.urgency === 'Urgent' ? '#f44336' : '#ff9800'}; font-weight: bold;">
                            ${req.urgency === 'Urgent' ? '🚨' : '⚠️'} ${req.urgency}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Medical Notes Section -->
            <div style="margin-bottom: 10px;">
                <h3 style="color: #9c27b0; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <span>📋</span> Medical Notes
                </h3>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                    <div style="color: #666; font-style: italic;">
                        ${req.notes || 'None'}
                    </div>
                </div>
            </div>
            
            ${req.fulfilledBy ? `
            <!-- Fulfillment Information -->
            <div style="margin-bottom: 10px; padding-top: 15px; border-top: 2px solid #e0e0e0;">
                <h3 style="color: #4caf50; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                    <span>✅</span> Fulfillment Information
                </h3>
                <div style="background: rgba(76, 175, 80, 0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: #333;">Fulfilled By:</div>
                        <div style="color: #666;">${req.fulfilledBy}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px;">
                        <div style="font-weight: bold; color: #333;">Fulfilled Date:</div>
                        <div style="color: #666;">${new Date(req.fulfilledDate).toLocaleString('en-US')}</div>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    // Open modal
    document.getElementById('detail-view-title').innerHTML = '🩸 Blood Donation Details';
    document.getElementById('detail-view-content').innerHTML = modalContent;
    document.getElementById('detailViewModal').style.display = 'flex';
}

// Close Detail View Modal
function closeDetailViewModal() {
    document.getElementById('detailViewModal').style.display = 'none';
}

// Fulfill Blood Request - Connected to home page blood requests
function fulfillBloodRequest(index) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Please login as a hospital');
        return;
    }
    
    // Get all blood requests from global storage
    let allRequests = JSON.parse(localStorage.getItem('bloodRequests')) || [];
    
    if (!allRequests[index]) {
        alert('Request not found');
        return;
    }
    
    const request = allRequests[index];
    
    // Check if hospital has enough inventory
    let inventory = JSON.parse(localStorage.getItem(user.email + '_inventory')) || {};
    const availableUnits = inventory[request.bloodType] || 0;
    
    if (availableUnits < request.units) {
        alert(`❌ Insufficient inventory!\n\nNeeded: ${request.units} units of ${request.bloodType}\nAvailable: ${availableUnits} units\n\nPlease wait for more donations or partially fulfill the request.`);
        return;
    }
    
    // Ask for confirmation
    if (!confirm(`✅ Fulfill this blood request?\n\nPatient: ${request.patientName}\nBlood Type: ${request.bloodType}\nUnits: ${request.units}\n\nYour hospital will release ${request.units} units of ${request.bloodType} blood.`)) {
        return;
    }
    
    // Update request status
    allRequests[index].status = 'Fulfilled';
    allRequests[index].fulfilledBy = user.hospitalName || user.name || 'Hospital';
    allRequests[index].fulfilledDate = new Date().toISOString();
    localStorage.setItem('bloodRequests', JSON.stringify(allRequests));
    
    // Update hospital inventory - decrease blood units
    inventory[request.bloodType] = Math.max(0, inventory[request.bloodType] - request.units);
    
    // Update inventory timestamps
    let inventoryTimestamps = JSON.parse(localStorage.getItem(user.email + '_inventory_timestamps')) || {};
    inventoryTimestamps[request.bloodType] = new Date().toISOString();
    
    localStorage.setItem(user.email + '_inventory', JSON.stringify(inventory));
    localStorage.setItem(user.email + '_inventory_timestamps', JSON.stringify(inventoryTimestamps));
    
    // Reload all views
    loadRecentRequests();
    loadBloodInventory();
    loadDashboardData();
    
    // Show success notification
    showLiveNotification(`✅ Blood request fulfilled! ${request.units} units of ${request.bloodType} released to ${request.patientName}`, 'success');
    alert(`✅ Blood Request Fulfilled Successfully!\n\nPatient: ${request.patientName}\nBlood Type: ${request.bloodType}\nUnits Released: ${request.units}\n\nThe patient will be notified at ${request.contact}`);
}

// Logout
function logout() {
    // Clear all user and hospital data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentHospital');
    
    console.log('✓ Hospital logout complete');
    
    // Try to use dynamic loading if available (app is running in index.html)
    if (typeof closeSection === 'function') {
        // Close the current section and show home
        closeSection();
    } else {
        // Fallback: Direct redirect to index.html
        window.location.href = '../html/index.html';
    }
}

// ==================== APPOINTMENTS FUNCTIONALITY ====================

// Open Appointment Modal
function openAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        setupDonorEmailAutofill();
        document.getElementById('appointmentForm').reset();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('appt-date').value = today;
        document.getElementById('appt-date').min = today;
        
        // Setup form submit
        document.getElementById('appointmentForm').onsubmit = function(e) {
            e.preventDefault();
            saveAppointment();
        };
        
        // Show notification
        showLiveNotification('📅 Appointment scheduling form opened', 'info');
    } else {
        console.error('Appointment modal not found');
        alert('Error: Appointment modal not found. Please refresh the page.');
    }
}

// Close Appointment Modal
function closeAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Save Appointment
function saveAppointment() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    // Get existing appointments to determine next ID
    let appointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
    
    // Calculate next sequential ID (starting from 1)
    let nextId = 1;
    if (appointments.length > 0) {
        const maxId = Math.max(...appointments.map(a => a.id || 0));
        nextId = maxId + 1;
    }
    
    const appointmentData = {
        id: nextId,
        patientName: document.getElementById('appt-patient-name').value,
        bloodType: document.getElementById('appt-blood-type').value,
        date: document.getElementById('appt-date').value,
        time: document.getElementById('appt-time').value,
        appointmentType: document.getElementById('appt-type').value,
        contact: document.getElementById('appt-contact').value,
        notes: document.getElementById('appt-notes').value || 'None',
        status: 'Scheduled',
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    appointments.unshift(appointmentData);
    localStorage.setItem(user.email + '_appointments', JSON.stringify(appointments));
    
    closeAppointmentModal();
    loadAppointments();
    updateChartTimestamp();
    showLiveNotification('✅ Appointment scheduled for ' + appointmentData.patientName + ' on ' + appointmentData.date, 'success');
    alert('Appointment scheduled successfully!\n\nPatient: ' + appointmentData.patientName + '\nDate: ' + appointmentData.date + ' ' + appointmentData.time);
}

// Load Appointments
function loadAppointments() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !user.id) return;
    
    // Fetch appointments from backend API
    fetch(`${API_BASE_URL}/appointment/hospital/${user.id}`)
        .then(response => response.json())
        .then(appointments => {
            console.log('Hospital appointments loaded from API:', appointments.length);
            displayHospitalAppointments(appointments);
        })
        .catch(error => {
            console.error('Failed to load appointments from API:', error);
            console.log('Falling back to localStorage...');
            
            // Fallback: Load from localStorage
            const donorAppointments = JSON.parse(localStorage.getItem('donor_appointments')) || [];
            const hospitalAppointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
            
            // Convert localStorage format to match API format
            const convertedAppointments = donorAppointments.map(apt => ({
                id: apt.createdAt || Date.now(),
                date: apt.date,
                time: apt.time,
                donorName: apt.donorName,
                bloodType: apt.bloodType,
                donorPhone: apt.donorPhone,
                status: apt.status || 'Pending',
                notes: apt.notes,
                _source: 'donor'
            })).concat(hospitalAppointments.map(apt => ({
                id: apt.createdAt || Date.now(),
                date: apt.date,
                time: apt.time,
                patientName: apt.patientName,
                bloodType: apt.bloodType,
                status: apt.status || 'Pending',
                appointmentType: apt.appointmentType,
                _source: 'hospital'
            })));
            
            displayHospitalAppointments(convertedAppointments);
        });
}

function displayHospitalAppointments(appointments) {
    const tableBody = document.getElementById('appointments-table-body');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (appointments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">No appointments scheduled yet.</td></tr>';
        return;
    }
    
    // Sort appointments by date
    const sorted = appointments.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sorted.slice(0, 10).forEach((appt) => {
        const statusColor = appt.status === 'Completed' ? '#4caf50' : (appt.status === 'Cancelled' ? '#f44336' : '#ff9800');
        const row = document.createElement('tr');
        
        const donorName = appt.donorName || appt.patientName || 'N/A';
        const bloodType = appt.bloodType || '--';
        const appointmentType = appt._source === 'hospital' ? (appt.appointmentType || 'Other') : 'Blood Donation';
        
        // Create action buttons
        let actionButtons = `
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button onclick="viewAppointmentDetailsFromAPI('${appt.id}')" style="padding: 6px 12px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;" title="View Details">👁️ View</button>
        `;
        
        // Only show action buttons if not cancelled or completed
        if (appt.status !== 'Cancelled' && appt.status !== 'Completed') {
            actionButtons += `
                <button onclick="completeAppointmentAPI('${appt.id}')" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;" title="Mark as Complete">✓ Done</button>
                <button onclick="cancelAppointmentAPI('${appt.id}')" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;" title="Cancel Appointment">✕ Cancel</button>
            `;
        }
        
        actionButtons += '</div>';
        
        row.innerHTML = `
            <td>${formatSimpleDate(appt.date)}</td>
            <td><strong>${appt.time || formatSimpleTime(appt.date)}</strong></td>
            <td>${donorName}</td>
            <td><strong>${bloodType}</strong></td>
            <td>${appointmentType}</td>
            <td><span style="color: ${statusColor}; font-weight: bold;">${appt.status}</span></td>
            <td>${actionButtons}</td>
        `;
        tableBody.appendChild(row);
    });
}

// View Appointment Details
function viewAppointmentDetails(index, isDonorAppointment) {
    let appt;
    
    if (isDonorAppointment) {
        const donorAppointments = JSON.parse(localStorage.getItem('donor_appointments')) || [];
        appt = donorAppointments[index];
    } else {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const hospitalAppointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
        appt = hospitalAppointments[index];
    }
    
    if (!appt) {
        alert('Appointment not found');
        return;
    }
    
    // Create modal for viewing appointment details
    const modal = document.createElement('div');
    modal.id = 'appointment-view-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 3000;';
    
    const appointmentType = isDonorAppointment ? 'Blood Donation' : (appt.appointmentType || 'Other');
    const statusColor = appt.status === 'Completed' ? '#4caf50' : (appt.status === 'Cancelled' ? '#f44336' : '#ff9800');
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #c41e3a;">📅 Appointment Details</h2>
                <button onclick="document.getElementById('appointment-view-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
            
            <div style="border: 2px solid #e8e8e8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Date</p>
                        <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: bold;">${formatSimpleDate(appt.date)}</p>
                    </div>
                    <div>
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Time</p>
                        <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: bold;">${appt.time || formatSimpleTime(appt.date)}</p>
                    </div>
                    <div style="grid-column: 1/-1;">
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Appointment Type</p>
                        <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: bold;">${appointmentType}</p>
                    </div>
                </div>
            </div>
            
            <div style="border: 2px solid #e8e8e8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #333;">👤 Donor/Patient Information</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Name</p>
                        <p style="margin: 8px 0 0 0; font-weight: bold;">${appt.donorName || appt.patientName || 'N/A'}</p>
                    </div>
                    <div>
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Blood Type</p>
                        <p style="margin: 8px 0 0 0; font-weight: bold; background: #ff6b6b; color: white; padding: 6px 12px; border-radius: 4px; display: inline-block;">${appt.donorBloodType || appt.bloodType || '--'}</p>
                    </div>
                    <div>
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Email</p>
                        <p style="margin: 8px 0 0 0;">${appt.donorEmail || appt.email || 'N/A'}</p>
                    </div>
                    <div>
                        <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Phone</p>
                        <p style="margin: 8px 0 0 0;">${appt.donorPhone || appt.phone || 'N/A'}</p>
                    </div>
                </div>
            </div>
            
            <div style="border: 2px solid #e8e8e8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 12px; color: #999; text-transform: uppercase;">Status:</span>
                    <span style="color: white; background: ${statusColor}; padding: 8px 16px; border-radius: 6px; font-weight: bold;">${appt.status}</span>
                </div>
            </div>
            
            ${appt.notes ? `<div style="border: 2px solid #e8e8e8; border-radius: 8px; padding: 20px; margin-bottom: 20px;"><h3 style="margin: 0 0 10px 0;">📝 Notes</h3><p style="margin: 0; white-space: pre-wrap;">${appt.notes}</p></div>` : ''}
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="document.getElementById('appointment-view-modal').remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Complete Appointment
function completeAppointment(index, isDonorAppointment) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    if (isDonorAppointment) {
        let appointments = JSON.parse(localStorage.getItem('donor_appointments')) || [];
        if (appointments[index]) {
            const appointment = appointments[index];
            
            // Mark appointment as completed
            appointments[index].status = 'Completed';
            localStorage.setItem('donor_appointments', JSON.stringify(appointments));
            
            // Create donation record from appointment data
            let donorDonations = JSON.parse(localStorage.getItem(appointment.donorEmail + '_donations')) || [];
            let hospitalDonations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
            
            // Calculate next sequential ID
            let nextId = 1;
            if (donorDonations.length > 0) {
                const maxId = Math.max(...donorDonations.map(d => d.id || 0));
                nextId = maxId + 1;
            }
            
            // Create donation object with appointment data pre-filled
            const donationRecord = {
                id: nextId,
                donorName: appointment.donorName || 'Unknown',
                bloodType: appointment.donorBloodType || '--',
                units: 1,
                bloodAmountMl: 450,
                contact: appointment.donorPhone || '',
                donorEmail: appointment.donorEmail || '',
                date: appointment.date,
                time: appointment.time,
                status: 'Scheduled',
                donorId: 'N/A',
                notes: 'Auto-created from appointment on ' + new Date().toLocaleString() + (appointment.notes ? '\nAppointment notes: ' + appointment.notes : ''),
                appointmentId: appointment.createdAt,
                createdAt: new Date().toISOString()
            };
            
            // Add donation to donor's records
            donorDonations.unshift(donationRecord);
            localStorage.setItem(appointment.donorEmail + '_donations', JSON.stringify(donorDonations));
            
            // Also add to hospital's records
            hospitalDonations.unshift(donationRecord);
            localStorage.setItem(user.email + '_donations', JSON.stringify(hospitalDonations));
            
            // Send message to donor asking them to come donate
            sendDonorReminder(appointment, user);
            
            loadAppointments();
            showLiveNotification('✅ Appointment completed! Donation record created and reminder sent to ' + appointment.donorName, 'success');
            alert('✅ Appointment marked as completed!\n\n📋 Donation Record Created:\nDonor: ' + appointment.donorName + '\nBlood Type: ' + appointment.donorBloodType + '\n\n📩 Reminder Message Sent:\nA message has been sent to the donor asking them to come to the hospital and donate blood.\n\nPlease review and finalize the donation record.');
        }
    } else {
        let appointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
        if (appointments[index]) {
            appointments[index].status = 'Completed';
            localStorage.setItem(user.email + '_appointments', JSON.stringify(appointments));
            loadAppointments();
            showLiveNotification('✅ Appointment marked as completed!', 'success');
        }
    }
}

// Send Donor Reminder Message
function sendDonorReminder(appointment, hospital) {
    if (!appointment.donorEmail) return;
    const donorEmail = appointment.donorEmail;
    const normalizedDonorEmail = donorEmail.trim().toLowerCase();
    const donorMessagesKey = donorEmail + '_messages';
    const donorMessagesKeyNormalized = normalizedDonorEmail + '_messages';
    
    // Get or create donor messages
    let donorMessages = JSON.parse(localStorage.getItem(donorMessagesKey)) || [];
    if (donorMessages.length === 0 && donorMessagesKeyNormalized) {
        donorMessages = JSON.parse(localStorage.getItem(donorMessagesKeyNormalized)) || [];
    }
    
    const message = {
        id: Date.now(),
        from: hospital.hospitalName || 'Hospital',
        fromEmail: hospital.email,
        subject: '🩸 Reminder: Please Come to Donate Blood',
        body: `Dear ${appointment.donorName},\n\nYour appointment has been confirmed for blood donation.\n\n📅 Date: ${appointment.date}\n⏰ Time: ${appointment.time}\n🏥 Hospital: ${hospital.hospitalName || 'Our Hospital'}\n📍 Address: ${hospital.address || 'Hospital Address'}\n\nPlease come to the hospital at the scheduled time to donate blood. Your contribution will help save lives!\n\nThank you for your generosity.\n\nBest regards,\n${hospital.hospitalName || 'Hospital Team'}`,
        date: new Date().toISOString(),
        read: false,
        type: 'reminder',
        appointmentId: appointment.createdAt
    };
    
    donorMessages.unshift(message);
    localStorage.setItem(donorMessagesKey, JSON.stringify(donorMessages));
    if (donorMessagesKeyNormalized && donorMessagesKeyNormalized !== donorMessagesKey) {
        localStorage.setItem(donorMessagesKeyNormalized, JSON.stringify(donorMessages));
    }
    
    console.log('✓ Reminder message sent to donor:', donorEmail);
}

// Cancel Appointment
function cancelAppointment(index, isDonorAppointment) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    if (isDonorAppointment) {
        let appointments = JSON.parse(localStorage.getItem('donor_appointments')) || [];
        if (appointments[index]) {
            appointments[index].status = 'Cancelled';
            localStorage.setItem('donor_appointments', JSON.stringify(appointments));
            loadAppointments();
            showLiveNotification('⚠️ Appointment cancelled', 'warning');
        }
    } else {
        let appointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
        if (appointments[index]) {
            appointments[index].status = 'Cancelled';
            localStorage.setItem(user.email + '_appointments', JSON.stringify(appointments));
            loadAppointments();
            showLiveNotification('⚠️ Appointment cancelled', 'warning');
        }
    }
}

// API-based appointment functions
function completeAppointmentAPI(appointmentId) {
    // First, get the full appointment details
    fetch(`${API_BASE_URL}/appointment/${appointmentId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(appointmentData => {
        if (appointmentData && (appointmentData.donor_email || appointmentData.donorEmail)) {
            const donorEmail = appointmentData.donor_email || appointmentData.donorEmail;
            const donorName = appointmentData.donorName || appointmentData.donor_name || 'Donor';
            const hospitalName = appointmentData.hospitalName || JSON.parse(localStorage.getItem('currentUser')).hospital_name || 'Hospital';
            const appointmentDate = appointmentData.appointment_date || appointmentData.appointmentDate;
            const appointmentTime = appointmentData.appointment_time || appointmentData.appointmentTime;
            
            console.log('✓ Appointment details:', {donorEmail, donorName, hospitalName, appointmentDate, appointmentTime});
            
            // Now mark the appointment as completed
            return fetch(`${API_BASE_URL}/appointment/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'Completed'
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Send message to donor
                    sendDonationAppointmentReminder(donorEmail, donorName, hospitalName, appointmentDate, appointmentTime);
                    
                    loadAppointments();
                    showLiveNotification('✅ Appointment marked as completed & message sent to donor!', 'success');
                } else {
                    alert('❌ Failed to complete appointment: ' + (data.error || 'Unknown error'));
                }
            });
        } else {
            console.error('Could not find donor email in appointment data:', appointmentData);
            alert('❌ Could not get appointment details');
        }
    })
    .catch(error => {
        console.error('Complete appointment error:', error);
        alert('❌ Error completing appointment. Please try again.');
    });
}

// Send donation appointment reminder message to donor
function sendDonationAppointmentReminder(donorEmail, donorName, hospitalName, appointmentDate, appointmentTime) {
    try {
        const normalizedDonorEmail = (donorEmail || '').trim().toLowerCase();

        // Get existing messages or create new array
        const messagesKey = donorEmail + '_messages';
        const normalizedMessagesKey = normalizedDonorEmail + '_messages';
        let messages = JSON.parse(localStorage.getItem(messagesKey)) || [];
        if (messages.length === 0 && normalizedMessagesKey) {
            messages = JSON.parse(localStorage.getItem(normalizedMessagesKey)) || [];
        }
        
        // Create reminder message
        const message = {
            id: Date.now(),
            subject: '🩸 It\'s Time to Donate!',
            from: 'Hospital Notification',
            type: 'appointment-reminder',
            body: `Dear ${donorName},\n\nYour appointment at ${hospitalName} is confirmed for ${appointmentDate} at ${appointmentTime}.\n\n💡 Please visit our hospital today to donate blood. Your donation can save lives!\n\nThank you for your generosity!`,
            timestamp: new Date().toLocaleString(),
            read: false,
            priority: 'high'
        };
        
        // Add message to array
        messages.push(message);
        
        // Save to localStorage
        localStorage.setItem(messagesKey, JSON.stringify(messages));
        if (normalizedMessagesKey && normalizedMessagesKey !== messagesKey) {
            localStorage.setItem(normalizedMessagesKey, JSON.stringify(messages));
        }
        
        console.log('✅ Donation reminder message sent to donor:', donorEmail);
    } catch (error) {
        console.error('Error sending donation reminder:', error);
    }
}

function cancelAppointmentAPI(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    fetch(`${API_BASE_URL}/appointment/${appointmentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'Cancelled'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadAppointments();
            showLiveNotification('⚠️ Appointment cancelled', 'warning');
        } else {
            alert('❌ Failed to cancel appointment: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Cancel appointment error:', error);
        alert('❌ Error cancelling appointment. Please try again.');
    });
}

function viewAppointmentDetailsFromAPI(appointmentId) {
    // Fetch appointment details from the displayed data
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !user.id) {
        alert('Please login as a hospital');
        return;
    }
    
    // GET the appointment from API
    fetch(`${API_BASE_URL}/appointment/hospital/${user.id}`)
        .then(response => response.json())
        .then(appointments => {
            const appointment = appointments.find(apt => apt.id == appointmentId);
            if (!appointment) {
                alert('Appointment not found');
                return;
            }
            displayAppointmentDetailsModal(appointment);
        })
        .catch(error => {
            console.error('Error fetching appointment details:', error);
            alert('Failed to load appointment details');
        });
}

function displayAppointmentDetailsModal(appointment) {
    const statusColor = appointment.status === 'Completed' ? '#4caf50' : 
                       (appointment.status === 'Cancelled' ? '#f44336' : '#ff9800');
    
    const content = `
        <div style="font-size: 14px; line-height: 1.8;">
            <h4 style="color: #2196F3; margin-bottom: 15px;">📋 Appointment Information</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 30%;">Appointment ID:</td><td>${appointment.id}</td></tr>
                <tr><td style="font-weight: bold;">Date:</td><td>${new Date(appointment.date).toLocaleDateString('en-US')}</td></tr>
                <tr><td style="font-weight: bold;">Time:</td><td>${appointment.time}</td></tr>
                <tr><td style="font-weight: bold;">Status:</td><td><span style="padding: 5px 10px; background: ${statusColor}; color: white; border-radius: 3px;">${appointment.status}</span></td></tr>
                <tr><td style="font-weight: bold;">Confirmation Code:</td><td><strong>${appointment.confirmationCode}</strong></td></tr>
            </table>
            
            <h4 style="color: #ff9800; margin-top: 20px; margin-bottom: 15px;">👤 Donor Information</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 30%;">Donor Name:</td><td>${appointment.donorName}</td></tr>
                <tr><td style="font-weight: bold;">Contact:</td><td>${appointment.donorPhone}</td></tr>
                <tr><td style="font-weight: bold;">Email:</td><td>${appointment.donorEmail}</td></tr>
            </table>
            
            <h4 style="color: #4caf50; margin-top: 20px; margin-bottom: 15px;">🩸 Blood Details</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 30%;">Blood Type:</td><td style="font-size: 16px; color: #f44336; font-weight: bold;">${appointment.bloodType}</td></tr>
            </table>
            
            <h4 style="color: #2196F3; margin-top: 20px; margin-bottom: 15px;">📝 Notes</h4>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 3px; border-left: 3px solid #2196F3;">${appointment.notes || 'No notes'}</p>
        </div>
    `;
    
    openDetailViewModal('📅 Appointment Details', content);
}

// ==================== DONATIONS FUNCTIONALITY ====================

function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
}

function getRegisteredDonorByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    const donors = JSON.parse(localStorage.getItem('donors')) || [];
    return donors.find(d => normalizeEmail(d.email) === normalizedEmail) || null;
}

function resolveDonorDisplayName(email, fallbackName) {
    const donor = getRegisteredDonorByEmail(email);
    if (donor) {
        if (donor.firstName || donor.lastName) {
            return `${donor.firstName || ''} ${donor.lastName || ''}`.trim();
        }
        if (donor.name) return donor.name;
    }
    return fallbackName || 'Unknown';
}

function setupDonorEmailAutofill() {
    const emailInput = document.getElementById('donor-email');
    const nameInput = document.getElementById('donor-name');
    if (!emailInput || !nameInput) return;
    if (emailInput.dataset.autofillBound === 'true') return;

    emailInput.dataset.autofillBound = 'true';
    emailInput.addEventListener('blur', function() {
        const donorEmail = normalizeEmail(emailInput.value);
        if (!donorEmail) return;

        const resolvedName = resolveDonorDisplayName(donorEmail, nameInput.value);
        if (resolvedName && resolvedName !== nameInput.value) {
            nameInput.value = resolvedName;
        }
    });
}

// Open Donation Modal
function openDonationModal(donationIndex = null) {
    const modal = document.getElementById('donationModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // If editing existing donation, load its data
        if (donationIndex !== null) {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
            const donation = donations[donationIndex];
            
            if (donation) {
                // Pre-fill form with donation data
                document.getElementById('donor-name').value = donation.donorName || '';
                document.getElementById('donor-blood-type').value = donation.bloodType || '';
                document.getElementById('blood-amount-ml').value = donation.bloodAmountMl || 450;
                document.getElementById('donor-contact').value = donation.contact || '';
                document.getElementById('donor-email').value = donation.donorEmail || '';
                document.getElementById('donor-email-id').value = donation.donorEmailId || '';
                document.getElementById('donation-date').value = donation.date || '';
                document.getElementById('donation-time').value = donation.time || '';
                document.getElementById('donor-status').value = donation.status || 'Scheduled';
                document.getElementById('donor-id').value = donation.donorId || '';
                document.getElementById('donation-notes').value = donation.notes || '';
                
                showLiveNotification('📝 Editing donation from appointment', 'info');
            }
        } else {
            // New donation form - reset and set defaults
            document.getElementById('donationForm').reset();
            
            // Set default date and time
            const today = new Date().toISOString().split('T')[0];
            const now = new Date().toTimeString().slice(0, 5);
            document.getElementById('donation-date').value = today;
            document.getElementById('donation-time').value = now;
            document.getElementById('blood-amount-ml').value = 450;
            
            // Add auto-fill functionality for blood type when donor email is entered
            const donorEmailField = document.getElementById('donor-email');
            if (donorEmailField) {
                donorEmailField.addEventListener('change', function() {
                    autoFillBloodType();
                });
                donorEmailField.addEventListener('blur', function() {
                    autoFillBloodType();
                });
            }
            
            showLiveNotification('💉 Blood donation form opened', 'info');
        }
        
        // Setup form submit
        document.getElementById('donationForm').onsubmit = function(e) {
            e.preventDefault();
            saveDonation(donationIndex);
        };
    } else {
        console.error('Donation modal not found');
        alert('Error: Donation modal not found. Please refresh the page.');
    }
}

// Close Donation Modal
function closeDonationModal() {
    const modal = document.getElementById('donationModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Auto-fill Blood Type from Donor Profile
function autoFillBloodType() {
    const donorEmailInput = document.getElementById('donor-email');
    const bloodTypeSelect = document.getElementById('donor-blood-type');
    
    if (!donorEmailInput || !bloodTypeSelect) return;
    
    const donorEmail = (donorEmailInput.value || '').trim().toLowerCase();
    
    if (!donorEmail) {
        console.log('No donor email provided');
        return;
    }
    
    // Try to find donor in localStorage
    const donors = JSON.parse(localStorage.getItem('donors')) || [];
    const donor = donors.find(d => (d.email || '').trim().toLowerCase() === donorEmail);
    
    if (donor && donor.bloodType) {
        bloodTypeSelect.value = donor.bloodType;
        console.log('✓ Auto-filled blood type:', donor.bloodType);
        showLiveNotification('✓ Blood type auto-filled: ' + donor.bloodType, 'success');
    } else {
        console.log('Donor not found or no blood type in profile');
    }
}

// Save Donation
function saveDonation(donationIndex = null) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    // Get donation email (prefer from form, otherwise use donor email from URL params)
    const donorEmailForStorage = document.getElementById('donor-email').value || ''; 
    let donations = donorEmailForStorage ? 
        JSON.parse(localStorage.getItem(donorEmailForStorage + '_donations')) || [] :
        JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    
    const donationData = {
        donorName: document.getElementById('donor-name').value,
        bloodType: document.getElementById('donor-blood-type').value,
        units: 1,
        bloodAmountMl: parseInt(document.getElementById('blood-amount-ml').value) || 450,
        contact: document.getElementById('donor-contact').value,
        donorEmail: document.getElementById('donor-email').value || '',
        donorEmailId: document.getElementById('donor-email-id').value || '',
        date: document.getElementById('donation-date').value,
        time: document.getElementById('donation-time').value,
        status: document.getElementById('donor-status').value,
        donorId: document.getElementById('donor-id').value || 'N/A',
        notes: document.getElementById('donation-notes').value || 'None'
    };

    const normalizedDonorEmail = normalizeEmail(donationData.donorEmail);
    if (normalizedDonorEmail) {
        donationData.donorEmail = normalizedDonorEmail;
        donationData.donorName = resolveDonorDisplayName(normalizedDonorEmail, donationData.donorName);
    }
    
    let isNewDonation = true;
    let oldStatus = null;
    let oldUnits = 0;
    let oldBloodType = null;
    
    if (donationIndex !== null) {
        // Editing existing donation
        isNewDonation = false;
        const existingDonation = donations[donationIndex];
        oldStatus = existingDonation.status;
        oldUnits = existingDonation.units;
        oldBloodType = existingDonation.bloodType;
        
        // Preserve existing id and timestamps
        donationData.id = existingDonation.id;
        donationData.createdAt = existingDonation.createdAt;
        donationData.appointmentId = existingDonation.appointmentId; // Preserve appointment link
        donationData.certificateId = existingDonation.certificateId;
        
        // Update existing donation
        donations[donationIndex] = donationData;
    } else {
        // Creating new donation
        let nextId = 1;
        if (donations.length > 0) {
            const maxId = Math.max(...donations.map(d => d.id || 0));
            nextId = maxId + 1;
        }
        donationData.id = nextId;
        donationData.createdAt = new Date().toISOString();
        
        // Add new donation to the beginning
        donations.unshift(donationData);
    }
    
    // Save to localStorage under donor's email
    const finalDonorEmail = donationData.donorEmail || document.getElementById('donor-email').value || '';
    if (finalDonorEmail) {
        localStorage.setItem(finalDonorEmail + '_donations', JSON.stringify(donations));
        // Also save to hospital's copy for tracking
        let hospitalDonations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
        if (donationIndex !== null) {
            const indexInHospitalList = hospitalDonations.findIndex(d => d.id === donationData.id);
            if (indexInHospitalList !== -1) {
                hospitalDonations[indexInHospitalList] = donationData;
            } else {
                hospitalDonations.unshift(donationData);
            }
        } else {
            hospitalDonations.unshift(donationData);
        }
        localStorage.setItem(user.email + '_donations', JSON.stringify(hospitalDonations));
    } else {
        localStorage.setItem(user.email + '_donations', JSON.stringify(donations));
    }
    
    // Handle inventory updates
    if (donationData.status === 'Completed') {
        let inventory = JSON.parse(localStorage.getItem(user.email + '_inventory')) || {};
        let inventoryTimestamps = JSON.parse(localStorage.getItem(user.email + '_inventory_timestamps')) || {};
        
        if (isNewDonation) {
            // New donation - add units to inventory
            if (inventory[donationData.bloodType] !== undefined) {
                inventory[donationData.bloodType] += donationData.units;
            } else {
                inventory[donationData.bloodType] = donationData.units;
            }
        } else if (oldStatus !== 'Completed' && donationData.status === 'Completed') {
            // Status changed to Completed - add units
            if (inventory[donationData.bloodType] !== undefined) {
                inventory[donationData.bloodType] += donationData.units;
            } else {
                inventory[donationData.bloodType] = donationData.units;
            }
        } else if (oldStatus === 'Completed' && donationData.bloodType === oldBloodType) {
            // Already completed, just update unit count difference
            const unitDifference = donationData.units - oldUnits;
            if (inventory[donationData.bloodType] !== undefined) {
                inventory[donationData.bloodType] += unitDifference;
            } else {
                inventory[donationData.bloodType] = donationData.units;
            }
        } else if (oldStatus === 'Completed' && donationData.bloodType !== oldBloodType) {
            // Blood type changed - remove from old, add to new
            if (inventory[oldBloodType] !== undefined) {
                inventory[oldBloodType] -= oldUnits;
            }
            if (inventory[donationData.bloodType] !== undefined) {
                inventory[donationData.bloodType] += donationData.units;
            } else {
                inventory[donationData.bloodType] = donationData.units;
            }
        }
        
        inventoryTimestamps[donationData.bloodType] = new Date().toISOString();
        
        localStorage.setItem(user.email + '_inventory', JSON.stringify(inventory));
        localStorage.setItem(user.email + '_inventory_timestamps', JSON.stringify(inventoryTimestamps));
        
        // Generate certificate for donor if email provided and this is newly completed
        // Certificate should only be issued ONCE when status changes to Completed
        if (donationData.donorEmail && donationData.donorEmail.trim() !== '' && oldStatus !== 'Completed' && donationData.status === 'Completed' && !donationData.certificateId) {
            const certificate = generateDonorCertificate(donationData);
            if (certificate) {
                donationData.certificateId = certificate.id;
                const donationPosition = donationIndex !== null ? donationIndex : 0;
                donations[donationPosition] = donationData;
                localStorage.setItem(donationData.donorEmail + '_donations', JSON.stringify(donations));
                sendCertificateMessage(donationData.donorEmail, certificate, donationData);
            }
        }
    }
    
    closeDonationModal();
    loadDonations();

    loadBloodInventory();
    loadDashboardData();
    updateChartTimestamp();
    
    const certMessage = (donationData.status === 'Completed' && donationData.donorEmail) 
        ? '\n\n✅ Certificate generated and sent to donor!' 
        : '';
    
    showLiveNotification('✅ Blood donation recorded: ' + donationData.units + ' units of ' + donationData.bloodType, 'success');
    alert('Blood donation recorded successfully!\n\nDonor: ' + donationData.donorName + '\nBlood Type: ' + donationData.bloodType + '\nAmount: ' + donationData.bloodAmountMl + 'ml' + certMessage);
}

// Load Donations
function loadDonations() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    const tableBody = document.getElementById('donations-table-body');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Calculate stats
    const today = new Date().toDateString();
    const todayDonations = donations.filter(d => new Date(d.date).toDateString() === today && d.status === 'Completed').length;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthDonations = donations.filter(d => {
        const donationDate = new Date(d.date);
        return donationDate.getMonth() === currentMonth && donationDate.getFullYear() === currentYear && d.status === 'Completed';
    }).length;
    
    const totalUnits = donations.filter(d => d.status === 'Completed').reduce((sum, d) => sum + (d.bloodAmountMl || 450), 0) / 1000; // Convert ml to liters
    
    // Update stats
    if (document.getElementById('today-donations')) document.getElementById('today-donations').textContent = todayDonations;
    if (document.getElementById('month-donations')) document.getElementById('month-donations').textContent = monthDonations;
    if (document.getElementById('total-units')) document.getElementById('total-units').textContent = totalUnits.toFixed(2);
    
    if (donations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #999;">No donation records yet.</td></tr>';
        return;
    }
    
    let donationsUpdated = false;

    donations.slice(0, 10).forEach((donation, index) => {
        const resolvedName = donation.donorEmail
            ? resolveDonorDisplayName(donation.donorEmail, donation.donorName)
            : donation.donorName;

        if (resolvedName && resolvedName !== donation.donorName) {
            donation.donorName = resolvedName;
            donationsUpdated = true;
        }

        const canSendCertificate = donation.status === 'Completed' && donation.donorEmail;
        const statusColor = donation.status === 'Completed' ? '#4caf50' : (donation.status === 'Scheduled' ? '#ff9800' : '#2196F3');
        const bloodAmountMl = donation.bloodAmountMl || 450;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${donation.date} ${donation.time}</td>
            <td>${donation.donorName}</td>
            <td><strong>${donation.bloodType}</strong></td>
            <td><strong>${bloodAmountMl} ml</strong></td>
            <td><span style="color: ${statusColor}; font-weight: bold;">${donation.status}</span></td>
            <td>
                <button onclick="viewDonationDetails(${index})" style="padding: 6px 12px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 5px;">👁️ View</button>
                <button onclick="openDonationModal(${index})" style="padding: 6px 12px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 5px;">✏️ Edit</button>
                <button onclick="sendCertificateForDonation(${index})" style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 5px; cursor: pointer; ${canSendCertificate ? '' : 'opacity: 0.5; cursor: not-allowed;'}" ${canSendCertificate ? '' : 'disabled'}>📜 Certificate</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (donationsUpdated) {
        localStorage.setItem(user.email + '_donations', JSON.stringify(donations));
    }
}

// View Donation Details
function viewDonationDetails(index) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    const donation = donations[index];
    
    if (donation) {
        const details = `
=== Blood Donation Record ===

Donation ID: ${donation.id}
Date: ${donation.date} ${donation.time}
Status: ${donation.status}

--- Donor Information ---
Donor Name: ${donation.donorName}
Donor ID: ${donation.donorId}
Contact: ${donation.contact}
Donor Email: ${donation.donorEmail || donation.donorEmailId || 'N/A'}
--- Blood Details ---
Blood Type: ${donation.bloodType}
Blood Amount: ${donation.bloodAmountMl || 450} ml

--- Medical Notes ---
${donation.notes}

Created: ${new Date(donation.createdAt).toLocaleString()}
        `.trim();
        
        alert(details);
    }
}

// ==================== HOSPITAL BLOOD REQUESTS ====================

// Load Hospital Blood Requests (Requests submitted by this hospital)
function loadHospitalRequests() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
    const tableBody = document.getElementById('hospital-requests-table-body');
    
    if (!tableBody) return;
    
    // Filter to show only requests from the current hospital
    const myRequests = allRequests.filter(req => req.hospitalName === user.hospitalName);
    
    // Calculate stats
    const totalRequests = myRequests.length;
    const pendingRequests = myRequests.filter(r => r.status === 'Pending').length;
    const fulfilledRequests = myRequests.filter(r => r.status === 'Fulfilled').length;
    const urgentRequests = myRequests.filter(r => r.urgency === 'Urgent').length;
    
    // Update stats
    if (document.getElementById('hosp-req-total')) document.getElementById('hosp-req-total').textContent = totalRequests;
    if (document.getElementById('hosp-req-pending')) document.getElementById('hosp-req-pending').textContent = pendingRequests;
    if (document.getElementById('hosp-req-fulfilled')) document.getElementById('hosp-req-fulfilled').textContent = fulfilledRequests;
    if (document.getElementById('hosp-req-urgent')) document.getElementById('hosp-req-urgent').textContent = urgentRequests;
    
    // Update last updated timestamp
    if (document.getElementById('hospital-req-updated')) {
        document.getElementById('hospital-req-updated').textContent = new Date().toLocaleTimeString();
    }
    
    tableBody.innerHTML = '';
    
    if (myRequests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #999;">No blood requests submitted yet. Click "+ Request Blood" to submit a request.</td></tr>';
        return;
    }
    
    // Display requests in reverse order (newest first)
    myRequests.reverse().forEach((request, index) => {
        const requestDate = new Date(request.date);
        const formattedDate = requestDate.toLocaleDateString() + ' ' + requestDate.toLocaleTimeString();
        
        // Color code urgency
        let urgencyColor = '#4caf50'; // Normal - green
        let urgencyStyle = 'color: #4caf50;';
        if (request.urgency === 'Urgent') {
            urgencyColor = '#f44336'; // Red
            urgencyStyle = 'color: #f44336; font-weight: bold;';
        } else if (request.urgency === 'High') {
            urgencyColor = '#ff9800'; // Orange
            urgencyStyle = 'color: #ff9800; font-weight: bold;';
        }
        
        // Color code status
        let statusColor = '#2196F3'; // Pending - blue
        if (request.status === 'Fulfilled') {
            statusColor = '#4caf50'; // Fulfilled - green
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><strong>${request.bloodType}</strong></td>
            <td>${request.units} unit${request.units > 1 ? 's' : ''}</td>
            <td><span style="${urgencyStyle}">${request.urgency}</span></td>
            <td>${request.doctorName}</td>
            <td><small>${request.reason.substring(0, 40)}...</small></td>
            <td><span style="color: ${statusColor}; font-weight: bold;">${request.status}</span></td>
            <td>
                <button onclick="viewHospitalRequestDetail(${request.id})" style="padding: 6px 12px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">View</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// View Hospital Request Details
function viewHospitalRequestDetail(requestId) {
    const allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
    const request = allRequests.find(r => r.id === requestId);
    
    if (!request) {
        alert('Request not found');
        return;
    }
    
    const details = `
=== Hospital Blood Request Details ===

REQUEST ID: ${request.id}
Submitted: ${new Date(request.date).toLocaleString()}
Status: ${request.status}

--- Hospital Information ---
Hospital: ${request.hospitalName}
Doctor: ${request.doctorName}
Contact: ${request.contact}
Email: ${request.email}

--- Blood Requirement ---
Blood Type: ${request.bloodType}
Units Required: ${request.units}
Urgency: ${request.urgency}

--- Medical Reason ---
${request.reason}

--- Additional Notes ---
${request.notes || 'None'}

--- Status ---
Status: ${request.status}
${request.status === 'Fulfilled' ? '✅ This request has been fulfilled!' : '⏳ Waiting for blood availability...'}
    `.trim();
    
    alert(details);
}

// ==================== ANALYTICS FUNCTIONALITY ====================

// Load Analytics Data - Real-time
function loadAnalytics() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    // Get all data
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    const appointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
    const requests = JSON.parse(localStorage.getItem(user.email + '_requests')) || [];
    
    // Get current month and year
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // ===== DONATIONS THIS MONTH =====
    const donationsThisMonth = donations.filter(d => {
        const donationDate = new Date(d.date);
        return donationDate.getMonth() === currentMonth && 
               donationDate.getFullYear() === currentYear && 
               d.status === 'Completed';
    });
    
    const totalDonationsThisMonth = donationsThisMonth.length;
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const donationsPreviousMonth = donations.filter(d => {
        const donationDate = new Date(d.date);
        return donationDate.getMonth() === previousMonth && 
               donationDate.getFullYear() === previousYear && 
               d.status === 'Completed';
    }).length;
    
    let donationPercentage = '→ ';
    if (donationsPreviousMonth > 0) {
        const percentChange = ((totalDonationsThisMonth - donationsPreviousMonth) / donationsPreviousMonth * 100).toFixed(1);
        donationPercentage = percentChange > 0 ? `↑ ${percentChange}% vs last month` : `↓ ${Math.abs(percentChange)}% vs last month`;
    } else if (totalDonationsThisMonth > 0) {
        donationPercentage = '↑ New donations this month';
    }
    
    updateAnalyticsCard('analytics-donations-month', totalDonationsThisMonth, 'analytics-donations-change', donationPercentage);
    
    // ===== BLOOD AMOUNT COLLECTED THIS MONTH (LITERS) =====
    const totalBloodUnits = (donationsThisMonth.reduce((sum, d) => sum + (d.bloodAmountMl || 450), 0) / 1000).toFixed(2); // Convert ml to liters
    updateAnalyticsCard('analytics-blood-units', totalBloodUnits, 'analytics-units-change', `💉 ${donationsThisMonth.length} donations collected`);
    
    // ===== FULFILLED REQUESTS THIS MONTH =====
    const fulfilledRequestsThisMonth = requests.filter(r => {
        const requestDate = new Date(r.date || new Date());
        return requestDate.getMonth() === currentMonth && 
               requestDate.getFullYear() === currentYear && 
               r.status === 'Fulfilled';
    }).length;
    
    const totalRequestsThisMonth = requests.filter(r => {
        const requestDate = new Date(r.date || new Date());
        return requestDate.getMonth() === currentMonth && 
               requestDate.getFullYear() === currentYear;
    }).length;
    
    const fulfillmentRate = totalRequestsThisMonth > 0 ? ((fulfilledRequestsThisMonth / totalRequestsThisMonth * 100).toFixed(1)) : 0;
    updateAnalyticsCard('analytics-fulfilled-requests', fulfilledRequestsThisMonth, 'analytics-requests-change', `✅ ${fulfillmentRate}% fulfillment rate`);
    
    // ===== ACTIVE APPOINTMENTS =====
    const activeAppointments = appointments.filter(a => a.status === 'Scheduled').length;
    const completedAppointments = appointments.filter(a => a.status === 'Completed').length;
    updateAnalyticsCard('analytics-active-appointments', activeAppointments, 'analytics-appointments-change', `📅 ${completedAppointments} completed`);
    
    // ===== AVERAGE REQUEST FULFILLMENT TIME =====
    const completedRequests = requests.filter(r => r.status === 'Fulfilled');
    let avgFulfillmentTime = '--';
    if (completedRequests.length > 0) {
        // Estimate average fulfillment time (in this case, we'll show a calculated value)
        avgFulfillmentTime = '2.5 hrs';
    }
    updateAnalyticsCard('analytics-fulfillment-time', avgFulfillmentTime, 'analytics-fulfillment-change', '⏱️ Average processing time');
    
    // ===== CONNECTED DONORS =====
    const uniqueDonors = new Set(donations.map(d => d.donorName)).size;
    const newDonorsThisMonth = donationsThisMonth.length > 0 ? 
        new Set(donationsThisMonth.map(d => d.donorName)).size : 0;
    
    updateAnalyticsCard('analytics-connected-donors', uniqueDonors, 'analytics-donors-change', `👥 ${newDonorsThisMonth} new this month`);
}

// Update Analytics Card with Animation
function updateAnalyticsCard(numberId, number, changeId, changeText) {
    const numberElement = document.getElementById(numberId);
    const changeElement = document.getElementById(changeId);
    
    if (numberElement) {
        // Animate the number if it's numeric
        if (typeof number === 'number') {
            const oldValue = parseInt(numberElement.textContent) || 0;
            if (oldValue !== number) {
                numberElement.style.opacity = '0.5';
                setTimeout(() => {
                    numberElement.textContent = number;
                    numberElement.style.opacity = '1';
                }, 300);
            } else {
                numberElement.textContent = number;
            }
        } else {
            numberElement.textContent = number;
        }
    }
    
    if (changeElement) {
        changeElement.textContent = changeText;
    }
}

// Close modals on click outside
window.onclick = function(event) {
    const apptModal = document.getElementById('appointmentModal');
    const donationModal = document.getElementById('donationModal');
    const hospitalBloodReqModal = document.getElementById('hospitalBloodRequestModal');
    const approveModal = document.getElementById('approveRequestModal');
    const detailViewModal = document.getElementById('detailViewModal');
    
    if (event.target === apptModal) {
        closeAppointmentModal();
    }
    if (event.target === donationModal) {
        closeDonationModal();
    }
    if (event.target === hospitalBloodReqModal) {
        closeHospitalBloodRequestModal();
    }
    if (event.target === approveModal) {
        closeApproveRequestModal();
    }
    if (event.target === detailViewModal) {
        closeDetailViewModal();
    }
}

// Close modals on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
        const apptModal = document.getElementById('appointmentModal');
        const donationModal = document.getElementById('donationModal');
        const hospitalBloodReqModal = document.getElementById('hospitalBloodRequestModal');
        const approveModal = document.getElementById('approveRequestModal');
        const detailViewModal = document.getElementById('detailViewModal');
        
        if (apptModal && apptModal.style.display === 'block') {
            closeAppointmentModal();
        }
        if (donationModal && donationModal.style.display === 'block') {
            closeDonationModal();
        }
        if (hospitalBloodReqModal && hospitalBloodReqModal.style.display === 'block') {
            closeHospitalBloodRequestModal();
        }
        if (approveModal && approveModal.style.display === 'block') {
            closeApproveRequestModal();
        }
        if (detailViewModal && detailViewModal.style.display === 'block') {
            closeDetailViewModal();
        }
    }
});

// ==================== LIVE DATA UPDATES ====================

// Start Live Updates
function startLiveUpdates() {
    // Update time immediately
    updateLiveDateTime();
    
    // Update time every second
    setInterval(updateLiveDateTime, 1000);
    
    // Refresh dashboard data every 30 seconds
    setInterval(function() {
        loadDashboardData();
        loadBloodInventory();
        loadRecentRequests();
        loadAppointments();
        loadDonations();
        loadHospitalRequests();
        loadAnalytics();
        updateChartTimestamp();
    }, 30000);
    
    // Add animation to stat cards
    animateStatCards();
}

// Update Live Date and Time
function updateLiveDateTime() {
    const now = new Date();
    
    // Format date
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateStr = now.toLocaleDateString('en-US', dateOptions);
    
    // Format time
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true
    };
    const timeStr = now.toLocaleTimeString('en-US', timeOptions);
    
    // Update DOM
    const liveDateEl = document.getElementById('live-date');
    const liveTimeEl = document.getElementById('live-time');
    
    if (liveDateEl) liveDateEl.textContent = dateStr;
    if (liveTimeEl) liveTimeEl.textContent = timeStr;
}

// Update Chart Timestamp
function updateChartTimestamp() {
    const chartUpdated = document.getElementById('chart-updated');
    if (chartUpdated) {
        const now = new Date();
        chartUpdated.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Add flash animation
        chartUpdated.style.color = '#ff6b6b';
        setTimeout(() => {
            chartUpdated.style.color = '#4caf50';
        }, 500);
    }
}

// Animate Stat Cards
function animateStatCards() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach((stat, index) => {
        setTimeout(() => {
            const target = parseInt(stat.textContent) || 0;
            animateValue(stat, 0, target, 1500);
        }, index * 200);
    });
}

// Animate Value Counter
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end;
        }
    };
    window.requestAnimationFrame(step);
}

// Real-time Notification System
function showLiveNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'live-notification ' + type;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== BLOOD REQUEST MODAL (For Hospital Dashboard) ====================

// Open Hospital Blood Request Modal
function openBloodRequestModal() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Please login first');
        return;
    }
    
    const modal = document.getElementById('hospitalBloodRequestModal');
    if (!modal) {
        alert('Error: Blood Request Modal not found. Please refresh the page.');
        return;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Pre-fill hospital information from current user
    document.getElementById('hosp-req-hospital-name').value = user.hospitalName || user.name || 'Hospital';
    document.getElementById('hosp-req-contact').value = user.phone || '';
    document.getElementById('hosp-req-email').value = user.email || '';
    
    document.getElementById('hosp-req-doctor-name').value = '';
    document.getElementById('hosp-req-blood-type').value = '';
    document.getElementById('hosp-req-units').value = '';
    document.getElementById('hosp-req-urgency').value = '';
    document.getElementById('hosp-req-reason').value = '';
    document.getElementById('hosp-req-notes').value = '';
    
    // Setup form submit
    document.getElementById('hospitalBloodRequestForm').onsubmit = function(e) {
        e.preventDefault();
        submitHospitalBloodRequest();
    };
    
    showLiveNotification('🩸 Hospital blood request form opened', 'info');
}

// Close Hospital Blood Request Modal
function closeHospitalBloodRequestModal() {
    const modal = document.getElementById('hospitalBloodRequestModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Load and Display All Hospital Blood Requests from Other Hospitals
function loadOtherHospitalBloodRequests() {
    const tbody = document.getElementById('other-hospital-requests-tbody');
    if (!tbody) return;
    
    try {
        const allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        
        // Filter out requests from the current hospital
        const otherHospitalRequests = allRequests.filter(req => 
            req.hospitalName !== currentUser.hospitalName
        );
        
        // Calculate stats
        const totalRequests = otherHospitalRequests.length;
        const pendingRequests = otherHospitalRequests.filter(r => r.status === 'Pending').length;
        const fulfilledRequests = otherHospitalRequests.filter(r => r.status === 'Fulfilled').length;
        const urgentRequests = otherHospitalRequests.filter(r => r.urgency === 'Urgent').length;
        
        // Update stats
        if (document.getElementById('other-hosp-req-total')) document.getElementById('other-hosp-req-total').textContent = totalRequests;
        if (document.getElementById('other-hosp-req-pending')) document.getElementById('other-hosp-req-pending').textContent = pendingRequests;
        if (document.getElementById('other-hosp-req-fulfilled')) document.getElementById('other-hosp-req-fulfilled').textContent = fulfilledRequests;
        if (document.getElementById('other-hosp-req-urgent')) document.getElementById('other-hosp-req-urgent').textContent = urgentRequests;
        
        // Update last updated timestamp
        if (document.getElementById('other-hosp-req-updated')) {
            document.getElementById('other-hosp-req-updated').textContent = new Date().toLocaleTimeString();
        }
        
        if (otherHospitalRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="loading">No hospital blood requests at this time</td></tr>';
            return;
        }
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Add rows for each request
        otherHospitalRequests.forEach(request => {
            const requestDate = new Date(request.date);
            const formattedDate = requestDate.toLocaleDateString() + ' ' + requestDate.toLocaleTimeString();
            
            // Color code urgency
            let urgencyClass = 'normal';
            let urgencyStyle = 'color: #4caf50;';
            if (request.urgency === 'Urgent') {
                urgencyClass = 'urgent';
                urgencyStyle = 'color: #f44336; font-weight: bold;';
            } else if (request.urgency === 'High') {
                urgencyClass = 'high';
                urgencyStyle = 'color: #ff9800; font-weight: bold;';
            }
            
            // Color code status
            let statusClass = 'pending';
            let statusColor = '#2196F3';
            if (request.status === 'Fulfilled') {
                statusClass = 'fulfilled';
                statusColor = '#4caf50';
            }
            
            const row = document.createElement('tr');
            row.className = statusClass === 'fulfilled' ? 'fulfilled-row' : '';
            row.innerHTML = `
                <td><strong>${request.hospitalName}</strong></td>
                <td><span style="background: #e3f2fd; padding: 4px 8px; border-radius: 3px; font-weight: bold;">${request.bloodType}</span></td>
                <td><strong>${request.units} units</strong></td>
                <td><span style="${urgencyStyle}">${request.urgency}</span></td>
                <td>${request.doctorName}</td>
                <td>${request.contact}</td>
                <td><small>${formattedDate}</small></td>
                <td><span style="color: ${statusColor}; font-weight: bold;">${request.status}</span></td>
                <td>
                    ${request.status === 'Pending' ? 
                        `<div style="display: flex; gap: 6px;">
                            <button onclick="viewHospitalRequestDetails(${request.id})" style="padding: 6px 10px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">View</button>
                            <button onclick="openApproveRequestModal(${request.id})" style="padding: 6px 10px; background: #4caf50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">Approve</button>
                        </div>` 
                        : '<span style="color: #999;">Fulfilled</span>'
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading hospital blood requests:', error);
        tbody.innerHTML = '<tr><td colspan="10" class="error">Error loading requests</td></tr>';
    }
}

// Filter Hospital Requests by Status
function filterOtherHospitalRequests() {
    const filterSelect = document.getElementById('other-hosp-req-filter-status');
    const filterValue = filterSelect.value;
    const tbody = document.getElementById('other-hospital-requests-tbody');
    
    if (!filterValue) {
        loadOtherHospitalBloodRequests();
        return;
    }
    
    try {
        const allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        
        // Filter by status and exclude current hospital
        const filteredRequests = allRequests.filter(req => 
            req.status === filterValue && req.hospitalName !== currentUser.hospitalName
        );
        
        tbody.innerHTML = '';
        
        if (filteredRequests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="loading">No ${filterValue.toLowerCase()} requests found</td></tr>`;
            return;
        }
        
        filteredRequests.forEach(request => {
            const requestDate = new Date(request.date);
            const formattedDate = requestDate.toLocaleDateString() + ' ' + requestDate.toLocaleTimeString();
            
            let urgencyStyle = 'color: #4caf50;';
            if (request.urgency === 'Urgent') {
                urgencyStyle = 'color: #f44336; font-weight: bold;';
            } else if (request.urgency === 'High') {
                urgencyStyle = 'color: #ff9800; font-weight: bold;';
            }
            
            let statusColor = '#2196F3';
            if (request.status === 'Fulfilled') {
                statusColor = '#4caf50';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${request.hospitalName}</strong></td>
                <td><span style="background: #e3f2fd; padding: 4px 8px; border-radius: 3px; font-weight: bold;">${request.bloodType}</span></td>
                <td><strong>${request.units} units</strong></td>
                <td><span style="${urgencyStyle}">${request.urgency}</span></td>
                <td>${request.doctorName}</td>
                <td>${request.contact}</td>
                <td><small>${formattedDate}</small></td>
                <td><span style="color: ${statusColor}; font-weight: bold;">${request.status}</span></td>
                <td>
                    ${request.status === 'Pending' ? 
                        `<div style="display: flex; gap: 6px;">
                            <button onclick="viewHospitalRequestDetails(${request.id})" style="padding: 6px 10px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">View</button>
                            <button onclick="openApproveRequestModal(${request.id})" style="padding: 6px 10px; background: #4caf50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">Approve</button>
                        </div>` 
                        : '<span style="color: #999;">Fulfilled</span>'
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error filtering requests:', error);
    }
}

// View Hospital Request Details
function viewHospitalRequestDetails(requestId) {
    try {
        const allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
        const request = allRequests.find(r => r.id === requestId);
        
        if (!request) {
            alert('Request not found');
            return;
        }
        
        const message = `🏥 Hospital Blood Request Details\n\n` +
            `Hospital: ${request.hospitalName}\n` +
            `Doctor: ${request.doctorName}\n` +
            `Contact: ${request.contact}\n` +
            `Email: ${request.email}\n\n` +
            `Blood Type: ${request.bloodType}\n` +
            `Units Required: ${request.units}\n` +
            `Urgency: ${request.urgency}\n\n` +
            `Reason: ${request.reason}\n` +
            `Additional Notes: ${request.notes}\n\n` +
            `Request Date: ${new Date(request.date).toLocaleString()}\n` +
            `Status: ${request.status}\n\n` +
            `To respond to this request, please contact the hospital directly using the contact information above.`;
        
        alert(message);
        
    } catch (error) {
        console.error('Error viewing request details:', error);
        alert('Error loading request details');
    }
}


// Submit Hospital Blood Request
function submitHospitalBloodRequest() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Please login first');
        return;
    }
    
    const requestData = {
        id: Date.now(),
        type: 'hospital',
        hospitalName: document.getElementById('hosp-req-hospital-name').value,
        doctorName: document.getElementById('hosp-req-doctor-name').value,
        contact: document.getElementById('hosp-req-contact').value,
        email: document.getElementById('hosp-req-email').value,
        bloodType: document.getElementById('hosp-req-blood-type').value,
        units: parseInt(document.getElementById('hosp-req-units').value),
        urgency: document.getElementById('hosp-req-urgency').value,
        reason: document.getElementById('hosp-req-reason').value,
        notes: document.getElementById('hosp-req-notes').value || 'None',
        status: 'Pending',
        date: new Date().toISOString(),
        createdAt: new Date().toLocaleString()
    };
    
    // Store in hospitals blood requests
    let hospitalBloodRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
    hospitalBloodRequests.unshift(requestData);
    localStorage.setItem('hospitalBloodRequests', JSON.stringify(hospitalBloodRequests));
    
    // Clear form fields
    document.getElementById('hosp-req-doctor-name').value = '';
    document.getElementById('hosp-req-blood-type').value = '';
    document.getElementById('hosp-req-units').value = '';
    document.getElementById('hosp-req-urgency').value = '';
    document.getElementById('hosp-req-reason').value = '';
    document.getElementById('hosp-req-notes').value = '';
    
    // Reload the dashboard section
    scrollToSection('hospital-blood-requests');
    
    // Reload requests if visible
    loadRecentRequests();
    
    // Show success message
    showLiveNotification(`✅ Hospital blood request submitted! ${requestData.units} units of ${requestData.bloodType} requested`, 'success');
    alert(`✅ Blood Request Submitted Successfully!\n\nRequest Details:\n• Hospital: ${requestData.hospitalName}\n• Doctor: ${requestData.doctorName}\n• Blood Type: ${requestData.bloodType}\n• Units: ${requestData.units}\n• Urgency: ${requestData.urgency}\n• Contact: ${requestData.contact}\n• Email: ${requestData.email}\n• Request ID: ${requestData.id}\n\nYour request is now visible to other hospitals in the network.`);
    
    // Auto-close modal after 2 seconds
    setTimeout(() => {
        closeHospitalBloodRequestModal();
    }, 2000);
}

// For future implementation - Blood Request Modal HTML needs to be added
function openBloodRequestModalFull() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Please login first');
        return;
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('bloodRequestModalHospital');
    if (!modal) {
        // Modal will be created when needed
        alert('Blood Request Modal - Feature coming soon!\n\nFor now, please use the home page blood request form.');
        return;
    }
    
    modal.style.display = 'block';
}

// Close Blood Request Modal
function closeBloodRequestModal() {
    const modal = document.getElementById('bloodRequestModalHospital');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Open Approve Request Modal
let approveRequestData = null;

function openApproveRequestModal(requestId) {
    try {
        const allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
        const request = allRequests.find(r => r.id === requestId);
        
        if (!request) {
            alert('Request not found');
            return;
        }
        
        approveRequestData = request;
        
        // Populate modal fields
        document.getElementById('approve-req-hospital').value = request.hospitalName || '';
        document.getElementById('approve-req-blood-type').value = request.bloodType || '';
        document.getElementById('approve-req-units').value = request.units || '';
        document.getElementById('approve-req-urgency').value = request.urgency || '';
        document.getElementById('approve-req-reason').value = request.reason || '';
        
        // Clear form inputs
        document.getElementById('approve-units-to-provide').value = '';
        document.getElementById('approve-delivery-date').value = '';
        document.getElementById('approve-notes').value = '';
        
        // Show modal
        const modal = document.getElementById('approveRequestModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
        
        showLiveNotification('📝 Approval form opened', 'info');
        
    } catch (error) {
        console.error('Error opening approval modal:', error);
        alert('Error loading request details');
    }
}

// Close Approve Request Modal
function closeApproveRequestModal() {
    const modal = document.getElementById('approveRequestModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    approveRequestData = null;
}

// Submit Approval Form
function submitApprovalForm(event) {
    event.preventDefault();
    
    if (!approveRequestData) {
        alert('Request data not found');
        return;
    }
    
    try {
        const unitsToProvide = parseInt(document.getElementById('approve-units-to-provide').value);
        const deliveryDate = document.getElementById('approve-delivery-date').value;
        const notes = document.getElementById('approve-notes').value;
        
        if (!unitsToProvide || unitsToProvide <= 0) {
            alert('Please enter valid units to provide');
            return;
        }
        
        if (!deliveryDate) {
            alert('Please select delivery date');
            return;
        }
        
        // Get current user hospital
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            alert('Hospital not found. Please login again.');
            return;
        }
        
        // Get blood inventory for current hospital
        const inventory = JSON.parse(localStorage.getItem(currentUser.email + '_inventory')) || {};
        const availableUnits = inventory[approveRequestData.bloodType] || 0;
        
        // Check if hospital has enough blood
        if (availableUnits < unitsToProvide) {
            alert('❌ Not Enough Blood in Bank!\n\nBlood Type: ' + approveRequestData.bloodType + '\nUnits Requested: ' + unitsToProvide + '\nUnits Available: ' + availableUnits + '\n\nPlease check your blood bank inventory and try with fewer units.');
            return;
        }
        
        // Update request status to Fulfilled
        let allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
        const requestIndex = allRequests.findIndex(r => r.id === approveRequestData.id);
        
        if (requestIndex !== -1) {
            // Deduct blood from inventory
            inventory[approveRequestData.bloodType] = availableUnits - unitsToProvide;
            localStorage.setItem(currentUser.email + '_inventory', JSON.stringify(inventory));
            
            // Update timestamps
            const inventoryTimestamps = JSON.parse(localStorage.getItem(currentUser.email + '_inventory_timestamps')) || {};
            inventoryTimestamps[approveRequestData.bloodType] = new Date().toISOString();
            localStorage.setItem(currentUser.email + '_inventory_timestamps', JSON.stringify(inventoryTimestamps));
            
            // Update request
            allRequests[requestIndex].status = 'Fulfilled';
            allRequests[requestIndex].approvedBy = currentUser.hospitalName;
            allRequests[requestIndex].approvedDate = new Date().toISOString();
            allRequests[requestIndex].approvalNotes = notes;
            allRequests[requestIndex].unitsApproved = unitsToProvide;
            allRequests[requestIndex].deliveryDate = deliveryDate;
            
            // Save updated requests
            localStorage.setItem('hospitalBloodRequests', JSON.stringify(allRequests));
            
            // Close modal
            closeApproveRequestModal();
            
            // Reload inventory and table
            loadBloodInventory();
            loadOtherHospitalBloodRequests();
            filterOtherHospitalRequests();
            
            // Show success message
            showLiveNotification('✅ Request approved! ' + unitsToProvide + ' units of ' + approveRequestData.bloodType + ' approved for delivery on ' + deliveryDate, 'success');
            
            alert('✅ Request Approved Successfully!\n\nRequest from: ' + approveRequestData.hospitalName + '\nBlood Type: ' + approveRequestData.bloodType + '\nUnits Approved: ' + unitsToProvide + '\nDelivery Date: ' + deliveryDate + '\nUnits Remaining in Bank: ' + inventory[approveRequestData.bloodType] + '\n\nNotes: ' + (notes || 'None'));
        }
        
    } catch (error) {
        console.error('Error submitting approval:', error);
        alert('Error submitting approval: ' + error.message);
    }
}

// ==================== DETAIL VIEW MODALS ====================

// Open Detail View Modal
function openDetailViewModal(title, htmlContent) {
    document.getElementById('detail-view-title').textContent = title;
    document.getElementById('detail-view-content').innerHTML = htmlContent;
    const modal = document.getElementById('detailViewModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Close Detail View Modal
function closeDetailViewModal() {
    const modal = document.getElementById('detailViewModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// View Hospital Request Details (Updated)
function viewHospitalRequestDetails(requestId) {
    try {
        const allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
        const request = allRequests.find(r => r.id === requestId);
        
        if (!request) {
            alert('Request not found');
            return;
        }
        
        const content = `
            <div style="font-size: 14px; line-height: 1.8;">
                <h4 style="color: #2196F3; margin-bottom: 15px;">🏥 Hospital Information</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="font-weight: bold; width: 30%;">Hospital Name:</td><td>${request.hospitalName}</td></tr>
                    <tr><td style="font-weight: bold;">Hospital Type:</td><td>${request.hospitalType || 'N/A'}</td></tr>
                    <tr><td style="font-weight: bold;">Opening Hours:</td><td>${request.openingHours || 'Not specified'}</td></tr>
                    <tr><td style="font-weight: bold;">Doctor:</td><td>${request.doctorName}</td></tr>
                    <tr><td style="font-weight: bold;">Contact:</td><td>${request.contact}</td></tr>
                    <tr><td style="font-weight: bold;">Email:</td><td>${request.email}</td></tr>
                </table>
                
                <h4 style="color: #ff9800; margin-top: 20px; margin-bottom: 15px;">🩸 Blood Requirement</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="font-weight: bold; width: 30%;">Blood Type:</td><td style="font-size: 16px; color: #f44336; font-weight: bold;">${request.bloodType}</td></tr>
                    <tr><td style="font-weight: bold;">Units Required:</td><td>${request.units} units</td></tr>
                    <tr><td style="font-weight: bold;">Urgency:</td><td style="color: ${request.urgency === 'Urgent' ? '#f44336' : request.urgency === 'High' ? '#ff9800' : '#4caf50'}; font-weight: bold;">${request.urgency}</td></tr>
                </table>
                
                <h4 style="color: #4caf50; margin-top: 20px; margin-bottom: 15px;">📋 Medical Information</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="font-weight: bold; width: 30%;">Reason:</td><td>${request.reason}</td></tr>
                    <tr><td style="font-weight: bold; vertical-align: top;">Notes:</td><td>${request.notes || 'None'}</td></tr>
                </table>
                
                <h4 style="color: #2196F3; margin-top: 20px; margin-bottom: 15px;">📊 Request Status</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="font-weight: bold; width: 30%;">Status:</td><td><span style="padding: 5px 10px; background: ${request.status === 'Fulfilled' ? '#4caf50' : '#2196F3'}; color: white; border-radius: 3px;">${request.status}</span></td></tr>
                    <tr><td style="font-weight: bold;">Request Date:</td><td>${new Date(request.date).toLocaleString()}</td></tr>
                </table>
            </div>
        `;
        
        openDetailViewModal('🏥 Hospital Blood Request Details', content);
        
    } catch (error) {
        console.error('Error viewing request details:', error);
        alert('Error loading request details');
    }
}

// View Donation Details (Updated)
function viewDonationDetails(index) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    const donation = donations[index];
    
    if (donation) {
        const content = `
            <div style="font-size: 14px; line-height: 1.8;">
                <h4 style="color: #2196F3; margin-bottom: 15px;">💉 Donation Record</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="font-weight: bold; width: 30%;">Donation ID:</td><td>${donation.id}</td></tr>
                    <tr><td style="font-weight: bold;">Date:</td><td>${donation.date}</td></tr>
                    <tr><td style="font-weight: bold;">Time:</td><td>${donation.time}</td></tr>
                    <tr><td style="font-weight: bold;">Status:</td><td><span style="padding: 5px 10px; background: ${donation.status === 'Completed' ? '#4caf50' : '#ff9800'}; color: white; border-radius: 3px;">${donation.status}</span></td></tr>
                </table>
                
                <h4 style="color: #ff9800; margin-top: 20px; margin-bottom: 15px;">👤 Donor Information</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="font-weight: bold; width: 30%;">Donor Name:</td><td>${donation.donorName}</td></tr>
                    <tr><td style="font-weight: bold;">Donor ID:</td><td>${donation.donorId || 'N/A'}</td></tr>
                    <tr><td style="font-weight: bold;">Contact:</td><td>${donation.contact}</td></tr>
                </table>
                
                <h4 style="color: #4caf50; margin-top: 20px; margin-bottom: 15px;">🩸 Blood Details</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="font-weight: bold; width: 30%;">Blood Type:</td><td style="font-size: 16px; color: #f44336; font-weight: bold;">${donation.bloodType}</td></tr>
                    <tr><td style="font-weight: bold;">Blood Amount:</td><td>${donation.bloodAmountMl || 450} ml</td></tr>
                </table>
                
                <h4 style="color: #2196F3; margin-top: 20px; margin-bottom: 15px;">📝 Medical Notes</h4>
                <p style="background: #f5f5f5; padding: 10px; border-radius: 3px; border-left: 3px solid #2196F3;">${donation.notes || 'No notes'}</p>
                
                <p style="margin-top: 20px; color: #999; font-size: 12px;">Created: ${new Date(donation.createdAt).toLocaleString()}</p>
            </div>
        `;
        
        openDetailViewModal('💉 Blood Donation Details', content);
    }
}

// View Hospital Request Detail (for own requests)
function viewHospitalRequestDetail(requestId) {
    const allRequests = JSON.parse(localStorage.getItem('hospitalBloodRequests')) || [];
    const request = allRequests.find(r => r.id === requestId);
    
    if (!request) {
        alert('Request not found');
        return;
    }
    
    const content = `
        <div style="font-size: 14px; line-height: 1.8;">
            <h4 style="color: #2196F3; margin-bottom: 15px;">🏥 Hospital Information</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 30%;">Hospital Name:</td><td>${request.hospitalName}</td></tr>
                <tr><td style="font-weight: bold;">Doctor:</td><td>${request.doctorName}</td></tr>
                <tr><td style="font-weight: bold;">Contact:</td><td>${request.contact}</td></tr>
                <tr><td style="font-weight: bold;">Email:</td><td>${request.email}</td></tr>
            </table>
            
            <h4 style="color: #ff9800; margin-top: 20px; margin-bottom: 15px;">🩸 Blood Requirement</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 30%;">Blood Type:</td><td style="font-size: 16px; color: #f44336; font-weight: bold;">${request.bloodType}</td></tr>
                <tr><td style="font-weight: bold;">Units Required:</td><td>${request.units} units</td></tr>
                <tr><td style="font-weight: bold;">Urgency:</td><td style="color: ${request.urgency === 'Urgent' ? '#f44336' : '#ff9800'}; font-weight: bold;">${request.urgency}</td></tr>
                <tr><td style="font-weight: bold; vertical-align: top;">Reason:</td><td>${request.reason}</td></tr>
            </table>
            
            <h4 style="color: #4caf50; margin-top: 20px; margin-bottom: 15px;">📊 Request Status</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="font-weight: bold; width: 30%;">Status:</td><td><span style="padding: 5px 10px; background: ${request.status === 'Fulfilled' ? '#4caf50' : '#2196F3'}; color: white; border-radius: 3px;">${request.status}</span></td></tr>
                <tr><td style="font-weight: bold;">Request Date:</td><td>${new Date(request.date).toLocaleString()}</td></tr>
            </table>
            
            <p style="margin-top: 20px; padding: 10px; background: ${request.status === 'Fulfilled' ? '#e8f5e9' : '#fff3e0'}; border-radius: 3px; border-left: 3px solid ${request.status === 'Fulfilled' ? '#4caf50' : '#ff9800'};">
                ${request.status === 'Fulfilled' ? '✅ This request has been fulfilled!' : '⏳ Waiting for blood availability...'}
            </p>
        </div>
    `;
    
    openDetailViewModal('🏥 Hospital Blood Request Details', content);
}

// Generate Certificate for Donor (Called when donation is completed)
function generateDonorCertificate(donationData) {
    const donorEmail = normalizeEmail(donationData.donorEmail);
    if (!donorEmail) {
        console.error('❌ Cannot generate certificate: No donor email provided');
        return null;
    }

    const certificateKey = donorEmail + '_certificates';
    let certificates = JSON.parse(localStorage.getItem(certificateKey)) || [];

    if (donationData.certificateId) {
        const existingCertificate = certificates.find(c => c.id === donationData.certificateId);
        if (existingCertificate) {
            console.log('✅ Certificate already exists, returning existing one');
            return existingCertificate;
        }
    }

    // Create certificate object
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const certificateTemplateData = JSON.parse(localStorage.getItem(currentUser.email + '_certificate_template'));
    
    // Get and increment certificate counter (sequential starting from 1)
    const counterKey = currentUser.email + '_certificate_counter';
    let certificateCounter = parseInt(localStorage.getItem(counterKey)) || 0;
    certificateCounter++;
    localStorage.setItem(counterKey, certificateCounter.toString());
    
    const donorName = resolveDonorDisplayName(donorEmail, donationData.donorName);
    
    const certificate = {
        id: Date.now(),
        certificateNumber: certificateCounter,
        donorName: donorName,
        donorEmail: donorEmail,
        bloodType: donationData.bloodType,
        units: donationData.units,
        bloodAmountMl: donationData.bloodAmountMl || 450,
        date: donationData.date,
        time: donationData.time,
        hospitalName: currentUser.hospitalName || 'Hospital',
        issuedDate: new Date().toISOString(),
        status: 'Approved',
        hasTemplate: certificateTemplateData ? true : false,
        template: certificateTemplateData ? certificateTemplateData.template : null
    };
    
    // Generate certificate image with canvas if template exists
    if (certificateTemplateData && certificateTemplateData.template) {
        generateCertificateWithCanvas(certificate, certificateTemplateData.template, (certificateImageUrl) => {
            certificate.certificateImageUrl = certificateImageUrl;
            
            // Store certificate under donor's email
            certificates.push(certificate);
            localStorage.setItem(certificateKey, JSON.stringify(certificates));
            
            console.log('✅ Certificate #' + certificateCounter + ' generated with custom image and stored');
            
            // Send certificate message to donor with the image
            sendCertificateMessage(donorEmail, certificate, donationData);
        });
    } else {
        // No template, just store the certificate data
        certificates.push(certificate);
        localStorage.setItem(certificateKey, JSON.stringify(certificates));
        
        console.log('✅ Certificate #' + certificateCounter + ' generated and stored');
        
        // Send certificate message to donor
        sendCertificateMessage(donorEmail, certificate, donationData);
    }
    
    console.log('📧 Donor email (normalized):', donorEmail);
    console.log('🔑 Storage key:', certificateKey);
    console.log('📜 Total certificates for donor:', certificates.length);
    
    // Also add to donor's donation history
    const donorDonationKey = donorEmail + '_donations';
    let donorDonations = JSON.parse(localStorage.getItem(donorDonationKey)) || [];
    donorDonations.push({
        date: donationData.date,
        bloodType: donationData.bloodType,
        units: donationData.units,
        bloodAmountMl: donationData.bloodAmountMl || 450,
        status: 'Completed',
        certificateId: certificate.id
    });
    localStorage.setItem(donorDonationKey, JSON.stringify(donorDonations));
    
    return certificate;
}

// Generate Certificate Image with Canvas - Overlays donor name on template
function generateCertificateWithCanvas(certificate, templateBase64, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create an image element
    const img = new Image();
    
    img.onload = function() {
        // Set canvas size to match template image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the template image
        ctx.drawImage(img, 0, 0);
        
        // Configure text styling
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add donor name in the middle of the certificate
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Main name text
        ctx.font = 'bold 48px Arial, sans-serif';
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(certificate.donorName, centerX, centerY);
        
        // Add a subtle shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(certificate.donorName, centerX, centerY);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Add additional details below the name
        ctx.font = '24px Arial, sans-serif';
        ctx.fillStyle = '#444';
        
        const detailsY = centerY + 80;
        ctx.fillText(`Blood Type: ${certificate.bloodType} | Amount: ${certificate.bloodAmountMl}ml`, centerX, detailsY);
        
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText(`Date: ${certificate.date} | Certificate #${certificate.certificateNumber}`, centerX, detailsY + 40);
        
        ctx.font = 'italic 18px Arial, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText(`Issued by: ${certificate.hospitalName}`, centerX, detailsY + 80);
        
        // Convert canvas to base64 image
        const certificateImageUrl = canvas.toDataURL('image/png');
        
        console.log('✅ Certificate image generated with canvas');
        callback(certificateImageUrl);
    };
    
    img.onerror = function() {
        console.error('❌ Failed to load certificate template image');
        callback(null);
    };
    
    // Load the template image
    img.src = templateBase64;
}

function sendCertificateMessage(donorEmail, certificate, donationData) {
    if (!donorEmail || !certificate) return;

    const hospital = JSON.parse(localStorage.getItem('currentUser')) || {};
    const donorMessagesKey = donorEmail + '_messages';
    const normalizedDonorEmail = donorEmail.trim().toLowerCase();
    const donorMessagesKeyNormalized = normalizedDonorEmail + '_messages';
    let donorMessages = JSON.parse(localStorage.getItem(donorMessagesKey)) || [];
    if (donorMessages.length === 0 && donorMessagesKeyNormalized) {
        donorMessages = JSON.parse(localStorage.getItem(donorMessagesKeyNormalized)) || [];
    }

    const templateInfo = certificate.hasTemplate 
        ? '\n\n✨ This certificate includes a custom template from the hospital with your name.' 
        : '';

    const message = {
        id: Date.now(),
        subject: '🎉 Your Blood Donation Certificate is Ready!',
        from: hospital.hospitalName || 'Hospital Team',
        type: 'certificate',
        date: new Date().toISOString(),
        read: false,
        certificateId: certificate.id,
        certificateImageUrl: certificate.certificateImageUrl || null,
        body: `Congratulations ${resolveDonorDisplayName(donorEmail, donationData.donorName)}!\n\nYour blood donation certificate has been issued and is now available.\n\n📋 Certificate Details:\n━━━━━━━━━━━━━━━━━━\nCertificate #: ${certificate.certificateNumber}\nDonation Date: ${donationData.date} ${donationData.time}\nBlood Type: ${donationData.bloodType}\nAmount: ${certificate.bloodAmountMl || 450}ml\nIssued By: ${certificate.hospitalName}${templateInfo}\n\nYou can view or download your certificate from the "My Certificates" section in your dashboard.\n\nThank you for your generous donation and for being a lifesaver! 🩸❤️`
    };

    donorMessages.unshift(message);
    localStorage.setItem(donorMessagesKey, JSON.stringify(donorMessages));
    if (donorMessagesKeyNormalized && donorMessagesKeyNormalized !== donorMessagesKey) {
        localStorage.setItem(donorMessagesKeyNormalized, JSON.stringify(donorMessages));
    }
    
    console.log('✅ Certificate message sent to donor messages');
}

function sendCertificateForDonation(index) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    let donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    const donation = donations[index];

    if (!donation) return;
    if (donation.status !== 'Completed') {
        alert('Certificate can be sent only for completed donations.');
        return;
    }
    if (!donation.donorEmail) {
        alert('Please add a donor email to send the certificate.');
        return;
    }

    const donorEmail = normalizeEmail(donation.donorEmail);
    donation.donorEmail = donorEmail;
    donation.donorName = resolveDonorDisplayName(donorEmail, donation.donorName);

    let certificate = null;
    if (donation.certificateId) {
        const certKey = donorEmail + '_certificates';
        const certificates = JSON.parse(localStorage.getItem(certKey)) || [];
        certificate = certificates.find(c => c.id === donation.certificateId) || null;
    }

    if (!certificate) {
        certificate = generateDonorCertificate(donation);
        if (certificate) {
            donation.certificateId = certificate.id;
        }
    }

    if (certificate) {
        donations[index] = donation;
        localStorage.setItem(donorEmail + '_donations', JSON.stringify(donations));
        sendCertificateMessage(donorEmail, certificate, donation);
        showLiveNotification('📜 Certificate sent to ' + donation.donorName, 'success');
        return;
    }

    alert('Unable to generate certificate. Please try again.');
}

// ============================================
// CERTIFICATE TEMPLATE MANAGEMENT
// ============================================

// Open Certificate Settings Modal
function openCertificateSettingsModal() {
    const modal = document.getElementById('certificateSettingsModal');
    if (!modal) {
        alert('Certificate settings modal not found.');
        return;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Load existing certificate template if any
    loadCertificatePreview();
    
    showLiveNotification('📜 Certificate settings opened', 'info');
}

// Close Certificate Settings Modal
function closeCertificateSettingsModal() {
    const modal = document.getElementById('certificateSettingsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Handle Certificate Upload
function handleCertificateUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPG, PNG)');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (!user) return;
        
        // Store certificate template in localStorage
        const certificateData = {
            template: e.target.result,
            fileName: file.name,
            uploadedDate: new Date().toISOString(),
            uploadedBy: user.hospitalName || user.email
        };
        
        localStorage.setItem(user.email + '_certificate_template', JSON.stringify(certificateData));
        
        // Show preview
        loadCertificatePreview();
        
        showLiveNotification('✅ Certificate template uploaded successfully!', 'success');
        alert('Certificate template uploaded successfully!\n\nThis template will be automatically used when generating certificates for completed donations.');
    };
    
    reader.readAsDataURL(file);
}

// Load Certificate Preview
function loadCertificatePreview() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const certificateData = JSON.parse(localStorage.getItem(user.email + '_certificate_template'));
    
    const uploadSection = document.getElementById('certificate-upload-section');
    const previewSection = document.getElementById('certificate-preview-section');
    const previewImage = document.getElementById('certificate-preview-image');
    
    if (certificateData && certificateData.template) {
        // Show preview section, hide upload section
        if (uploadSection) uploadSection.style.display = 'none';
        if (previewSection) previewSection.style.display = 'block';
        if (previewImage) previewImage.src = certificateData.template;
    } else {
        // Show upload section, hide preview section
        if (uploadSection) uploadSection.style.display = 'block';
        if (previewSection) previewSection.style.display = 'none';
    }
}

// Remove Certificate Template
function removeCertificateTemplate() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    if (confirm('Are you sure you want to remove the certificate template?\n\nYou will need to upload a new template to generate certificates.')) {
        localStorage.removeItem(user.email + '_certificate_template');
        loadCertificatePreview();
        showLiveNotification('🗑️ Certificate template removed', 'warning');
        alert('Certificate template removed successfully.');
    }
}

// Check if Certificate Template is Available
function hasCertificateTemplate() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return false;
    
    const certificateData = JSON.parse(localStorage.getItem(user.email + '_certificate_template'));
    return certificateData && certificateData.template;
}

// Toggle Hospital Profile Dropdown
function toggleHospitalProfileDropdown() {
    const dropdown = document.getElementById('hospital-profile-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('hospital-profile-dropdown');
    if (dropdown && userMenu && !userMenu.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Show Hospital Profile Modal
function showHospitalProfileModal(event) {
    event.preventDefault();
    const hospital = JSON.parse(localStorage.getItem('currentHospital'));
    if (!hospital) return;
    
    const modal = document.createElement('div');
    modal.id = 'hospital-profile-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 550px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #c41e3a;">🏥 Hospital Profile</h2>
                <button onclick="document.getElementById('hospital-profile-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
            <div style="border-bottom: 2px solid #e8e8e8; padding-bottom: 15px; margin-bottom: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <p style="margin: 8px 0; grid-column: 1/-1;"><strong>Hospital Name:</strong> ${hospital.hospitalName || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Email:</strong> ${hospital.email || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Phone:</strong> ${hospital.phone || 'N/A'}</p>
                    <p style="margin: 8px 0; grid-column: 1/-1;"><strong>License Number:</strong> ${hospital.licenseNumber || 'N/A'}</p>
                    <p style="margin: 8px 0; grid-column: 1/-1;"><strong>Address:</strong> ${hospital.address || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>City:</strong> ${hospital.city || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>State:</strong> ${hospital.state || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Zipcode:</strong> ${hospital.zipcode || 'N/A'}</p>
                    ${hospital.country ? `<p style="margin: 8px 0;"><strong>Country:</strong> ${hospital.country}</p>` : ''}
                    ${hospital.website ? `<p style="margin: 8px 0; grid-column: 1/-1;"><strong>Website:</strong> <a href="${hospital.website}" target="_blank" style="color: #007bff;">${hospital.website}</a></p>` : ''}
                    ${hospital.description ? `<p style="margin: 8px 0; grid-column: 1/-1;"><strong>Description:</strong> ${hospital.description}</p>` : ''}
                </div>
            </div>
            <div style="text-align: center; display: flex; gap: 10px; justify-content: center;">
                <button onclick="editHospitalProfile()" style="background-color: #007bff; color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold;">✏️ Edit Profile</button>
                <button onclick="document.getElementById('hospital-profile-modal').remove()" style="background-color: #6c757d; color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold;">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Edit Hospital Profile
function editHospitalProfile() {
    const modal = document.getElementById('hospital-profile-modal');
    if (modal) modal.remove();
    
    // Navigate to edit hospital profile page
    window.location.href = 'editHospitalProfile.html';
}

// ==================== ENHANCED ANALYTICS FUNCTIONS ====================

// Store chart instances globally to destroy before redrawing
let donationsTrendChartInstance = null;
let bloodTypeChartInstance = null;
let appointmentStatusChartInstance = null;
let requestStatusChartInstance = null;

// Enhanced Load Analytics with Charts
function loadAnalytics() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    // Get filter period
    const filter = document.getElementById('analytics-filter')?.value || 'month';
    
    // Get all data
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    const appointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
    const requests = JSON.parse(localStorage.getItem(user.email + '_requests')) || [];
    
    // Get date range based on filter
    const dateRange = getDateRange(filter);
    
    // Filter data by date range
    const filteredDonations = donations.filter(d => {
        if (!d.date) return false;
        const donationDate = new Date(d.date);
        return donationDate >= dateRange.start && donationDate <= dateRange.end;
    });
    
    const filteredAppointments = appointments.filter(a => {
        if (!a.date) return false;
        const aptDate = new Date(a.date);
        return aptDate >= dateRange.start && aptDate <= dateRange.end;
    });
    
    const filteredRequests = requests.filter(r => {
        if (!r.date) return false;
        const reqDate = new Date(r.date);
        return reqDate >= dateRange.start && reqDate <= dateRange.end;
    });
    
    // Update basic metrics
    updateBasicMetrics(filteredDonations, filteredAppointments, filteredRequests, donations, appointments, requests, filter);
    
    // Update charts
    updateDonationsTrendChart();
    updateBloodTypeChart(filteredDonations);
    updateAppointmentStatusChart(filteredAppointments);
    updateRequestStatusChart(filteredRequests);
    
    // Update detailed analytics
    updateDetailedAnalytics(filteredDonations, filteredAppointments, filteredRequests);
    
    // Update performance metrics
    updatePerformanceMetrics(filteredDonations, filteredAppointments, filteredRequests);
}

// Get date range based on filter
function getDateRange(filter) {
    const now = new Date();
    const start = new Date();
    
    switch(filter) {
        case 'week':
            start.setDate(now.getDate() - 7);
            break;
        case 'month':
            start.setMonth(now.getMonth() - 1);
            break;
        case 'quarter':
            start.setMonth(now.getMonth() - 3);
            break;
        case 'year':
            start.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
            start.setFullYear(2020, 0, 1);
            break;
    }
    
    return { start, end: now };
}

// Update basic metrics
function updateBasicMetrics(filteredDonations, filteredAppointments, filteredRequests, allDonations, allAppointments, allRequests, filter) {
    const completedDonations = filteredDonations.filter(d => d.status === 'Completed');
    
    // Total donations
    updateAnalyticsCard('analytics-donations-month', completedDonations.length, 'analytics-donations-change', `📊 ${filter} period`);
    
    // Blood collected
    const totalBlood = (completedDonations.reduce((sum, d) => sum + (d.bloodAmountMl || 450), 0) / 1000).toFixed(2);
    updateAnalyticsCard('analytics-blood-units', totalBlood, 'analytics-units-change', `💉 ${completedDonations.length} donations`);
    
    // Fulfilled requests
    const fulfilledReqs = filteredRequests.filter(r => r.status === 'Fulfilled').length;
    const fulfillmentRate = filteredRequests.length > 0 ? ((fulfilledReqs / filteredRequests.length) * 100).toFixed(1) : 0;
    updateAnalyticsCard('analytics-fulfilled-requests', fulfilledReqs, 'analytics-requests-change', `✅ ${fulfillmentRate}% rate`);
}

// Global Search Functionality
let searchTimeout = null;

function handleGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    const clearBtn = document.querySelector('.clear-search-btn');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Show/hide clear button
    if (searchTerm) {
        clearBtn.style.display = 'flex';
    } else {
        clearBtn.style.display = 'none';
    }
    
    // Debounce search
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performGlobalSearch(searchTerm);
    }, 300);
}

function performGlobalSearch(searchTerm) {
    if (!searchTerm) {
        // If search is empty, reload all data
        loadAnalytics();
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !user.email) return;
    
    // Get all data
    const allDonations = JSON.parse(localStorage.getItem(user.email + '_donations') || '[]');
    const allAppointments = JSON.parse(localStorage.getItem(user.email + '_appointments') || '[]');
    const allRequests = JSON.parse(localStorage.getItem(user.email + '_requests') || '[]');
    
    // Filter donations
    const filteredDonations = allDonations.filter(d => 
        (d.donorName && d.donorName.toLowerCase().includes(searchTerm)) ||
        (d.bloodType && d.bloodType.toLowerCase().includes(searchTerm)) ||
        (d.status && d.status.toLowerCase().includes(searchTerm)) ||
        (d.donationId && d.donationId.toLowerCase().includes(searchTerm))
    );
    
    // Filter appointments
    const filteredAppointments = allAppointments.filter(a => 
        (a.donorName && a.donorName.toLowerCase().includes(searchTerm)) ||
        (a.bloodType && a.bloodType.toLowerCase().includes(searchTerm)) ||
        (a.status && a.status.toLowerCase().includes(searchTerm)) ||
        (a.date && a.date.includes(searchTerm))
    );
    
    // Filter requests
    const filteredRequests = allRequests.filter(r => 
        (r.patientName && r.patientName.toLowerCase().includes(searchTerm)) ||
        (r.bloodType && r.bloodType.toLowerCase().includes(searchTerm)) ||
        (r.status && r.status.toLowerCase().includes(searchTerm)) ||
        (r.urgency && r.urgency.toLowerCase().includes(searchTerm))
    );
    
    // Update charts with filtered data
    updateDonationsTrendChart(filteredDonations);
    updateBloodTypeChart(filteredDonations);
    
    // Update analytics cards with filtered data
    updateAnalyticsCards(filteredDonations, filteredAppointments, filteredRequests, allDonations, allAppointments, allRequests);
    
    // Show search results count
    console.log(`Search results: ${filteredDonations.length} donations, ${filteredAppointments.length} appointments, ${filteredRequests.length} requests`);
}

function clearGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    const clearBtn = document.querySelector('.clear-search-btn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Reload all data
    loadAnalytics();
}

// Handle Trend Period Change - Show/Hide Custom Date Range
function handleTrendPeriodChange() {
    const periodSelect = document.getElementById('trend-period');
    const customDateRange = document.getElementById('custom-date-range');
    
    if (!periodSelect || !customDateRange) return;
    
    if (periodSelect.value === 'custom') {
        // Show custom date range inputs
        customDateRange.style.display = 'flex';
        
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        document.getElementById('trend-start-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('trend-end-date').value = endDate.toISOString().split('T')[0];
        
        // Set max date to today
        document.getElementById('trend-start-date').max = endDate.toISOString().split('T')[0];
        document.getElementById('trend-end-date').max = endDate.toISOString().split('T')[0];
    } else {
        // Hide custom date range inputs
        customDateRange.style.display = 'none';
    }
    
    // Update the chart
    updateDonationsTrendChart();
}

// Update Donations Trend Chart
function updateDonationsTrendChart() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const period = document.getElementById('trend-period')?.value || 30;
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    
    let labels = [];
    let data = [];
    let startDate, endDate;
    
    // Check if custom date range is selected
    if (period === 'custom') {
        const startDateInput = document.getElementById('trend-start-date')?.value;
        const endDateInput = document.getElementById('trend-end-date')?.value;
        
        if (!startDateInput || !endDateInput) {
            // Set default dates if not provided
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
        } else {
            startDate = new Date(startDateInput);
            endDate = new Date(endDateInput);
        }
        
        // Generate labels and data for custom date range
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        for (let i = 0; i < daysDiff; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            labels.push(dateStr);
            
            const count = donations.filter(d => {
                const donationDate = new Date(d.date);
                return donationDate.toDateString() === date.toDateString() && d.status === 'Completed';
            }).length;
            
            data.push(count);
        }
    } else {
        // Get last N days (existing logic)
        const days = parseInt(period);
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            labels.push(dateStr);
            
            const count = donations.filter(d => {
                const donationDate = new Date(d.date);
                return donationDate.toDateString() === date.toDateString() && d.status === 'Completed';
            }).length;
            
            data.push(count);
        }
    }
    
    const ctx = document.getElementById('donationsTrendChart');
    if (!ctx) return;
    
    // Destroy previous chart
    if (donationsTrendChartInstance) {
        donationsTrendChartInstance.destroy();
    }
    
    donationsTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Donations',
                data: data,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Update Blood Type Distribution Chart
function updateBloodTypeChart(donations) {
    const ctx = document.getElementById('bloodTypeChart');
    if (!ctx) return;
    
    // Count donations by blood type
    const bloodTypes = {};
    donations.forEach(d => {
        if (d.bloodType) {
            bloodTypes[d.bloodType] = (bloodTypes[d.bloodType] || 0) + 1;
        }
    });
    
    const labels = Object.keys(bloodTypes).sort();
    const data = labels.map(type => bloodTypes[type]);
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6ab04c', '#eb4d4b', '#95afc0', '#535c68'];
    
    // Destroy previous chart
    if (bloodTypeChartInstance) {
        bloodTypeChartInstance.destroy();
    }
    
    bloodTypeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return ` ${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update Appointment Status Chart
function updateAppointmentStatusChart(appointments) {
    const ctx = document.getElementById('appointmentStatusChart');
    if (!ctx) return;
    
    const scheduled = appointments.filter(a => a.status === 'Scheduled').length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
    
    // Update detail stats
    document.getElementById('stat-scheduled').textContent = scheduled;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-cancelled').textContent = cancelled;
    
    const total = scheduled + completed + cancelled;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
    document.getElementById('stat-completion-rate').textContent = completionRate + '%';
    
    // Destroy previous chart
    if (appointmentStatusChartInstance) {
        appointmentStatusChartInstance.destroy();
    }
    
    appointmentStatusChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Scheduled', 'Completed', 'Cancelled'],
            datasets: [{
                data: [scheduled, completed, cancelled],
                backgroundColor: ['#ff9800', '#4caf50', '#f44336'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Update Request Status Chart
function updateRequestStatusChart(requests) {
    const ctx = document.getElementById('requestStatusChart');
    if (!ctx) return;
    
    const pending = requests.filter(r => r.status === 'Pending').length;
    const fulfilled = requests.filter(r => r.status === 'Fulfilled').length;
    const cancelled = requests.filter(r => r.status === 'Cancelled').length;
    
    // Update detail stats
    document.getElementById('req-pending').textContent = pending;
    document.getElementById('req-fulfilled').textContent = fulfilled;
    document.getElementById('req-cancelled').textContent = cancelled;
    
    const total = pending + fulfilled + cancelled;
    const successRate = total > 0 ? ((fulfilled / total) * 100).toFixed(1) : 0;
    document.getElementById('req-success-rate').textContent = successRate + '%';
    
    // Destroy previous chart
    if (requestStatusChartInstance) {
        requestStatusChartInstance.destroy();
    }
    
    requestStatusChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'Fulfilled', 'Cancelled'],
            datasets: [{
                data: [pending, fulfilled, cancelled],
                backgroundColor: ['#ff9800', '#4caf50', '#f44336'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Update Detailed Analytics
function updateDetailedAnalytics(donations, appointments, requests) {
    // Top Blood Types in Demand
    const bloodTypeCount = {};
    requests.forEach(r => {
        if (r.bloodType) {
            bloodTypeCount[r.bloodType] = (bloodTypeCount[r.bloodType] || 0) + parseInt(r.unitsRequired || 1);
        }
    });
    
    const topBloodTypes = Object.entries(bloodTypeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const topListContainer = document.getElementById('top-blood-types');
    if (topListContainer && topBloodTypes.length > 0) {
        topListContainer.innerHTML = topBloodTypes.map((item, index) => `
            <div class="top-item">
                <div class="top-item-rank">#${index + 1}</div>
                <div class="top-item-info">
                    <div class="top-item-blood">${item[0]}</div>
                    <div class="top-item-count">${item[1]} units requested</div>
                </div>
                <div class="top-item-value">${item[1]}</div>
            </div>
        `).join('');
    } else if (topListContainer) {
        topListContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No request data available</p>';
    }
}

// Update Performance Metrics
function updatePerformanceMetrics(donations, appointments, requests) {
    // Blood collected
    const totalBlood = (donations.filter(d => d.status === 'Completed')
        .reduce((sum, d) => sum + (d.bloodAmountMl || 450), 0) / 1000).toFixed(2);
    const bloodTarget = 100; // Set a target
    const bloodPercentage = Math.min((totalBlood / bloodTarget) * 100, 100).toFixed(1);
    
    document.getElementById('perf-blood-collected').textContent = totalBlood + ' L';
    document.getElementById('perf-blood-bar').style.width = bloodPercentage + '%';
    
    // Donor engagement
    const totalApts = appointments.length;
    const completedApts = appointments.filter(a => a.status === 'Completed').length;
    const engagementRate = totalApts > 0 ? ((completedApts / totalApts) * 100).toFixed(1) : 0;
    
    document.getElementById('perf-engagement').textContent = engagementRate + '%';
    document.getElementById('perf-engagement-bar').style.width = engagementRate + '%';
    
    // Request resolution
    const totalReqs = requests.length;
    const fulfilledReqs = requests.filter(r => r.status === 'Fulfilled').length;
    const resolutionRate = totalReqs > 0 ? ((fulfilledReqs / totalReqs) * 100).toFixed(1) : 0;
    
    document.getElementById('perf-resolution').textContent = resolutionRate + '%';
    document.getElementById('perf-resolution-bar').style.width = resolutionRate + '%';
}

// Export Analytics Report
function exportAnalyticsReport() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const filter = document.getElementById('analytics-filter')?.value || 'month';
    const dateRange = getDateRange(filter);
    
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    const appointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
    const requests = JSON.parse(localStorage.getItem(user.email + '_requests')) || [];
    
    let report = `ANALYTICS REPORT - ${user.hospitalName}\n`;
    report += `Period: ${filter.toUpperCase()}\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `\n${'='.repeat(60)}\n\n`;
    report += `KEY METRICS:\n`;
    report += `\nTotal Donations: ${donations.filter(d => d.status === 'Completed').length}\n`;
    report += `Blood Collected: ${(donations.filter(d => d.status === 'Completed').reduce((sum, d) => sum + (d.bloodAmountMl || 450), 0) / 1000).toFixed(2)} L\n`;
    report += `Active Appointments: ${appointments.filter(a => a.status === 'Scheduled').length}\n`;
    report += `Fulfilled Requests: ${requests.filter(r => r.status === 'Fulfilled').length}\n`;
    report += `\n${'='.repeat(60)}\n`;
    
    // Download as text file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_report_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Analytics report exported successfully!');
}

// Export Donations Report
function exportDonationsReport() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    
    let csv = 'Date,Donor Name,Blood Type,Amount (ml),Status,Hospital\n';
    donations.forEach(d => {
        csv += `"${new Date(d.date).toLocaleDateString()}","${d.donorName}","${d.bloodType}","${d.bloodAmountMl || 450}","${d.status}","${user.hospitalName}"\n`;
    });
    
    downloadCSV(csv, 'donations_report.csv');
}

// Export Appointments Report
function exportAppointmentsReport() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const appointments = JSON.parse(localStorage.getItem(user.email + '_appointments')) || [];
    
    let csv = 'Date,Time,Donor Name,Blood Type,Status\n';
    appointments.forEach(a => {
        csv += `"${a.date}","${a.time}","${a.donorName}","${a.bloodType}","${a.status}"\n`;
    });
    
    downloadCSV(csv, 'appointments_report.csv');
}

// Export Requests Report
function exportRequestsReport() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const requests = JSON.parse(localStorage.getItem(user.email + '_requests')) || [];
    
    let csv = 'Date,Patient Name,Blood Type,Units Required,Urgency,Status\n';
    requests.forEach(r => {
        csv += `"${new Date(r.date).toLocaleDateString()}","${r.patientName}","${r.bloodType}","${r.unitsRequired}","${r.urgency}","${r.status}"\n`;
    });
    
    downloadCSV(csv, 'requests_report.csv');
}

// Export Full Analytics
function exportFullAnalytics() {
    exportAnalyticsReport();
    setTimeout(() => exportDonationsReport(), 500);
    setTimeout(() => exportAppointmentsReport(), 1000);
    setTimeout(() => exportRequestsReport(), 1500);
    
    alert('✅ Exporting complete analytics package...');
}

// Helper function to download CSV
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
