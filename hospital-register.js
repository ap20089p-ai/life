// Handle Hospital Registration
window.handleHospitalRegistration = function(event) {
    event.preventDefault();
    
    // Get form values
    const hospitalName = document.getElementById('hospital-name')?.value?.trim();
    const email = document.getElementById('hospital-email')?.value?.trim();
    const password = document.getElementById('hospital-password')?.value;
    const confirmPassword = document.getElementById('hospital-confirm-password')?.value;
    const phone = document.getElementById('hospital-phone')?.value?.trim();
    const licenseNumber = document.getElementById('hospital-license')?.value?.trim();

    // Validate required fields
    if (!hospitalName) {
        alert('Please enter hospital name');
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
    if (!licenseNumber) {
        alert('Please enter license number');
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
        name: hospitalName,
        email: email,
        password: password,
        phone: phone,
        registrationNumber: licenseNumber
    };

    console.log('Sending hospital registration data:', formData);

    // Save to localStorage for persistence
    try {
        localStorage.setItem('hospitalRegistration', JSON.stringify(formData));
        localStorage.setItem('hospitalEmail', email);
    } catch (e) {
        console.log('localStorage not available');
    }

    // Send to backend
    fetch('http://localhost:3000/api/auth/register/hospital', {
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
        if (!data || data.error) {
            alert('Hospital registration failed: ' + ((data && data.error) || 'Please try again.'));
            return;
        }

        // Clear auto-saved draft
        if (window.formAutoSave) {
            window.formAutoSave.clearDraft('hospital_registration_draft');
        }
        
        alert('Hospital registration successful! Redirecting to login...');
        document.getElementById('hospital-form').reset();
        setTimeout(() => {
            if (window.loadSection) {
                window.loadSection('login');
            }
        }, 1000);
    })
    .catch(error => {
        console.log('Backend error:', error.message);
        alert('Hospital registration failed: ' + error.message + '\n\nPlease check if the server is running on http://localhost:3000');
    });
};


