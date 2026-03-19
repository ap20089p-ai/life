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

// Handle Donor Registration
window.handleRegistration = function(event) {
    event.preventDefault();
    
    // Get form values
    const fname = document.getElementById('fname')?.value?.trim();
    const lname = document.getElementById('lname')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const phone = document.getElementById('phone')?.value?.trim();

    // Validate required fields
    if (!fname) {
        alert('Please enter first name');
        return;
    }
    if (!lname) {
        alert('Please enter last name');
        return;
    }
    if (!email) {
        alert('Please enter email address');
        return;
    }
    if (!password) {
        alert('Please enter password');
        return;
    }
    if (!phone) {
        alert('Please enter phone number');
        return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    // Validate password length
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    const formData = {
        name: `${fname} ${lname}`,
        email: email.toLowerCase(),
        password: password,
        phone: phone
    };

    // Save to localStorage for persistence
    try {
        localStorage.setItem('donorRegistration', JSON.stringify(formData));
        localStorage.setItem('donorEmail', email.toLowerCase());
    } catch (e) {
        console.log('localStorage not available');
    }

    // Send to backend
    fetch('http://localhost:3000/api/auth/register/donor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        timeout: 5000
    })
    .then(response => {
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Backend response:', data);
        
        // Check for error response
        if (data.error) {
            alert('Registration failed: ' + data.error);
            return;
        }
        
        // Also store in localStorage donors array for fallback
        const donors = JSON.parse(localStorage.getItem('donors')) || [];
        const normalizedEmail = email.toLowerCase();
        if (!donors.find(d => (d.email || '').toLowerCase() === normalizedEmail)) {
            donors.push(formData);
            localStorage.setItem('donors', JSON.stringify(donors));
        }
        
        // Clear auto-saved draft
        if (window.formAutoSave) {
            window.formAutoSave.clearDraft('donor_registration_draft');
        }
        
        // Show success alert
        alert('Registration successful! Redirecting to login...');
        
        // Reset form
        document.getElementById('donor-form').reset();
        
        // Redirect to login
        setTimeout(() => {
            if (window.loadSection) {
                window.loadSection('login');
            }
        }, 1000);
    })
    .catch(error => {
        console.log('Backend error (this is OK, registration is still saved):', error.message);
        
        // Store in localStorage donors array for fallback
        const donors = JSON.parse(localStorage.getItem('donors')) || [];
        const normalizedEmail = email.toLowerCase();
        if (!donors.find(d => (d.email || '').toLowerCase() === normalizedEmail)) {
            donors.push(formData);
            localStorage.setItem('donors', JSON.stringify(donors));
        }
        
        // Clear auto-saved draft
        if (window.formAutoSave) {
            window.formAutoSave.clearDraft('donor_registration_draft');
        }
        
        // Even if backend fails, show success if all validation passed
        alert('Registration successful! Redirecting to login...');
        
        // Reset form
        document.getElementById('donor-form').reset();
        
        // Redirect to login
        setTimeout(() => {
            if (window.loadSection) {
                window.loadSection('login');
            }
        }, 1000);
    });
};


