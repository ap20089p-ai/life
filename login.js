(function(){
    let currentMode = 'donor'; // Track current login mode

    function waitForSelector(selector, callback) {
        const el = document.querySelector(selector);
        if (el) return callback(el);

        const observer = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) {
                observer.disconnect();
                callback(found);
            }
        });

        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }

    // Switch between Donor and Hospital login modes
    window.switchLoginMode = function(mode) {
        currentMode = mode;
        
        // Update tab styling - find the tab that matches the mode
        document.querySelectorAll('.mode-tab').forEach((tab, index) => {
            tab.classList.remove('active');
            // Mode 'donor' is tab 0, 'hospital' is tab 1
            if ((mode === 'donor' && index === 0) || (mode === 'hospital' && index === 1)) {
                tab.classList.add('active');
            }
        });
        
        // Show/hide forms
        const donorForm = document.getElementById('donor-login-form');
        const hospitalForm = document.getElementById('hospital-login-form');
        if (donorForm) donorForm.style.display = mode === 'donor' ? 'block' : 'none';
        if (hospitalForm) hospitalForm.style.display = mode === 'hospital' ? 'block' : 'none';
        
        // Show/hide info sections
        const donorInfo = document.getElementById('donor-login-info');
        const hospitalInfo = document.getElementById('hospital-login-info');
        if (donorInfo) donorInfo.style.display = mode === 'donor' ? 'block' : 'none';
        if (hospitalInfo) hospitalInfo.style.display = mode === 'hospital' ? 'block' : 'none';
        
        // Update title
        const title = document.getElementById('login-title');
        const subtitle = document.getElementById('login-subtitle');
        
        if (title && subtitle) {
            if (mode === 'donor') {
                title.textContent = 'Welcome Back';
                subtitle.textContent = 'Login to your blood donor account';
            } else {
                title.textContent = 'Hospital Portal';
                subtitle.textContent = 'Login to your hospital account';
            }
        }
    };

    // Switch register mode when clicking register link
    window.switchRegisterMode = function(mode) {
        loadSection('register');
        // Small delay to allow section to load, then switch mode
        setTimeout(() => {
            if (window.switchMode) {
                window.switchMode(mode);
            }
        }, 100);
    };

    // Toggle password visibility
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            const button = input.parentElement.querySelector('.password-toggle');
            const eyeOpen = button.querySelector('.eye-open');
            const eyeClosed = button.querySelector('.eye-closed');
            
            if (input.type === 'password') {
                input.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'block';
            } else {
                input.type = 'password';
                eyeOpen.style.display = 'block';
                eyeClosed.style.display = 'none';
            }
        }
    };

    function init() {
        console.log('login.js initialized');
        
        // Restore donor login email if "Remember me" was checked
        waitForSelector('#donor-login-form', form => {
            const lastLogin = localStorage.getItem('lastLogin');
            if (lastLogin) {
                const emailField = form.querySelector('#login-email');
                const rememberCheckbox = form.querySelector('#remember');
                if (emailField) emailField.value = lastLogin;
                if (rememberCheckbox) rememberCheckbox.checked = true;
            }
            // No need to add event listener - form already has onsubmit in HTML
        });
        
        // Restore hospital login email if "Remember me" was checked
        waitForSelector('#hospital-login-form', hospitalForm => {
            const lastHospitalLogin = localStorage.getItem('lastHospitalLogin');
            if (lastHospitalLogin) {
                const emailField = hospitalForm.querySelector('#hospital-login-email');
                const rememberCheckbox = hospitalForm.querySelector('#hospital-remember');
                if (emailField) emailField.value = lastHospitalLogin;
                if (rememberCheckbox) rememberCheckbox.checked = true;
            }
            // No need to add event listener - form already has onsubmit in HTML
        });
    }

    if (window.commonLoaded) init();
    else {
        const s = document.createElement('script');
        s.src = 'script.js';
        s.onload = init;
        document.head.appendChild(s);
    }
})();

// Handle Donor Login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email');
    const password = document.getElementById('login-password');
    const rememberMe = document.getElementById('remember');
    
    if (!email || !password) {
        alert('Error: Form elements not found');
        return;
    }
    
    const emailValue = email.value;
    const passwordValue = password.value;
    const rememberMeChecked = rememberMe ? rememberMe.checked : false;

    // Save email if remember me was checked
    if (rememberMeChecked) {
        localStorage.setItem('lastLogin', emailValue);
    } else {
        localStorage.removeItem('lastLogin');
    }

    // Send to backend
    fetch('http://localhost:3000/api/auth/login/donor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailValue, password: passwordValue })
    })
    .then(response => {
        console.log('Login response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Login response data:', data);
        if (data.success && data.user) {
            // Normalize email and store donor info in localStorage
            const donor = { ...data.user };
            donor.email = (donor.email || '').trim().toLowerCase();
            const userObj = { type: 'donor', ...donor };
            localStorage.setItem('currentUser', JSON.stringify(userObj));
            console.log('✓ Login successful, redirecting...');
            // Redirect to dashboard
            loadSection('dashboard');
        } else {
            alert('Login failed: ' + (data.error || 'Invalid credentials'));
        }
    })
    .catch(error => {
        console.error('Login Error:', error);
        console.error('Error message:', error.message);
        
        // Try fallback login using localStorage data
        const donors = JSON.parse(localStorage.getItem('donors')) || [];
        const normalizedEmail = emailValue.trim().toLowerCase();
        const donor = donors.find(d => (d.email || '').trim().toLowerCase() === normalizedEmail && d.password === passwordValue);
        
        if (donor) {
            console.log('✓ Fallback login successful using stored data');
            const donorData = { ...donor };
            donorData.email = normalizedEmail;
            localStorage.setItem('currentUser', JSON.stringify({ type: 'donor', ...donorData }));
            // Get full name for welcome message
            const fullName = (donor.firstName && donor.lastName) ? `${donor.firstName} ${donor.lastName}` : (donor.name || 'Donor');
            loadSection('dashboard');
        } else {
            alert('Login failed: Backend unreachable.\nPlease check if the server is running on http://localhost:3000');
        }
    });
}

// Handle Hospital Login
function handleHospitalLogin(event) {
    event.preventDefault();
    
    const emailEl = document.getElementById('hospital-login-email');
    const passwordEl = document.getElementById('hospital-login-password');
    const rememberMeEl = document.getElementById('hospital-remember');
    
    if (!emailEl || !passwordEl) {
        alert('Error: Form elements not found');
        return;
    }
    
    const email = emailEl.value;
    const password = passwordEl.value;
    const rememberMe = rememberMeEl ? rememberMeEl.checked : false;

    // Save email if remember me was checked
    if (rememberMe) {
        localStorage.setItem('lastHospitalLogin', email);
    } else {
        localStorage.removeItem('lastHospitalLogin');
    }

    // Send to backend
    fetch('http://localhost:3000/api/auth/login/hospital', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        console.log('Hospital login response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Hospital login response data:', data);
        if (data.success && data.hospital) {
            // Store hospital info in localStorage
            const hospitalObj = { type: 'hospital', ...data.hospital };
            localStorage.setItem('currentHospital', JSON.stringify(hospitalObj));
            localStorage.setItem('currentUser', JSON.stringify(hospitalObj));
            console.log('✓ Hospital login successful, redirecting...');
            // Redirect to hospital dashboard
            loadSection('hospital-dashboard');
        } else {
            alert('Login failed: ' + (data.error || 'Invalid credentials'));
        }
    })
    .catch(error => {
        console.error('Hospital Login Error:', error);
        console.error('Error message:', error.message);
        
        // Try fallback login using localStorage data
        const hospitals = JSON.parse(localStorage.getItem('hospitals')) || [];
        const hospital = hospitals.find(h => h.email === email && h.password === password);
        
        if (hospital) {
            console.log('✓ Fallback hospital login successful using stored data');
            const hospitalObj = { type: 'hospital', ...hospital };
            localStorage.setItem('currentHospital', JSON.stringify(hospitalObj));
            localStorage.setItem('currentUser', JSON.stringify(hospitalObj));
            // Get hospital name for welcome message
            const hospitalName = hospital.hospitalName || 'Hospital';
            loadSection('hospital-dashboard');
        } else {
            alert('Login failed: Backend unreachable.\nPlease check if the server is running on http://localhost:3000');
        }
    });
}

// Open forgot password modal
function openForgotPasswordModal(event) {
    event.preventDefault();
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close forgot password modal
function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.querySelector('.forgot-password-form');
        if (form) form.reset();
    }
}

// Handle forgot password form submission
function handleForgotPassword(event) {
    event.preventDefault();
    
    let email = document.getElementById('forget-email').value;
    
    // Normalize email
    email = email.trim().toLowerCase();
    
    // Check if email exists in registered donors
    const registeredDonors = JSON.parse(localStorage.getItem('donors')) || [];
    const donor = registeredDonors.find(d => (d.email || '').trim().toLowerCase() === email);
    
    if (donor) {
        // In a real application, send password reset email
        alert(`Password reset link has been sent to ${email}\n\nPlease check your email to reset your password.`);
        
        closeForgotPasswordModal();
    } else {
        alert('Email not found. Please check and try again.');
    }
}

