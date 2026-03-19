// Dashboard Initialization
const storedApiBaseUrl = localStorage.getItem('apiBaseUrl');
// Normalize old/stale local config that still points to port 3001.
const API_BASE_URL = storedApiBaseUrl
    ? storedApiBaseUrl.replace('localhost:3001', 'localhost:3000')
    : 'http://localhost:3000/api';
let donationChartInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing via DOMContentLoaded...');
    initializeDashboardFull();
});

// Also provide a manual init function for when loaded via AJAX
window.initializeDashboardManually = function() {
    console.log('Dashboard initializing manually...');
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        initializeDashboardFull();
    }, 100);
};

// Full initialization function
function initializeDashboardFull() {
    console.log('Dashboard full initialization starting...');
    console.log('Current user data:', JSON.parse(localStorage.getItem('currentUser')));
    
    initializeDashboard();
    setupSidebarNavigation();
    
    // Load user profile and name FIRST before anything else
    loadUserProfile();
    updateUserNameDisplay();
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        console.log('Loading dashboard data after delay...');
        loadDashboardData();
        loadDonationHistory();
        initializeCharts();
    }, 200);
    
    loadDonorAppointments();
    loadHospitalOptions();
    updateSidebarVisibility();
    updateMessagesBadge();
    
    // Keep message badge fresh if new messages arrive from hospital dashboard
    if (window.messageBadgeInterval) clearInterval(window.messageBadgeInterval);
    window.messageBadgeInterval = setInterval(updateMessagesBadge, 5000);
    
    // Sync profile displays
    if (window.updateAllProfileDisplays) {
        console.log('Syncing profile displays...');
        window.updateAllProfileDisplays();
    }
    
    // Listen for profile updates from other pages
    window.addEventListener('profileUpdated', function(e) {
        console.log('Profile updated event received:', e.detail);
        loadUserProfile();
        updateUserNameDisplay();
        loadDashboardData();
    });
    
    console.log('Dashboard initialization complete!');
}

function getUserMessageKeys(user) {
    const email = (user?.email || '').trim();
    if (!email) return [];
    const lowerEmail = email.toLowerCase();
    const keys = [`${email}_messages`];
    if (lowerEmail !== email) keys.push(`${lowerEmail}_messages`);
    return keys;
}

function readUserMessages(user) {
    const keys = getUserMessageKeys(user);
    const merged = [];

    keys.forEach(key => {
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            console.warn('Invalid message JSON for key:', key, e);
            list = [];
        }
        list.forEach(msg => merged.push(msg));
    });

    // Deduplicate by id when possible, otherwise by content signature
    const seen = new Set();
    const unique = merged.filter(msg => {
        const signature = msg.id || `${msg.subject}|${msg.timestamp}|${msg.from}`;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
    });

    unique.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.date || 0).getTime();
        const bTime = new Date(b.timestamp || b.date || 0).getTime();
        return bTime - aTime;
    });

    return unique;
}

function writeUserMessages(user, messages) {
    const keys = getUserMessageKeys(user);
    keys.forEach(key => {
        localStorage.setItem(key, JSON.stringify(messages));
    });
}

// Setup Sidebar Navigation
function setupSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (!this.classList.contains('logout-item') && this.getAttribute('onclick')?.includes('showDashboardSection')) {
                e.preventDefault();
                // Remove active class from all items
                sidebarItems.forEach(i => i.classList.remove('active'));
                // Add active class to clicked item
                this.classList.add('active');
            }
        });
    });
}

// Update Sidebar Visibility based on Completed Appointments
function updateSidebarVisibility() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const appointments = JSON.parse(localStorage.getItem('donor_appointments')) || [];
    const donorAppointments = appointments.filter(apt => apt.donorEmail === user.email);
    const hasCompletedAppointment = donorAppointments.some(apt => apt.status === 'Completed');
    
    const donationsMenu = document.getElementById('donations-menu');
    const certificatesMenu = document.getElementById('certificates-menu');
    
    if (hasCompletedAppointment) {
        if (donationsMenu) donationsMenu.style.display = 'block';
        if (certificatesMenu) certificatesMenu.style.display = 'block';
        console.log('✓ Completed appointment found - showing Donations & Certificates');
    } else {
        if (donationsMenu) donationsMenu.style.display = 'none';
        if (certificatesMenu) certificatesMenu.style.display = 'none';
        console.log('✗ No completed appointment - hiding Donations & Certificates');
    }
}

// Show Dashboard Section
function showDashboardSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Update page title based on section
        const pageTitle = document.getElementById('page-title');
        const titles = {
            'overview': 'Dashboard',
            'donations': 'My Donations',
            'health': 'Health Records',
            'appointments': 'My Appointments',
            'messages': 'Messages',
            'certificates': 'My Certificates'
        };
        if (pageTitle) {
            pageTitle.textContent = titles[sectionId] || 'Dashboard';
        }
        
        // Load section-specific data
        if (sectionId === 'overview') {
            loadDashboardData();
            initializeCharts();
        } else if (sectionId === 'donations') {
            loadDonationHistory();
        } else if (sectionId === 'appointments') {
            loadDonorAppointments();
        } else if (sectionId === 'messages') {
            loadMessages();
        } else if (sectionId === 'certificates') {
            loadCertificates();
        } else if (sectionId === 'health') {
            loadHealthRecords();
        }
    }
}

// Initialize Dashboard
function initializeDashboard() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Please login as a donor to access this dashboard.');
        window.location.href = 'login-donor.html';
        return;
    }
    
    // Check if user is actually a donor (not hospital)
    if (user.userType === 'hospital' || user.hospitalName) {
        alert('This dashboard is for donors only. Redirecting to hospital dashboard...');
        window.location.href = 'hospital-dashboard.html';
        return;
    }
    
    // Update welcome message with donor name
    const subtitle = document.getElementById('page-subtitle');
    if (subtitle && user.name) {
        subtitle.textContent = `Welcome back, ${user.name}!`;
    }
    
    // Load dashboard data
    loadDashboardData();
    updateDonorStatus();
}

// Load User Profile from localStorage
function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    // Get the full name (firstName + lastName or just name)
    let fullName = 'User';
    if (user.firstName && user.lastName) {
        fullName = `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
        fullName = user.firstName;
    } else if (user.name) {
        fullName = user.name;
    }
    
    // Update sidebar profile section
    const sidebarName = document.getElementById('sidebar-donor-name');
    const sidebarBloodType = document.getElementById('sidebar-blood-type');
    const headerName = document.getElementById('header-user-name');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    if (sidebarName) {
        sidebarName.textContent = fullName;
        console.log('✓ Updated sidebar-donor-name to: ' + fullName);
    }
    if (sidebarBloodType) sidebarBloodType.textContent = 'Blood Type: ' + (user.bloodType || '--');
    if (headerName) {
        headerName.textContent = fullName;
        console.log('✓ Updated header-user-name to: ' + fullName);
    }
    if (pageSubtitle) pageSubtitle.textContent = `Welcome back, ${fullName}!`;
}

// Update User Name Display (called immediately after login)
function updateUserNameDisplay() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    // Get the full name (firstName + lastName or just name)
    let fullName = 'User';
    if (user.firstName && user.lastName) {
        fullName = `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
        fullName = user.firstName;
    } else if (user.name) {
        fullName = user.name;
    }
    
    // Update all user name displays
    const headerName = document.getElementById('header-user-name');
    const sidebarName = document.getElementById('sidebar-donor-name');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    if (headerName) {
        headerName.textContent = fullName;
        console.log('✓ Updated header-user-name to: ' + fullName);
    }
    if (sidebarName) {
        sidebarName.textContent = fullName;
        console.log('✓ Updated sidebar-donor-name to: ' + fullName);
    }
    if (pageSubtitle) {
        pageSubtitle.textContent = `Welcome back, ${fullName}!`;
        console.log('✓ Updated page-subtitle to: Welcome back, ' + fullName);
    }
}

// Load Dashboard Data
function loadDashboardData() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    console.log('Loading dashboard data for user:', user);
    if (!user) return;
    
    // If user has API ID, fetch from API
    if (user && user.id) {
        console.log('Fetching donations from API for donor ID:', user.id);
        fetch(`${API_BASE_URL}/donation/donor/${user.id}`)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch donations (${response.status})`);
                console.log('API response status:', response.status);
                return response.json();
            })
            .then(donations => {
                console.log('✓ Donations loaded from API:', donations);
                updateOverviewFromDonations(donations);
                initializeDonationChart(donations);
                
                // Also save to localStorage for offline access
                const donationsFormatted = donations.map(d => ({
                    id: d.id,
                    date: d.date,
                    bloodType: d.bloodType,
                    bloodAmountMl: d.amount || d.bloodAmountMl || 450,
                    status: d.status,
                    hospitalName: d.hospitalName
                }));
                localStorage.setItem(user.email + '_donations', JSON.stringify(donationsFormatted));
            })
            .catch(error => {
                console.error('Error fetching donations from API:', error);
                console.error('Error details:', error.message);
                // Fallback to localStorage
                loadDashboardDataFromLocalStorage(user);
            });
    } else {
        // Fallback to localStorage
        loadDashboardDataFromLocalStorage(user);
    }
    
    // Update health values
    updateHealthValues(user);
}

// Load Dashboard Data from localStorage (fallback)
function loadDashboardDataFromLocalStorage(user) {
    if (!user) return;
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    updateOverviewFromDonations(donations);
    initializeDonationChart(donations);
}

function updateOverviewFromDonations(donations) {
    const list = Array.isArray(donations) ? donations : [];
    const totalDonations = list.length;
    const totalBloodDonatedMl = list.reduce((sum, donation) => {
        return sum + (donation.amount || donation.bloodAmountMl || 450);
    }, 0);
    const totalBloodDonated = totalBloodDonatedMl / 1000;
    const livesSaved = Math.floor(totalBloodDonated / 0.5);

    const totalDonationsEl = document.getElementById('total-donations');
    const livesSavedEl = document.getElementById('lives-saved-count');
    const donorLevelEl = document.getElementById('donor-level');
    const daysUntilEl = document.getElementById('days-until-donation');

    if (totalDonationsEl) totalDonationsEl.textContent = totalDonations;
    if (livesSavedEl) livesSavedEl.textContent = livesSaved;
    if (donorLevelEl) donorLevelEl.textContent = getDonorLevel(totalDonations);

    if (daysUntilEl) {
        if (totalDonations === 0) {
            daysUntilEl.textContent = '90';
        } else {
            const latestDonationDate = list
                .map(d => new Date(d.date))
                .filter(d => !isNaN(d.getTime()))
                .sort((a, b) => b - a)[0];

            if (!latestDonationDate) {
                daysUntilEl.textContent = '90';
            } else {
                const nextEligible = new Date(latestDonationDate);
                nextEligible.setDate(nextEligible.getDate() + 90);
                const diff = Math.ceil((nextEligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                daysUntilEl.textContent = diff > 0 ? String(diff) : '0';
            }
        }
    }
}

// Get Donor Level
function getDonorLevel(donations) {
    if (donations >= 20) return 'Life Saver';
    if (donations >= 10) return 'Champion';
    if (donations >= 5) return 'Regular';
    return 'New';
}

// Update Health Values
function updateHealthValues(user) {
    document.getElementById('bp-value').textContent = user.bloodPressure || '--';
    document.getElementById('hb-value').textContent = user.hemoglobin || '--';
    document.getElementById('weight-value').textContent = user.weight ? user.weight + ' kg' : '--';
    document.getElementById('platelet-value').textContent = user.platelet || '--';
}


// Update Donor Status
function updateDonorStatus() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
    
    const statusElement = document.getElementById('donor-level');
    if (donations.length >= 20) {
        statusElement.textContent = '💎 Life Saver';
    } else if (donations.length >= 10) {
        statusElement.textContent = '🏆 Champion';
    } else if (donations.length >= 5) {
        statusElement.textContent = '⭐ Regular';
    } else {
        statusElement.textContent = '🩸 New';
    }
}

// Initialize Charts
function initializeCharts() {
    initializeDonationChart();
    // Blood type chart removed
}

// Donation Chart
function initializeDonationChart(donationsInput) {
    const ctx = document.getElementById('donationChart');
    if (!ctx) return;

    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    const donations = Array.isArray(donationsInput)
        ? donationsInput
        : (JSON.parse(localStorage.getItem(user.email + '_donations')) || []);
    const currentYear = new Date().getFullYear();
    
    // Group donations by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = new Array(12).fill(0);
    
    donations.forEach(donation => {
        const date = new Date(donation.date);
        if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
            monthCounts[date.getMonth()]++;
        }
    });

    if (donationChartInstance) {
        donationChartInstance.destroy();
    }

    donationChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Donations',
                data: monthCounts,
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#f5576c',
                    '#667eea', '#764ba2', '#f093fb', '#f5576c',
                    '#667eea', '#764ba2', '#f093fb', '#f5576c'
                ],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Blood Type Distribution Chart - REMOVED
// Functionality kept for future use if needed
/*
function initializeBloodTypeChart() {
    const ctx = document.getElementById('bloodTypeChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'],
            datasets: [{
                data: [35, 25, 20, 10, 5, 3, 1, 1],
                backgroundColor: [
                    '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
                    '#e67e22', '#9b59b6', '#1abc9c', '#34495e'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}
*/

// Load Donation History
function loadDonationHistory() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    const activityList = document.getElementById('activity-list');
    
    // If user has API ID, fetch from API
    if (user && user.id) {
        fetch(`${API_BASE_URL}/donation/donor/${user.id}`)
            .then(response => response.json())
            .then(donations => {
                console.log('✓ Donation history loaded from API:', donations.length);
                displayDonationHistory(donations, activityList);
                
                // Also save to localStorage
                const donationsFormatted = donations.map(d => ({
                    id: d.id,
                    date: d.date,
                    bloodType: d.bloodType,
                    bloodAmountMl: d.amount,
                    status: d.status,
                    hospitalName: d.hospitalName
                }));
                localStorage.setItem(user.email + '_donations', JSON.stringify(donationsFormatted));
            })
            .catch(error => {
                console.error('Error fetching donation history from API:', error);
                // Fallback to localStorage
                const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
                displayDonationHistory(donations, activityList);
            });
    } else {
        // Fallback to localStorage
        const donations = JSON.parse(localStorage.getItem(user.email + '_donations')) || [];
        displayDonationHistory(donations, activityList);
    }
}

function displayDonationHistory(donations, activityList) {
    if (donations.length === 0) {
        activityList.innerHTML = '<p class="no-activity">No donation history yet. Start your donor journey today!</p>';
        return;
    }
    
    activityList.innerHTML = '';
    const sortedDonations = [...donations].reverse();
    sortedDonations.forEach((donation, index) => {
        const date = new Date(donation.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        const bloodAmountMl = donation.bloodAmountMl || donation.amount || 450;
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-date">${date}</div>
            <div class="activity-description">✓ Successfully donated blood (${bloodAmountMl}ml)</div>
        `;
        activityList.appendChild(item);
    });
}

// Load Certificates
function loadCertificates() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const certificatesKey = user.email + '_certificates';
    const certificates = JSON.parse(localStorage.getItem(certificatesKey)) || [];
    const certificatesList = document.getElementById('certificates-list');
    
    console.log('📜 Loading certificates for:', user.email);
    console.log('🔑 Certificate key:', certificatesKey);
    console.log('📊 Total certificates found:', certificates.length);
    
    if (certificates.length === 0) {
        certificatesList.innerHTML = '<p class="no-certificates">No certificates yet. Donate blood and get it approved by hospital to earn your first certificate!</p>';
        return;
    }
    
    certificatesList.innerHTML = '';
    certificates.forEach((cert, index) => {
        const donationNumber = index + 1;
        const date = new Date(cert.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        console.log(`📋 Certificate ${index + 1}: #${cert.certificateNumber} - ${cert.bloodType}`);
        
        const certItem = document.createElement('div');
        certItem.className = 'certificate-item';
        certItem.innerHTML = `
            <div class="certificate-info">
                <div class="certificate-title">
                    🩸 Blood Donation Certificate #${cert.certificateNumber}
                    ${cert.hasTemplate ? '<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; margin-left: 8px;">✨ Custom Template</span>' : ''}
                </div>
                <div class="certificate-date">📅 Donation Date: ${date}</div>
                <div class="certificate-details">
                    Blood Type: ${cert.bloodType} | Amount: ${cert.bloodAmountMl || 450}ml | Hospital: ${cert.hospitalName}
                </div>
                <div class="certificate-details" style="margin-top: 5px; font-size: 0.85em;">
                    ✅ Approved by ${cert.hospitalName}
                </div>
            </div>
            <div class="certificate-actions">
                <button class="btn-view" onclick="viewCertificate(${index})">👁️ View</button>
                <button class="btn-download" onclick="downloadCertificate(${index})">⬇️ Download</button>
            </div>
        `;
        certificatesList.appendChild(certItem);
    });
}

// View Certificate
function viewCertificate(index) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const certificatesKey = user.email + '_certificates';
    const certificates = JSON.parse(localStorage.getItem(certificatesKey)) || [];
    const cert = certificates[index];
    
    if (!cert) return;
    
    const date = new Date(cert.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // If certificate has template, show ONLY the template image
    if (cert.hasTemplate && cert.template) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="position: relative; max-width: 900px; max-height: 90vh; overflow: auto;">
                <button onclick="this.closest('div').parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.7); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 24px; font-weight: bold; z-index: 10001;">&times;</button>
                <img src="${cert.template}" alt="Certificate" style="max-width: 100%; height: auto; display: block;">
            </div>
        `;
        
        modal.onclick = function(e) {
            if (e.target === modal) modal.remove();
        };
        
        document.body.appendChild(modal);
    } else {
        // Show text-based certificate
        alert(`🩸 BLOOD DONATION CERTIFICATE\\n\\nCertificate #${cert.certificateNumber}\\n\\nThis certifies that\\n${cert.donorName}\\n\\nhas generously donated blood on\\n${date}\\n\\nBlood Type: ${cert.bloodType}\\nAmount Donated: ${cert.bloodAmountMl || 450}ml\\n\\nApproved by: ${cert.hospitalName}\\n\\nThank you for saving lives!`);
    }
}

// Download Certificate
function downloadCertificate(index) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const certificatesKey = user.email + '_certificates';
    const certificates = JSON.parse(localStorage.getItem(certificatesKey)) || [];
    const cert = certificates[index];
    
    if (!cert) return;
    
    const date = new Date(cert.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const issuedDate = new Date(cert.issuedDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // If certificate has template, download as image ONLY (the template itself)
    if (cert.hasTemplate && cert.template) {
        const a = document.createElement('a');
        a.href = cert.template;
        a.download = `Certificate_#${cert.certificateNumber}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        alert('✅ Certificate downloaded successfully!');
        return;
    }
    
    // Create certificate content (text fallback)
    const certificateContent = `
═══════════════════════════════════════════════════════
           🩸 BLOOD DONATION CERTIFICATE 🩸
═══════════════════════════════════════════════════════

Certificate Number: #${String(cert.certificateNumber).padStart(10, '0')}

This is to certify that

                ${cert.donorName}

has graciously donated blood on

                ${date}

Donation Details:
• Blood Type: ${cert.bloodType}
• Blood Amount: ${cert.bloodAmountMl || 450}ml
• Donation Center: ${cert.hospitalName}

Hospital Approval:
• Approved By: ${cert.hospitalName}
• Approval Date: ${issuedDate}
• Status: ${cert.status}

Your selfless act of kindness has the potential to save lives.
Thank you for being a hero!

═══════════════════════════════════════════════════════
              Blood Donation Management System
              
              Digitally Signed and Approved
═══════════════════════════════════════════════════════
    `;
    
    // Create and download as text file
    const blob = new Blob([certificateContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate_${cert.donorName}_${date.replace(/\\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('✅ Certificate downloaded successfully!');
}// Load Donor Appointments
function loadDonorAppointments() {
    console.log('Loading donor appointments from backend...');
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !user.id) {
        console.log('No user found');
        return;
    }
    
    // Fetch appointments from backend API
    fetch(`${API_BASE_URL}/appointment/donor/${user.id}`)
        .then(response => response.json())
        .then(donorAppointments => {
            console.log('Appointments loaded from backend:', donorAppointments.length);
            displayAppointments(donorAppointments);
        })
        .catch(error => {
            console.error('Failed to load appointments from backend:', error);
            console.log('Falling back to localStorage...');
            // Fallback to localStorage if API fails
            const appointments = JSON.parse(localStorage.getItem('donor_appointments')) || [];
            const donorAppointments = appointments.filter(apt => apt.donorEmail === user.email);
            displayAppointments(donorAppointments);
        });
}

function displayAppointments(donorAppointments) {
    const appointmentsList = document.getElementById('appointments-list');
    
    if (!appointmentsList) {
        console.error('Appointments list element not found');
        return;
    }
    
    appointmentsList.innerHTML = '';
    
    if (donorAppointments.length === 0) {
        appointmentsList.innerHTML = '<p>No appointments scheduled yet. <button class="schedule-btn" onclick="scheduleAppointment()">Schedule Now</button></p>';
        return;
    }
    
    donorAppointments.forEach((apt) => {
        const aptDiv = document.createElement('div');
        aptDiv.className = 'appointment-item';
        aptDiv.setAttribute('data-apt-id', apt.id);
        
        const statusColor = apt.status === 'Completed' ? '#4caf50' : (apt.status === 'Cancelled' ? '#f44336' : '#2196f3');
        
        aptDiv.innerHTML = `
            <div class="appointment-item-header">
                <div class="appointment-item-details">
                    <h4>${apt.hospitalName || 'Unknown Hospital'}</h4>
                    <p><strong>📅 Date:</strong> ${apt.date}</p>
                    <p><strong>⏰ Time:</strong> ${apt.time}</p>
                    <p><strong>📍 Address:</strong> ${apt.hospitalAddress || 'N/A'}</p>
                    ${apt.hospitalPhone ? `<p><strong>📞 Phone:</strong> ${apt.hospitalPhone}</p>` : ''}
                    ${apt.notes ? `<p><strong>📝 Notes:</strong> ${apt.notes}</p>` : ''}
                    ${apt.confirmationCode ? `<p><strong>Confirmation Code:</strong> ${apt.confirmationCode}</p>` : ''}
                    <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${apt.status}</span></p>
                </div>
                ${apt.status !== 'Cancelled' && apt.status !== 'Completed' ? `
                <button class="appointment-cancel-btn" onclick="cancelDonorAppointment(${apt.id})">Cancel</button>
                ` : ''}
            </div>
        `;
        
        appointmentsList.appendChild(aptDiv);
    });
    
    console.log('Appointments displayed successfully');
    updateSidebarVisibility();
}

// Schedule Appointment
function scheduleAppointment() {
    console.log('Opening appointment modal...');
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Please login first');
        return;
    }
    
    console.log('User found:', user.firstName, user.lastName);
    
    // Auto-fill donor information
    const nameField = document.getElementById('apt-donor-name');
    const bloodField = document.getElementById('apt-donor-blood');
    const emailField = document.getElementById('apt-donor-email');
    
    // Build full name from firstName and lastName
    const fullName = (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : (user.name || 'Unknown');
    if (nameField) nameField.value = fullName;
    if (bloodField) bloodField.value = user.bloodType || '--';
    if (emailField) emailField.value = user.email || '';
    
    // Reset hospital selection
    const hospitalSelect = document.getElementById('apt-hospital');
    if (hospitalSelect) hospitalSelect.value = '';
    
    // Clear hospital details
    const hospitalName = document.getElementById('apt-hospital-name');
    const hospitalAddr = document.getElementById('apt-hospital-addr');
    const hospitalPhone = document.getElementById('apt-hospital-phone');
    
    if (hospitalName) hospitalName.value = '';
    if (hospitalAddr) hospitalAddr.value = '';
    if (hospitalPhone) hospitalPhone.value = '';
    
    // Clear appointment details and set minimum date to today
    const dateField = document.getElementById('apt-date');
    const timeField = document.getElementById('apt-time');
    const notesField = document.getElementById('apt-notes');
    
    if (dateField) {
        dateField.value = '';
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        dateField.min = today;
    }
    if (timeField) timeField.value = '';
    if (notesField) notesField.value = '';
    
    // Load hospitals before showing the form
    loadHospitalOptions();

    // Show inline form section and scroll to it
    const formSection = document.getElementById('appointment-form-section');
    if (formSection) {
        console.log('Appointment form section found, showing and scrolling');
        formSection.classList.remove('hidden');
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        console.error('Appointment form section not found!');
        alert('Error: Appointment form not found. Please refresh the page.');
    }
}

// Update Hospital Information when selection changes
function updateHospitalInfo() {
    const hospitalSelect = document.getElementById('apt-hospital');
    const selectedValue = hospitalSelect ? hospitalSelect.value : '';
    const hospital = (window.hospitalsCache || []).find(item => String(item.id) === String(selectedValue));

    if (hospital) {
        const addressParts = [hospital.address, hospital.city, hospital.state, hospital.zipcode].filter(Boolean);
        document.getElementById('apt-hospital-name').value = hospital.hospitalName || '';
        document.getElementById('apt-hospital-addr').value = addressParts.join('\n');
        document.getElementById('apt-hospital-phone').value = hospital.phone || '';
    } else {
        document.getElementById('apt-hospital-name').value = '';
        document.getElementById('apt-hospital-addr').value = '';
        document.getElementById('apt-hospital-phone').value = '';
    }
}

function loadHospitalOptions() {
    const hospitalSelect = document.getElementById('apt-hospital');
    if (!hospitalSelect) return;

    fetch(`${API_BASE_URL}/hospitals`)
        .then(response => response.json())
        .then(data => {
            const hospitals = Array.isArray(data) ? data : [];
            window.hospitalsCache = hospitals;

            hospitalSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '-- Select a hospital --';
            hospitalSelect.appendChild(placeholder);

            if (hospitals.length === 0) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = 'No hospitals available';
                emptyOption.disabled = true;
                hospitalSelect.appendChild(emptyOption);
                return;
            }

            hospitals.forEach(hospital => {
                const option = document.createElement('option');
                option.value = hospital.id;
                const locationParts = [hospital.city, hospital.state].filter(Boolean).join(', ');
                option.textContent = locationParts
                    ? `${hospital.name} - ${locationParts}`
                    : hospital.name;
                hospitalSelect.appendChild(option);
            });
        })
        .catch(() => {
            hospitalSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Unable to load hospitals';
            placeholder.disabled = true;
            hospitalSelect.appendChild(placeholder);
        });
}

// Close Appointment Modal
function closeAppointmentModal() {
    console.log('Closing appointment form');
    const formSection = document.getElementById('appointment-form-section');
    if (formSection) {
        formSection.classList.add('hidden');
        const appointmentsSection = document.getElementById('appointments');
        if (appointmentsSection) {
            appointmentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Handle Appointment Submit
function handleAppointmentSubmit(event) {
    event.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !user.id) {
        alert('Please login first');
        return;
    }
    
    const date = document.getElementById('apt-date').value;
    const time = document.getElementById('apt-time').value;
    const hospitalId = document.getElementById('apt-hospital').value;
    const notes = document.getElementById('apt-notes').value;
    
    if (!date || !time || !hospitalId) {
        alert('Please fill all required fields');
        return;
    }
    
    // Send to backend API with correct field names
    fetch(`${API_BASE_URL}/appointment/schedule`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            donorId: user.id,
            hospitalId: hospitalId,
            date: date,
            time: time,
            notes: notes,
            createdBy: 'donor'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ Appointment scheduled successfully!\n\nConfirmation Code: ' + data.appointment.confirmationCode + '\nDate: ' + date + '\nTime: ' + time);
            closeAppointmentModal();
            loadDonorAppointments();
            
            // Reset form
            document.getElementById('apt-date').value = '';
            document.getElementById('apt-time').value = '';
            document.getElementById('apt-hospital').value = '';
            document.getElementById('apt-notes').value = '';
        } else {
            alert('❌ Failed to schedule appointment: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Appointment submission error:', error);
        alert('❌ Error scheduling appointment. Please try again.');
    });
}

// Get Hospital Name from Location
function getHospitalNameFromLocation(location) {
    const hospitals = {
        'downtown': 'Downtown Blood Bank',
        'uptown': 'Uptown Medical Center',
        'hospital': 'City Hospital',
        'clinic': 'Community Clinic'
    };
    return hospitals[location] || location;
}

// Cancel Donor Appointment
function cancelDonorAppointment(appointmentId) {
    if (!appointmentId) {
        alert('❌ Invalid appointment ID. Please refresh and try again.');
        return;
    }

    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    // Call backend API to update appointment status
    fetch(`${API_BASE_URL}/appointment/${appointmentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'Cancelled'
        })
    })
    .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || `Request failed (${response.status})`);
        }
        return data;
    })
    .then(data => {
        if (data.success) {
            alert('✅ Appointment cancelled successfully');
            loadDonorAppointments(); // Reload to show updated status
        } else {
            alert('❌ Failed to cancel appointment: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Cancel appointment error:', error);

        // Fallback: allow cancellation in localStorage-backed mode when API is unavailable.
        const appointments = JSON.parse(localStorage.getItem('donor_appointments')) || [];
        const idx = appointments.findIndex(apt => String(apt.id) === String(appointmentId));

        if (idx !== -1) {
            appointments[idx].status = 'Cancelled';
            localStorage.setItem('donor_appointments', JSON.stringify(appointments));
            alert('✅ Appointment cancelled locally. Backend sync is unavailable right now.');
            loadDonorAppointments();
            return;
        }

        alert('❌ Error cancelling appointment. Please try again.');
    });
}




// Handle Logout
function handleLogout(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentHospital');
    localStorage.removeItem('adminToken');
    console.log('✓ Donor logout complete');
    
    // Try to use dynamic loading if available (app is running in index.html)
    if (typeof closeSection === 'function') {
        // Close the current section and show home
        closeSection();
    } else {
        // Fallback: Direct redirect to index.html
        window.location.href = '../html/index.html';
    }

    return false;
}
// Toggle Profile Dropdown
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userInfo = document.querySelector('.user-info');
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown && userInfo && !userInfo.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Show Profile Modal
function showProfileModal(event) {
    event.preventDefault();
    
    // Fetch fresh user data from backend to ensure we have the latest profile
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !user.id) return;
    
    fetch(`${API_BASE_URL}/donor/${user.id}`)
        .then(res => res.json())
        .then(backendUser => {
            // Merge backend data with local user (backend data is authoritative)
            const updatedUser = { ...user, ...backendUser };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            console.log('✓ Refreshed user profile from backend');
            
            displayProfileModal(updatedUser);
        })
        .catch(error => {
            console.warn('Could not fetch fresh profile from backend:', error);
            // Fall back to localStorage data
            displayProfileModal(user);
        });
}

function displayProfileModal(user) {
    // Get the full name (firstName + lastName or just name)
    const fullName = (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : (user.name || 'N/A');
    const gender = user.gender || 'N/A';
    const dob = user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A';
    
    const modal = document.createElement('div');
    modal.id = 'profile-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 550px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #c41e3a;">👤 Your Profile</h2>
                <button onclick="document.getElementById('profile-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div style="border-bottom: 2px solid #e8e8e8; padding-bottom: 15px; margin-bottom: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <p style="margin: 8px 0;"><strong>First Name:</strong> ${user.firstName || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Last Name:</strong> ${user.lastName || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Blood Type:</strong> <span style="background-color: #c41e3a; color: white; padding: 2px 8px; border-radius: 4px;">${user.bloodType || 'N/A'}</span></p>
                    <p style="margin: 8px 0;"><strong>Gender:</strong> ${gender}</p>
                    <p style="margin: 8px 0;"><strong>DOB:</strong> ${dob}</p>
                    <p style="margin: 8px 0;"><strong>Weight:</strong> ${user.weight || 'N/A'} lbs</p>
                    <p style="margin: 8px 0; grid-column: 1/-1;"><strong>Address:</strong> ${user.address || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>City:</strong> ${user.city || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>State:</strong> ${user.state || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Zipcode:</strong> ${user.zipcode || 'N/A'}</p>
                    <p style="margin: 8px 0; grid-column: 1/-1;"><strong>Donor Type:</strong> ${user.donorType || 'N/A'}</p>
                </div>
            </div>
            <div style="text-align: center; display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.location.href='editProfile.html'; document.getElementById('profile-modal').remove();" style="background-color: #007bff; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; border: none; cursor: pointer; font-weight: bold;">✏️ Edit Profile</button>
                <button onclick="document.getElementById('profile-modal').remove()" style="background-color: #6c757d; color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold;">Close</button>
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

// Load Messages
function loadMessages() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const messagesList = document.getElementById('messages-list');
    if (!messagesList) return;
    
    // Show loading state
    messagesList.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Loading messages...</p>';
    
    // Try to fetch from backend API
    if (user && user.id) {
        fetch(`${API_BASE_URL}/messages/${user.id}/donor`)
            .then(response => response.json())
            .then(data => {
                console.log('✓ Messages loaded from API:', data.messages.length);
                const messages = data.messages || [];
                displayMessages(messages);
                // Cache to localStorage
                cacheMessagesToLocalStorage(user, messages);
            })
            .catch(error => {
                console.error('Error fetching messages from API:', error);
                // Fallback to localStorage
                const messages = readUserMessages(user);
                displayMessages(messages);
            });
    } else {
        // No user ID, fallback to localStorage
        const messages = readUserMessages(user);
        displayMessages(messages);
    }
}

function displayMessages(messages) {
    const messagesList = document.getElementById('messages-list');
    if (!messagesList) return;
    
    if (!messages || messages.length === 0) {
        messagesList.innerHTML = '<p class="no-messages" style="text-align: center; color: #999; padding: 40px;">No messages yet. Hospitals will send you notifications here.</p>';
        return;
    }
    
    messagesList.innerHTML = '';
    
    messages.forEach((msg, index) => {
        const safeSubject = msg.subject || msg.title || 'Notification';
        const safeFrom = msg.from || 'Blood Connect System';
        const safeBody = typeof msg.body === 'string'
            ? msg.body
            : (msg.message || msg.text || 'No message details available.');
        const messageCard = document.createElement('div');
        messageCard.className = 'message-card';
        messageCard.setAttribute('data-msg-id', msg.id);
        
        // Determine border color based on message type
        let borderColor = '#2196F3'; // default blue
        if (msg.type === 'certificate') borderColor = '#4caf50'; // green
        else if (msg.type === 'appointment' || msg.type === 'appointment-reminder') borderColor = '#ff9800'; // orange
        else if (msg.type === 'donation') borderColor = '#c41e3a'; // red
        else if (msg.type === 'alert' || msg.type === 'reminder') borderColor = '#e91e63'; // pink
        
        messageCard.style.cssText = `
            background: ${msg.read ? '#f9f9f9' : '#fff3cd'};
            border: 1px solid ${msg.read ? '#e0e0e0' : '#ffc107'};
            border-left: 4px solid ${borderColor};
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        const msgDate = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : (msg.date ? new Date(msg.date).toLocaleString() : 'Just now');
        
        // Format body text with line breaks
        const bodyText = safeBody.replace(/\n/g, '<br>');
        
        messageCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #333;">
                        ${msg.read ? '' : '🔴 '}${safeSubject}
                    </h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">
                        From: <strong>${safeFrom}</strong> | ${msgDate}
                    </p>
                </div>
                ${msg.read ? '' : '<span style="background: #c41e3a; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">NEW</span>'}
            </div>
            <div style="color: #555; line-height: 1.6; margin: 15px 0;">
                ${bodyText}
            </div>
            <button onclick="markMessageAsRead('${msg.id}')" style="margin-top: 15px; padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 13px;">
                ${msg.read ? '✓ Read' : '✓ Mark as Read'}
            </button>
        `;
        
        messageCard.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        });
        
        messageCard.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'none';
        });
        
        messagesList.appendChild(messageCard);
    });
}

function cacheMessagesToLocalStorage(user, messages) {
    try {
        const keys = getUserMessageKeys(user);
        keys.forEach(key => {
            localStorage.setItem(key, JSON.stringify(messages));
        });
    } catch (e) {
        console.warn('Could not cache messages to localStorage:', e);
    }
}

// Mark Message as Read
function markMessageAsRead(messageId) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    // Try API first
    if (messageId) {
        fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('✓ Message marked as read via API');
            loadMessages();
            updateMessagesBadge();
        })
        .catch(error => {
            console.error('Error marking message as read via API:', error);
            // Fallback: reload messages
            loadMessages();
            updateMessagesBadge();
        });
    }
}

// Mark Message as Read (legacy - for backward compatibility)
function markAsRead(index) {
    updateMessagesBadge();
}

// Update Messages Badge
function updateMessagesBadge() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const badge = document.getElementById('unread-badge');
    
    // Try API first
    if (user && user.id) {
        fetch(`${API_BASE_URL}/messages/count/${user.id}/donor`)
            .then(response => response.json())
            .then(data => {
                const unreadCount = data.unreadCount || 0;
                if (badge) {
                    if (unreadCount > 0) {
                        badge.textContent = unreadCount;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            })
            .catch(error => {
                console.warn('Could not fetch unread count from API:', error);
                // Fallback to localStorage
                const messages = readUserMessages(user);
                const unreadCount = messages.filter(m => !m.read).length;
                if (badge) {
                    if (unreadCount > 0) {
                        badge.textContent = unreadCount;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            });
    } else {
        // No user ID, fallback to localStorage
        const messages = readUserMessages(user);
        const unreadCount = messages.filter(m => !m.read).length;
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
}

// ==================== HEALTH RECORDS MANAGEMENT ====================

// Save Vitals to Health Records
function saveVitals() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Please login to save vitals');
        return;
    }
    
    const bp = document.getElementById('bp-input').value.trim();
    const hemoglobin = document.getElementById('hemoglobin-input').value.trim();
    const weight = document.getElementById('weight-input').value.trim();
    const sugar = document.getElementById('sugar-input').value.trim();
    const notes = document.getElementById('health-notes').value.trim();
    
    // Validation
    if (!bp && !hemoglobin && !weight && !sugar) {
        alert('Please enter at least one vital sign');
        return;
    }
    
    const vitalRecord = {
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        bloodPressure: bp || '--',
        hemoglobin: hemoglobin || '--',
        weight: weight || '--',
        bloodSugar: sugar || '--',
        notes: notes || 'No notes'
    };
    
    // Get existing health records from localStorage
    const key = user.email + '_health_records';
    let healthRecords = JSON.parse(localStorage.getItem(key)) || [];
    
    // Add new record
    healthRecords.push(vitalRecord);
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(healthRecords));
    
    // Update user object with latest vitals
    user.bloodPressure = bp || user.bloodPressure;
    user.hemoglobin = hemoglobin || user.hemoglobin;
    user.weight = weight || user.weight;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Clear form
    document.getElementById('vitals-form').reset();
    
    // Reload health records display
    loadHealthRecords();
    
    alert('✅ Vitals saved successfully!');
    console.log('💾 New vital record saved:', vitalRecord);
}

// Load Health Records - Main Function
function loadHealthRecords() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    console.log('Loading health records for:', user.email);
    
    // Display current health status
    displayCurrentHealthStatus(user);
    
    // Display medical information
    displayMedicalInformation(user);
    
    // Display health records history
    displayHealthRecordsHistory(user);
}

// Display Current Health Status
function displayCurrentHealthStatus(user) {
    document.getElementById('bp-value').textContent = user.bloodPressure || '--';
    document.getElementById('hb-value').textContent = user.hemoglobin ? user.hemoglobin + ' g/dL' : '--';
    document.getElementById('weight-value').textContent = user.weight ? user.weight + ' kg' : '--';
    document.getElementById('sugar-value').textContent = user.bloodSugar || '--';
}

// Display Medical Information
function displayMedicalInformation(user) {
    // Display conditions
    const conditionsDisplay = document.getElementById('medical-conditions-display');
    if (user.medicalConditions && user.medicalConditions.toLowerCase() !== 'none') {
        const conditions = user.medicalConditions.split(',').map(c => c.trim());
        conditionsDisplay.innerHTML = conditions.map(c => `<span style="display: inline-block; background: #f44336; color: white; padding: 5px 10px; border-radius: 5px; margin: 5px 5px 5px 0;">${c}</span>`).join('');
    } else {
        conditionsDisplay.textContent = 'No medical conditions recorded';
    }
    
    // Display medications
    const medicationsDisplay = document.getElementById('medications-display');
    if (user.medications && user.medications.toLowerCase() !== 'none') {
        const meds = user.medications.split(',').map(m => m.trim());
        medicationsDisplay.innerHTML = meds.map(m => `<span style="display: inline-block; background: #2196f3; color: white; padding: 5px 10px; border-radius: 5px; margin: 5px 5px 5px 0;">💊 ${m}</span>`).join('');
    } else {
        medicationsDisplay.textContent = 'No medications recorded';
    }
}

// Display Health Records History
function displayHealthRecordsHistory(user) {
    const key = user.email + '_health_records';
    const healthRecords = JSON.parse(localStorage.getItem(key)) || [];
    const recordsList = document.getElementById('health-records-list');
    
    if (healthRecords.length === 0) {
        recordsList.innerHTML = '<p style="text-align: center; color: #999; padding: 30px;">No health records yet. Add your first vitals above!</p>';
        return;
    }
    
    recordsList.innerHTML = '';
    
    // Display records in reverse order (newest first)
    [...healthRecords].reverse().forEach((record, index) => {
        const recordDate = new Date(record.date);
        const formattedDate = recordDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
        
        const recordDiv = document.createElement('div');
        recordDiv.className = 'health-record-item';
        recordDiv.style.cssText = `
            background: linear-gradient(135deg, #f8f9ff 0%, #f0f3ff 100%);
            border-left: 4px solid #667eea;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            transition: all 0.3s ease;
        `;
        
        recordDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">📅 ${formattedDate} at ${record.time}</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                        ${record.bloodPressure !== '--' ? `<div><strong>BP:</strong> ${record.bloodPressure}</div>` : ''}
                        ${record.hemoglobin !== '--' ? `<div><strong>Hemoglobin:</strong> ${record.hemoglobin} g/dL</div>` : ''}
                        ${record.weight !== '--' ? `<div><strong>Weight:</strong> ${record.weight} kg</div>` : ''}
                        ${record.bloodSugar !== '--' ? `<div><strong>Blood Sugar:</strong> ${record.bloodSugar} mg/dL</div>` : ''}
                    </div>
                    ${record.notes && record.notes !== 'No notes' ? `<div style="margin-top: 10px; padding: 10px; background: #fff; border-radius: 5px;"><strong>📝 Notes:</strong> ${record.notes}</div>` : ''}
                </div>
                <button onclick="deleteHealthRecord(${healthRecords.length - 1 - index})" style="background: #f44336; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 0.85em; white-space: nowrap; margin-left: 10px;">🗑️ Delete</button>
            </div>
        `;
        
        recordDiv.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        
        recordDiv.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
        
        recordsList.appendChild(recordDiv);
    });
}

// Delete Health Record
function deleteHealthRecord(index) {
    if (confirm('Are you sure you want to delete this record?')) {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const key = user.email + '_health_records';
        let healthRecords = JSON.parse(localStorage.getItem(key)) || [];
        
        healthRecords.splice(index, 1);
        localStorage.setItem(key, JSON.stringify(healthRecords));
        
        loadHealthRecords();
        console.log('🗑️ Record deleted');
    }
}

// Export Health Records
function exportHealthRecords() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const key = user.email + '_health_records';
    const healthRecords = JSON.parse(localStorage.getItem(key)) || [];
    
    if (healthRecords.length === 0) {
        alert('No records to export');
        return;
    }
    
    // Create CSV content
    let csvContent = 'Date,Time,Blood Pressure,Hemoglobin (g/dL),Weight (kg),Blood Sugar (mg/dL),Notes\n';
    
    healthRecords.forEach(record => {
        const date = new Date(record.date).toLocaleDateString('en-US');
        csvContent += `"${date}","${record.time}","${record.bloodPressure}","${record.hemoglobin}","${record.weight}","${record.bloodSugar}","${record.notes}"\n`;
    });
    
    // Create downloadable file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health_records_${user.firstName || user.name}_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('✅ Health records exported successfully!');
}
