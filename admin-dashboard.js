const API_URL = 'http://localhost:3000/api';

let cache = {
    donors: [],
    hospitals: [],
    donations: [],
    requests: []
};

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupTabNavigation();
    loadOverviewData();

    setInterval(() => {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;
        const tabName = activeTab.id.replace('-tab', '');
        loadTabData(tabName);
    }, 30000);
});

function initializeDashboard() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    addConnectionStatus();
    checkServerConnection();
}

function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            navItems.forEach((nav) => nav.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
            const tabName = item.getAttribute('data-tab');
            const selected = document.getElementById(`${tabName}-tab`);
            if (selected) {
                selected.classList.add('active');
                loadTabData(tabName);
            }
        });
    });
}

function loadTabData(tabName) {
    switch (tabName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'donors':
            refreshDonors();
            break;
        case 'hospitals':
            refreshHospitals();
            break;
        case 'donations':
            refreshDonations();
            break;
        case 'requests':
            refreshRequests();
            break;
        case 'database':
            loadDatabaseInfo();
            break;
        default:
            break;
    }
}

function addConnectionStatus() {
    const header = document.querySelector('.header-right');
    if (!header) return;

    const statusDiv = document.createElement('div');
    statusDiv.id = 'connectionStatus';
    statusDiv.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:8px',
        'padding:6px 12px',
        'background:#f0f0f0',
        'border-radius:20px',
        'font-size:0.85rem',
        'font-weight:600'
    ].join(';');

    statusDiv.innerHTML = `
        <span id="statusDot" style="width:8px;height:8px;border-radius:50%;background:#ffa500;"></span>
        <span id="statusText">Checking...</span>
    `;

    header.insertBefore(statusDiv, header.firstChild);
}

async function checkServerConnection() {
    try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
            updateConnectionStatus('connected', '🟢 Live', '#4CAF50');
        } else {
            updateConnectionStatus('error', '🔴 Error', '#f44336');
        }
    } catch (error) {
        updateConnectionStatus('offline', '🔴 Offline', '#f44336');
        showNotification('Backend server is not running on port 3000', 'error');
    }
}

function updateConnectionStatus(status, text, color) {
    const dot = document.getElementById('statusDot');
    const textEl = document.getElementById('statusText');
    const wrapper = document.getElementById('connectionStatus');

    if (dot) dot.style.background = color;
    if (textEl) textEl.textContent = text;
    if (wrapper) {
        wrapper.style.background = status === 'connected' ? '#e8f5e9' : '#ffebee';
    }
}

async function loadOverviewData() {
    try {
        const [dbInfoRes, requestsRes] = await Promise.all([
            fetch(`${API_URL}/database/info`),
            fetch(`${API_URL}/blood-requests`)
        ]);

        const dbInfo = dbInfoRes.ok ? await dbInfoRes.json() : {};
        const requests = requestsRes.ok ? await requestsRes.json() : [];

        updateStatCards({
            totalDonors: dbInfo.donorsCount || 0,
            totalHospitals: dbInfo.hospitalsCount || 0,
            totalDonations: dbInfo.donationsCount || 0,
            totalRequests: requests.length || dbInfo.requestsCount || 0
        });

        await Promise.all([loadRecentActivity(), drawBloodTypeChart()]);
    } catch (error) {
        console.error('Error loading overview data:', error);
        updateStatCards({ totalDonors: 0, totalHospitals: 0, totalDonations: 0, totalRequests: 0 });
        showNotification('Failed to load overview data', 'error');
    }
}

function updateStatCards(stats) {
    animateCounter('totalDonors', Number(stats.totalDonors || 0));
    animateCounter('totalHospitals', Number(stats.totalHospitals || 0));
    animateCounter('totalDonations', Number(stats.totalDonations || 0));
    animateCounter('totalRequests', Number(stats.totalRequests || 0));
}

function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const start = Number(element.textContent.replace(/,/g, '')) || 0;
    const duration = 500;
    const steps = 20;
    const increment = (target - start) / steps;
    let current = start;
    let count = 0;

    const timer = setInterval(() => {
        count += 1;
        current += increment;
        if (count >= steps) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
            return;
        }
        element.textContent = Math.round(current).toLocaleString();
    }, duration / steps);
}

async function drawBloodTypeChart() {
    const canvas = document.getElementById('bloodTypeChart');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const response = await fetch(`${API_URL}/blood-statistics`);
    if (!response.ok) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const data = await response.json();
    const donorsByType = data.donorsByType || [];

    const labels = donorsByType.map((item) => item.bloodType);
    const values = donorsByType.map((item) => Number(item.count || 0));

    const width = canvas.width = canvas.clientWidth || 400;
    const height = canvas.height = 220;

    context.clearRect(0, 0, width, height);

    if (!values.length) {
        context.fillStyle = '#999';
        context.font = '14px Arial';
        context.textAlign = 'center';
        context.fillText('No blood type data available', width / 2, height / 2);
        return;
    }

    const padding = 30;
    const barGap = 12;
    const maxValue = Math.max(...values, 1);
    const barWidth = (width - padding * 2 - barGap * (values.length - 1)) / values.length;

    values.forEach((value, index) => {
        const barHeight = ((height - 70) * value) / maxValue;
        const x = padding + index * (barWidth + barGap);
        const y = height - 40 - barHeight;

        context.fillStyle = '#c41e3a';
        context.fillRect(x, y, barWidth, barHeight);

        context.fillStyle = '#333';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText(labels[index], x + barWidth / 2, height - 20);
        context.fillText(String(value), x + barWidth / 2, y - 6);
    });
}

async function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

    try {
        const [donorsRes, hospitalsRes, donationsRes, requestsRes] = await Promise.all([
            fetch(`${API_URL}/donors`),
            fetch(`${API_URL}/hospitals`),
            fetch(`${API_URL}/donations`),
            fetch(`${API_URL}/blood-requests`)
        ]);

        const donors = donorsRes.ok ? await donorsRes.json() : [];
        const hospitals = hospitalsRes.ok ? await hospitalsRes.json() : [];
        const donations = donationsRes.ok ? await donationsRes.json() : [];
        const requests = requestsRes.ok ? await requestsRes.json() : [];

        const activities = [
            ...donors.slice(0, 2).map((donor) => ({
                icon: '👤',
                title: `${donor.name} registered as donor`,
                time: getTimeAgo(donor.createdAt),
                color: '#4ecdc4'
            })),
            ...hospitals.slice(0, 2).map((hospital) => ({
                icon: '🏥',
                title: `${hospital.name} hospital profile available`,
                time: getTimeAgo(hospital.createdAt),
                color: '#ff6b6b'
            })),
            ...donations.slice(0, 2).map((donation) => ({
                icon: '🩸',
                title: `${donation.donorName || `Donor ${donation.donorId}`} donated ${donation.bloodType}`,
                time: getTimeAgo(donation.donationDate),
                color: '#95e1d3'
            })),
            ...requests.slice(0, 2).map((request) => ({
                icon: '📋',
                title: `${request.hospitalName || `Hospital ${request.hospitalId}`} requested ${request.bloodType}`,
                time: getTimeAgo(request.createdAt),
                color: '#f38181'
            }))
        ].slice(0, 6);

        if (!activities.length) {
            activityList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No recent activity</p>';
            return;
        }

        activityList.innerHTML = activities.map((activity) => `
            <div class="activity-item">
                <div class="activity-icon" style="background:${activity.color}20;color:${activity.color}">${activity.icon}</div>
                <div class="activity-info">
                    <h4>${activity.title}</h4>
                    <p>${activity.time}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Unable to load recent activity</p>';
    }
}

async function refreshDonors() {
    const tbody = document.getElementById('donorsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">🔄 Loading donors...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/donors`);
        const donors = response.ok ? await response.json() : [];
        cache.donors = donors;

        if (!donors.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No donors registered yet</td></tr>';
            return;
        }

        tbody.innerHTML = donors.map((donor) => `
            <tr data-search="${buildSearchText([donor.id, donor.name, donor.email, donor.bloodType, donor.city, donor.phone])}">
                <td>${donor.id}</td>
                <td>${donor.name || 'N/A'}</td>
                <td>${donor.email || 'N/A'}</td>
                <td><strong style="color:#c41e3a;">${donor.bloodType || 'N/A'}</strong></td>
                <td>${donor.phone || 'N/A'}</td>
                <td>${donor.city || 'N/A'}</td>
                <td>${formatDate(donor.createdAt)}</td>
                <td>
                    <button class="action-btn btn-view" onclick="viewDonor(${donor.id})" title="View">👁️</button>
                    <button class="action-btn btn-delete" onclick="deleteDonor(${donor.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error fetching donors:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">❌ Error loading donors</td></tr>';
    }
}

async function refreshHospitals() {
    const tbody = document.getElementById('hospitalsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">🔄 Loading hospitals...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/hospitals`);
        const hospitals = response.ok ? await response.json() : [];
        cache.hospitals = hospitals;

        if (!hospitals.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No hospitals found</td></tr>';
            return;
        }

        tbody.innerHTML = hospitals.map((hospital) => `
            <tr data-search="${buildSearchText([hospital.id, hospital.name, hospital.email, hospital.phone, hospital.city])}">
                <td>${hospital.id}</td>
                <td>${hospital.name || 'N/A'}</td>
                <td>General</td>
                <td>${hospital.email || 'N/A'}</td>
                <td>${hospital.phone || 'N/A'}</td>
                <td>${hospital.city || 'N/A'}</td>
                <td>${hospital.isVerified ? '✅' : '❌'}</td>
                <td>
                    <button class="action-btn btn-view" onclick="viewHospital(${hospital.id})" title="View">👁️</button>
                    <button class="action-btn btn-delete" onclick="deleteHospital(${hospital.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error fetching hospitals:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">❌ Error loading hospitals</td></tr>';
    }
}

async function refreshDonations() {
    const tbody = document.getElementById('donationsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">🔄 Loading donations...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/donations`);
        const donations = response.ok ? await response.json() : [];
        cache.donations = donations;

        if (!donations.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No donations found</td></tr>';
            return;
        }

        tbody.innerHTML = donations.map((donation) => `
            <tr data-search="${buildSearchText([donation.id, donation.donorId, donation.donorName, donation.bloodType, donation.status])}">
                <td>${donation.id}</td>
                <td>${donation.donorId}</td>
                <td>${donation.donorName || 'N/A'}</td>
                <td><strong>${donation.bloodType || 'N/A'}</strong></td>
                <td>${donation.unitsCollected || 1} units</td>
                <td>${formatDate(donation.donationDate)}</td>
                <td><span class="badge-status ${safeClass(donation.status || 'completed')}">${donation.status || 'completed'}</span></td>
                <td>
                    <button class="action-btn btn-view" onclick="viewDonation(${donation.id})" title="View">👁️</button>
                    <button class="action-btn btn-delete" onclick="deleteDonation(${donation.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error fetching donations:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">❌ Error loading donations</td></tr>';
    }
}

async function refreshRequests() {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="no-data">🔄 Loading blood requests...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/blood-requests`);
        const requests = response.ok ? await response.json() : [];
        cache.requests = requests;

        if (!requests.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No blood requests found</td></tr>';
            return;
        }

        tbody.innerHTML = requests.map((request) => `
            <tr data-search="${buildSearchText([request.id, request.bloodType, request.hospitalName, request.status, request.urgencyLevel])}">
                <td>${request.id}</td>
                <td>${request.patientName || 'N/A'}</td>
                <td><strong>${request.bloodType || 'N/A'}</strong></td>
                <td>${request.unitsNeeded || 0} units</td>
                <td>${request.hospitalName || `Hospital ${request.hospitalId}`}</td>
                <td><span class="urgency-badge ${safeClass(request.urgencyLevel || 'normal')}">${request.urgencyLevel || 'normal'}</span></td>
                <td><span class="status-badge ${safeClass(request.status || 'pending')}">${request.status || 'pending'}</span></td>
                <td>
                    <button class="action-btn btn-view" onclick="viewRequest(${request.id})" title="View">👁️</button>
                    <button class="action-btn btn-edit" onclick="editRequest(${request.id})" title="Update Status">✏️</button>
                    <button class="action-btn btn-delete" onclick="deleteRequest(${request.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error fetching requests:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">❌ Error loading blood requests</td></tr>';
    }
}

async function loadDatabaseInfo() {
    const dbInfoDiv = document.getElementById('databaseInfo');
    const tableStatsDiv = document.getElementById('tableStats');
    if (!dbInfoDiv || !tableStatsDiv) return;

    try {
        const response = await fetch(`${API_URL}/database/info`);
        const info = response.ok ? await response.json() : {};

        dbInfoDiv.innerHTML = `
            <p><strong>Database Type:</strong> ${info.database || 'SQLite'}</p>
            <p><strong>Database Size:</strong> ${info.size || 'N/A'}</p>
            <p><strong>Last Backup:</strong> ${info.lastBackup ? formatDateTime(info.lastBackup) : 'Never'}</p>
            <p><strong>Status:</strong> <span style="color:green;">✅ Connected</span></p>
            <p><strong>Server:</strong> http://localhost:3000</p>
        `;

        tableStatsDiv.innerHTML = `
            <p><strong>Donors:</strong> ${info.donorsCount || 0} records</p>
            <p><strong>Hospitals:</strong> ${info.hospitalsCount || 0} records</p>
            <p><strong>Donations:</strong> ${info.donationsCount || 0} records</p>
            <p><strong>Blood Requests:</strong> ${info.requestsCount || 0} records</p>
            <p><strong>Inventory Rows:</strong> ${info.inventoryCount || 0} records</p>
            <p><strong>Notifications:</strong> ${info.notificationsCount || 0} records</p>
        `;
    } catch (error) {
        console.error('Error loading database info:', error);
        dbInfoDiv.innerHTML = '<p style="color:red;">❌ Unable to connect to database</p>';
        tableStatsDiv.innerHTML = '<p style="color:#999;">Unable to load table statistics</p>';
    }
}

async function exportDatabase() {
    try {
        showNotification('Preparing database export...', 'info');
        const response = await fetch(`${API_URL}/database/export`);
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `blood_donation_export_${Date.now()}.db`;
        link.click();
        window.URL.revokeObjectURL(url);

        showNotification('Database exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting database:', error);
        showNotification('Failed to export database', 'error');
    }
}

async function backupDatabase() {
    if (!confirm('Create a database backup?')) return;

    try {
        const response = await fetch(`${API_URL}/database/backup`, { method: 'POST' });
        if (!response.ok) throw new Error('Backup failed');
        showNotification('Backup created successfully', 'success');
        loadDatabaseInfo();
    } catch (error) {
        console.error('Error creating backup:', error);
        showNotification('Failed to create backup', 'error');
    }
}

async function optimizeDatabase() {
    if (!confirm('Optimize database now?')) return;

    try {
        const response = await fetch(`${API_URL}/database/optimize`, { method: 'POST' });
        if (!response.ok) throw new Error('Optimize failed');
        showNotification('Database optimized successfully', 'success');
    } catch (error) {
        console.error('Error optimizing database:', error);
        showNotification('Failed to optimize database', 'error');
    }
}

async function clearAllData() {
    const confirmed = confirm('⚠️ This will permanently clear all data. Continue?');
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/database/clear`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Clear failed');
        showNotification('All data cleared successfully', 'success');
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        console.error('Error clearing data:', error);
        showNotification('Failed to clear database', 'error');
    }
}

function viewDonor(id) {
    const donor = cache.donors.find((item) => item.id === id);
    if (!donor) return;
    alert(`Donor #${donor.id}\nName: ${donor.name || 'N/A'}\nEmail: ${donor.email || 'N/A'}\nBlood Type: ${donor.bloodType || 'N/A'}\nPhone: ${donor.phone || 'N/A'}\nCity: ${donor.city || 'N/A'}\nTotal Donations: ${donor.totalDonations || 0}`);
}

function editDonor(id) {
    viewDonor(id);
}

async function deleteDonor(id) {
    if (!confirm(`Delete donor #${id}?`)) return;

    try {
        const response = await fetch(`${API_URL}/donors/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        showNotification('Donor deleted successfully', 'success');
        refreshDonors();
        loadOverviewData();
    } catch (error) {
        console.error('Error deleting donor:', error);
        showNotification('Failed to delete donor', 'error');
    }
}

function viewHospital(id) {
    const hospital = cache.hospitals.find((item) => item.id === id);
    if (!hospital) return;
    alert(`Hospital #${hospital.id}\nName: ${hospital.name || 'N/A'}\nEmail: ${hospital.email || 'N/A'}\nPhone: ${hospital.phone || 'N/A'}\nCity: ${hospital.city || 'N/A'}\nVerified: ${hospital.isVerified ? 'Yes' : 'No'}`);
}

function editHospital(id) {
    viewHospital(id);
}

async function deleteHospital(id) {
    if (!confirm(`Delete hospital #${id}?`)) return;

    try {
        const response = await fetch(`${API_URL}/hospitals/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        showNotification('Hospital deleted successfully', 'success');
        refreshHospitals();
        loadOverviewData();
    } catch (error) {
        console.error('Error deleting hospital:', error);
        showNotification('Failed to delete hospital', 'error');
    }
}

function viewDonation(id) {
    const donation = cache.donations.find((item) => item.id === id);
    if (!donation) return;
    alert(`Donation #${donation.id}\nDonor: ${donation.donorName || donation.donorId}\nHospital: ${donation.hospitalName || donation.hospitalId}\nBlood Type: ${donation.bloodType}\nUnits: ${donation.unitsCollected || 1}\nDate: ${formatDateTime(donation.donationDate)}\nStatus: ${donation.status || 'completed'}`);
}

async function deleteDonation(id) {
    if (!confirm(`Delete donation #${id}?`)) return;

    try {
        const response = await fetch(`${API_URL}/donations/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        showNotification('Donation deleted successfully', 'success');
        refreshDonations();
        loadOverviewData();
    } catch (error) {
        console.error('Error deleting donation:', error);
        showNotification('Failed to delete donation', 'error');
    }
}

function viewRequest(id) {
    const request = cache.requests.find((item) => item.id === id);
    if (!request) return;
    alert(`Request #${request.id}\nHospital: ${request.hospitalName || request.hospitalId}\nBlood Type: ${request.bloodType}\nUnits Needed: ${request.unitsNeeded}\nUrgency: ${request.urgencyLevel || 'normal'}\nStatus: ${request.status || 'pending'}\nRequired By: ${formatDate(request.requiredByDate)}\nPatient: ${request.patientName || 'N/A'}`);
}

async function editRequest(id) {
    const request = cache.requests.find((item) => item.id === id);
    if (!request) return;

    const currentStatus = request.status || 'pending';
    const nextStatus = prompt('Update request status (pending / fulfilled / cancelled):', currentStatus);
    if (!nextStatus) return;

    try {
        const response = await fetch(`${API_URL}/donation-requests/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus.toLowerCase() })
        });

        if (!response.ok) throw new Error('Update failed');
        showNotification('Request status updated', 'success');
        refreshRequests();
        loadOverviewData();
    } catch (error) {
        console.error('Error updating request:', error);
        showNotification('Failed to update request', 'error');
    }
}

async function deleteRequest(id) {
    if (!confirm(`Delete request #${id}?`)) return;

    try {
        const response = await fetch(`${API_URL}/donation-requests/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        showNotification('Request deleted successfully', 'success');
        refreshRequests();
        loadOverviewData();
    } catch (error) {
        console.error('Error deleting request:', error);
        showNotification('Failed to delete request', 'error');
    }
}

function handleSearch(event) {
    const term = String(event.target.value || '').toLowerCase().trim();
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;

    const rows = activeTab.querySelectorAll('tbody tr');
    rows.forEach((row) => {
        if (!term) {
            row.style.display = '';
            return;
        }

        const haystack = (row.getAttribute('data-search') || row.textContent || '').toLowerCase();
        row.style.display = haystack.includes(term) ? '' : 'none';
    });
}

function buildSearchText(values) {
    return values.filter(Boolean).join(' ').toLowerCase();
}

function safeClass(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTimeAgo(dateString) {
    if (!dateString) return 'Recently';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Recently';

    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 18px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.25s ease;
        font-weight: 600;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.25s ease';
        setTimeout(() => notification.remove(), 250);
    }, 2200);
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    localStorage.removeItem('adminToken');
    window.location.href = '../html/index.html';
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .badge-status, .urgency-badge, .status-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: capitalize;
    }
    .badge-status.completed, .status-badge.fulfilled { background:#e8f5e9; color:#2e7d32; }
    .badge-status.pending, .status-badge.pending { background:#fff9c4; color:#f57f17; }
    .badge-status.cancelled, .status-badge.cancelled { background:#ffebee; color:#c62828; }
    .urgency-badge.critical, .urgency-badge.high { background:#ffebee; color:#c62828; }
    .urgency-badge.urgent, .urgency-badge.medium { background:#fff3e0; color:#e65100; }
    .urgency-badge.normal, .urgency-badge.low { background:#e8f5e9; color:#2e7d32; }
`;
document.head.appendChild(style);
