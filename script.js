// Smooth scroll to sections
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Process <!-- Include: filename.html --> comments and replace with actual content
async function processIncludes(container) {
    const includePattern = /<!-- Include: ([\w\-\.\/]+\.html) -->/g;
    let html = container.innerHTML;
    let match;
    
    while ((match = includePattern.exec(html)) !== null) {
        const filename = match[1];
        try {
            const response = await fetch(filename);
            if (response.ok) {
                const content = await response.text();
                html = html.replace(match[0], content);
            }
        } catch (error) {
            console.error(`Error loading include file: ${filename}`, error);
        }
    }
    
    container.innerHTML = html;
}

// Mark common script as loaded for page-specific scripts
window.commonLoaded = true;

// Restore session on reload if a valid login is present
function restoreSession() {
    const currentUserRaw = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    if (!currentUserRaw || !authToken) return;

    let currentUser;
    try {
        currentUser = JSON.parse(currentUserRaw);
    } catch (e) {
        return;
    }

    // Only auto-redirect when we have a user with a known type
    const isHospital = currentUser && (currentUser.type === 'hospital' || currentUser.hospitalName);
    const isDonor = currentUser && !isHospital;

    if (typeof loadSection === 'function') {
        if (isHospital) loadSection('hospital-dashboard');
        else if (isDonor) loadSection('dashboard');
    }
}

// Load external HTML section dynamically with smooth fade transition
function loadSection(sectionId) {
    const container = document.getElementById('content-container');
    const filePath = `../html/${sectionId}.html`;
    
    // If container doesn't exist, navigate directly to the HTML page
    if (!container) {
        window.location.href = `../${filePath}`;
        return;
    }
    
    // Hide home page elements
    hideHomePageElements();
    
    // Fade out current content
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease-out';
    
    // Remove any previously injected page-specific stylesheet
    const existingLink = document.getElementById('page-specific-css');
    if (existingLink) existingLink.remove();

    // Inject this page's stylesheet (falls back to styles.css via @import)
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `../css/${sectionId}.css`;
    link.id = 'page-specific-css';
    document.head.appendChild(link);

    // Remove any previously injected page-specific script
    const existingScript = document.getElementById('page-specific-js');
    if (existingScript) existingScript.remove();
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}`);
            }
            return response.text();
        })
        .then(html => {
            // Set content before processing includes
            container.innerHTML = html;
            
            // Process includes
            return processIncludes(container);
        })
        .then(() => {
            // Remove any previously injected page-specific script
            const existingScriptAfter = document.getElementById('page-specific-js');
            if (existingScriptAfter) existingScriptAfter.remove();

            // Inject this page's script (page-specific behavior) AFTER content is added
            const pageScript = document.createElement('script');
            pageScript.src = `../js/${sectionId}.js`;
            pageScript.id = 'page-specific-js';
            
            // Add onload handler to manually initialize dashboard/hospital-dashboard
            pageScript.onload = function() {
                console.log(`${sectionId}.js loaded`);
                
                // Manually trigger initialization for dynamically loaded pages
                if (sectionId === 'dashboard' && window.initializeDashboardManually) {
                    console.log('Calling manual dashboard initialization...');
                    window.initializeDashboardManually();
                } else if (sectionId === 'hospital-dashboard' && window.initializeHospitalDashboardManually) {
                    console.log('Calling manual hospital dashboard initialization...');
                    window.initializeHospitalDashboardManually();
                }
            };
            
            document.body.appendChild(pageScript);
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.6s ease-in';
            
            // Trigger reflow to restart animation
            void container.offsetWidth;
            container.style.opacity = '1';
            
            container.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error loading section:', error);
            container.innerHTML = `<p style="padding: 20px; text-align: center;">Error loading content. Please try again.</p>`;
            container.style.opacity = '1';
            // Show home page again on error
            showHomePageElements();
        });
}

// Hide home page elements when loading any section
function hideHomePageElements() {
    const navbar = document.getElementById('navbar-container');
    const hero = document.getElementById('hero-container');
    const footer = document.getElementById('footer-container');
    
    if (navbar) navbar.style.display = 'none';
    if (hero) hero.style.display = 'none';
    if (footer) footer.style.display = 'none';
}

// Show home page elements when closing a section
function showHomePageElements() {
    const navbar = document.getElementById('navbar-container');
    const hero = document.getElementById('hero-container');
    const footer = document.getElementById('footer-container');
    
    if (navbar) navbar.style.display = 'block';
    if (hero) hero.style.display = 'block';
    if (footer) footer.style.display = 'block';
}

// Close the currently displayed section with fade out effect
function closeSection() {
    const container = document.getElementById('content-container');
    
    // If container doesn't exist, just show home and scroll
    if (!container) {
        showHomePageElements();
        scrollToSection('home');
        return;
    }
    
    // Show home page elements
    showHomePageElements();
    
    // Fade out effect
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.4s ease-out';
    
    setTimeout(() => {
        container.innerHTML = '';
        // Remove any page-specific stylesheet when closing
        const existingLink = document.getElementById('page-specific-css');
        if (existingLink) existingLink.remove();
        // Remove any page-specific script when closing
        const existingScript = document.getElementById('page-specific-js');
        if (existingScript) existingScript.remove();
        
        // Reset container to normal position
        container.style.position = 'relative';
        container.style.top = 'auto';
        container.style.left = 'auto';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
        container.style.width = 'auto';
        container.style.height = 'auto';
        
        scrollToSection('home');
    }, 400);
}

// Back behavior: when fragments are loaded inside index, close the section; otherwise navigate history
function goBack() {
    // If content container exists and is not empty, we're in the SPA view
    const container = document.getElementById('content-container');
    if (container && container.innerHTML.trim() !== '') {
        closeSection();
        return;
    }

    // Otherwise, try to go back in history. If no history, fallback to home (index.html)
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // If running as standalone without history, navigate to index
        window.location.href = 'index.html';
    }
}

// Toggle section visibility (keeping for backward compatibility)
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        if (section.style.display === 'none' || section.style.display === '') {
            // Close all other collapsible sections first
            document.querySelectorAll('.collapsible-section').forEach(s => {
                s.style.display = 'none';
            });
            // Open the clicked section
            section.style.display = 'block';
            section.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Close the section
            section.style.display = 'none';
        }
    }
}

// API Base URL
const API_URL = 'http://localhost:3000/api';

// Storage for registered donors (fallback if server not running)
let registeredDonors = JSON.parse(localStorage.getItem('donors')) || [];

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('#login-email').value;
    const password = form.querySelector('#login-password').value;
    const remember = form.querySelector('#remember').checked;
    
    // Validate email
    if (!email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }
    
    // Try to login via API
    fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text || response.statusText); });
        }
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) return response.json();
        return response.text().then(text => { throw new Error('Invalid JSON from server: ' + text); });
    })
    .then(data => {
        if (data.success) {
            const donor = data.donor;
            
            // Store login info
            localStorage.setItem('currentUser', JSON.stringify(donor));
            if (remember) {
                localStorage.setItem('lastLogin', email);
            } else {
                localStorage.removeItem('lastLogin');
            }
            
            console.log('Donor Login:', {
                email: email,
                name: `${donor.firstName} ${donor.lastName}`,
                timestamp: new Date()
            });
            
            form.reset();
            
            // Load dashboard immediately after successful login
            loadSection('dashboard');
        } else {
            alert(data.error || 'Invalid email or password.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Fallback to localStorage if server is not running
        const donor = registeredDonors.find(d => d.email === email && d.password === password);
        if (donor) {
            localStorage.setItem('currentUser', JSON.stringify(donor));
            if (remember) {
                localStorage.setItem('lastLogin', email);
            } else {
                localStorage.removeItem('lastLogin');
            }
            form.reset();
            
            // Load dashboard immediately after successful login (offline mode)
            loadSection('dashboard');
        } else {
            alert('Invalid email or password. Make sure the server is running.');
        }
    });
}

// Handle registration form submission
function handleRegistration(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validate checkbox
    const termsCheckbox = form.querySelector('#terms');
    if (!termsCheckbox || !termsCheckbox.checked) {
        alert('Please check the confirmation checkbox to proceed with registration.');
        return;
    }
    
    // Get form values
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const bloodType = formData.get('bloodType');
    const dateOfBirth = formData.get('dob');
    const phone = formData.get('phone');
    const weight = parseInt(formData.get('weight'));
    
    // Validate password match
    if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    
    // Calculate age
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    // Validate age
    if (age < 18) {
        alert('You must be at least 18 years old to donate blood.');
        return;
    }
    
    // Validate weight
    if (weight < 42) {
        alert('You must weigh at least 42 to donate blood.');
        return;
    }
    
    // Prepare registration data
    const registrationData = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        phone: phone,
        dateOfBirth: dateOfBirth,
        gender: formData.get('gender'),
        bloodType: bloodType,
        weight: weight,
        donorType: formData.get('donorType'),
        address: formData.get('address'),
        city: formData.get('city'),
        state: formData.get('state'),
        zipcode: formData.get('zipcode'),
        medicalConditions: formData.get('medicalConditions'),
        medications: formData.get('medications')
    };
    
    // Try to register via API
    fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text || response.statusText); });
        }
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) return response.json();
        return response.text().then(text => { throw new Error('Invalid JSON from server: ' + text); });
    })
    .then(data => {
        if (data.success) {
            // Store user info
            localStorage.setItem('currentUser', JSON.stringify(registrationData));

            console.log('Donor Registration:', {
                name: `${firstName} ${lastName}`,
                email: email,
                bloodType: bloodType,
                age: age,
                weight: weight,
                phone: phone
            });

            form.reset();
            
            // Registration successful — prompt user to login (do NOT open dashboard)
            alert('Registration successful. Please login to access your dashboard.');
            loadSection('login');
        } else {
            alert(data.error || 'Registration failed. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Fallback to localStorage if server is not running
        if (!registeredDonors.find(d => d.email === email)) {
            registeredDonors.push(registrationData);
            localStorage.setItem('donors', JSON.stringify(registeredDonors));

            // Store user info
            localStorage.setItem('currentUser', JSON.stringify(registrationData));

            form.reset();
            
            // Registration successful (offline mode) — prompt user to login
            alert('Registration completed (offline). Please login to access your dashboard.');
            loadSection('login');
        } else {
            alert('Email already registered. Make sure the server is running or use a different email.');
        }
    });
}

// Handle form submission
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Get form values
    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const phone = form.querySelector('input[type="tel"]').value;
    const date = form.querySelector('input[type="date"]').value;
    
    // Display success message
    alert(`Thank you, ${name}! Your donation appointment for ${date} has been scheduled. We'll send a confirmation to ${email}.`);
    
    // Clear form
    form.reset();
}

// Add smooth scroll behavior for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});

// Run after DOM is ready so loadSection can render into the container
document.addEventListener('DOMContentLoaded', restoreSession);

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe cards and boxes for animation
document.querySelectorAll('.about-card, .step, .guideline-card, .info-box, .quick-box').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(card);
});

// Add hover effect to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mouseover', function() {
        this.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseout', function() {
        this.style.transform = 'scale(1)';
    });
});

// Form validation
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    const inputs = contactForm.querySelectorAll('input[required], textarea[required]');
    
    inputs.forEach(input => {
        input.addEventListener('invalid', function(e) {
            e.preventDefault();
            alert('Please fill out all required fields correctly.');
        });
    });
}

// Registration form validation
const registrationForm = document.querySelector('.registration-form');
if (registrationForm) {
    const inputs = registrationForm.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.validity.valueMissing) {
                this.style.borderColor = '#ff6b6b';
            } else if (this.validity.valid) {
                this.style.borderColor = '#e0e0e0';
            }
        });
    });
}

// Counter animation for statistics (if added)
function animateCounter(element, target, duration = 2000) {
    let current = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// ==================== BLOOD REQUEST FUNCTIONS ====================

// Open Blood Request Modal
function openBloodRequestModal() {
    const modal = document.getElementById('bloodRequestModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Clear form
        document.getElementById('homeBloodRequestForm').reset();
        
        // Setup form change listeners for live summary
        document.getElementById('home-req-blood-type').addEventListener('change', updateHomeRequestSummary);
        document.getElementById('home-req-units').addEventListener('input', updateHomeRequestSummary);
        document.getElementById('home-req-urgency').addEventListener('change', updateHomeRequestSummary);
        
        // Setup form submit handler
        document.getElementById('homeBloodRequestForm').onsubmit = function(e) {
            e.preventDefault();
            submitHomeBloodRequest();
        };
    }
}

// Close Blood Request Modal
function closeBloodRequestModal() {
    const modal = document.getElementById('bloodRequestModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.getElementById('homeBloodRequestForm').reset();
    }
}

// Update Request Summary on Home Page
function updateHomeRequestSummary() {
    const bloodType = document.getElementById('home-req-blood-type').value;
    const units = document.getElementById('home-req-units').value;
    const urgency = document.getElementById('home-req-urgency').value;
    
    document.getElementById('home-summary-blood-type').textContent = bloodType || '--';
    document.getElementById('home-summary-units').textContent = units ? units + ' unit(s)' : '--';
    document.getElementById('home-summary-urgency').textContent = urgency || '--';
}

// Submit Blood Request from Home Page
function submitHomeBloodRequest() {
    // Get form values
    const requestData = {
        id: Date.now(),
        bloodType: document.getElementById('home-req-blood-type').value,
        units: parseInt(document.getElementById('home-req-units').value),
        urgency: document.getElementById('home-req-urgency').value,
        hospital: document.getElementById('home-req-hospital').value,
        patientName: document.getElementById('home-req-patient-name').value,
        contact: document.getElementById('home-req-contact').value,
        email: document.getElementById('home-req-email').value,
        address: document.getElementById('home-req-address').value,
        location: document.getElementById('home-req-location').value,
        reason: document.getElementById('home-req-reason').value,
        notes: document.getElementById('home-req-notes').value || 'None',
        status: 'Pending',
        date: new Date().toISOString(),
        createdAt: new Date().toLocaleString()
    };
    
    // Store in localStorage
    let allRequests = JSON.parse(localStorage.getItem('bloodRequests')) || [];
    allRequests.unshift(requestData);
    localStorage.setItem('bloodRequests', JSON.stringify(allRequests));
    
    // Close modal
    closeBloodRequestModal();
    
    // Show success message
    alert(`✅ Blood Request Submitted Successfully!\n\nRequest Details:\n• Blood Type: ${requestData.bloodType}\n• Units: ${requestData.units}\n• Urgency: ${requestData.urgency}\n• Hospital: ${requestData.hospital}\n• Location: ${requestData.location}\n• Patient: ${requestData.patientName}\n• Contact: ${requestData.contact}\n• Email: ${requestData.email}\n• Address: ${requestData.address}\n• Request ID: ${requestData.id}\n\nWe will match your request with nearby blood donors immediately.`);
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('bloodRequestModal');
    if (modal && event.target === modal) {
        closeBloodRequestModal();
    }
});

// Close modal on Escape key press
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeBloodRequestModal();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Blood Donation Website Loaded Successfully!');
});
