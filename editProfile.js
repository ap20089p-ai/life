(function(){
    console.log('=== EditProfile.js STARTED ===');

    // Form data persistence
    function saveEditProfileFormData(form) {
        const user = JSON.parse(localStorage.getItem('currentUser')) || {};
        const formData = new FormData(form);
        const data = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            bloodType: formData.get('bloodType'),
            weight: formData.get('weight'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipcode: formData.get('zipcode'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            medicalConditions: formData.get('medicalConditions')
        };
        
        if (user.email) {
            localStorage.setItem(user.email + '_edit_form_data', JSON.stringify(data));
            console.log('✓ Edit form data auto-saved');
        }
    }

    function restoreEditProfileFormData(form) {
        const user = JSON.parse(localStorage.getItem('currentUser')) || {};
        if (!user.email) return;
        
        const savedData = JSON.parse(localStorage.getItem(user.email + '_edit_form_data')) || {};
        
        Object.keys(savedData).forEach(key => {
            const fieldId = 'ep-' + key;
            const element = document.getElementById(fieldId);
            if (element && savedData[key]) {
                element.value = savedData[key];
                console.log('✓ Restored edit form: ' + key);
            }
        });
    }

    function initializeForm() {
        console.log('Attempting to initialize form...');
        const form = document.querySelector('form.edit-profile-form');
        
        if (!form) {
            console.error('Form not found!');
            // Retry in 500ms
            setTimeout(initializeForm, 500);
            return;
        }
        
        console.log('✓ Form found!', form);
        
        // Load user data
        const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        console.log('Current user from localStorage:', currentUser);
        
        // Pre-fill form
        prefillForm(currentUser);
        
        // Restore any previously saved form data
        restoreEditProfileFormData(form);
        
        // Update progress
        updateProfileCompletion(currentUser);
        
        // Setup event listeners
        setupProgressTracking(form);
        setupSubmitHandler(form);
        setupStatsMenu();
        fetchDonorStats(currentUser);
        
        // Setup auto-save on form changes
        const inputs = form.querySelectorAll('input, select, textarea');
        let saveTimeout;
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => saveEditProfileFormData(form), 800);
            });
            input.addEventListener('change', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => saveEditProfileFormData(form), 800);
            });
        });
        
        // Save form data before page unload
        window.addEventListener('beforeunload', () => saveEditProfileFormData(form));
        
        console.log('✓ Form initialization complete');
    }

    function prefillForm(user) {
        document.getElementById('ep-firstName').value = user.firstName || '';
        document.getElementById('ep-lastName').value = user.lastName || '';
        document.getElementById('ep-email').value = user.email || '';
        document.getElementById('ep-phone').value = user.phone || '';
        document.getElementById('ep-bloodType').value = user.bloodType || '';
        document.getElementById('ep-weight').value = user.weight || '';
        document.getElementById('ep-address').value = user.address || '';
        document.getElementById('ep-city').value = user.city || '';
        document.getElementById('ep-state').value = user.state || '';
        document.getElementById('ep-zipcode').value = user.zipcode || '';
        document.getElementById('ep-dob').value = user.dateOfBirth || '';
        document.getElementById('ep-gender').value = user.gender || '';
        document.getElementById('ep-medical').value = user.medicalConditions || '';
        
        // Make email read-only to prevent changes
        const emailField = document.getElementById('ep-email');
        if (emailField) {
            emailField.readOnly = true;
            emailField.style.backgroundColor = '#f5f5f5';
        }
        
        console.log('✓ Form pre-filled with user data');
    }

    function setupProgressTracking(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => trackProgress(form));
            input.addEventListener('change', () => trackProgress(form));
        });
    }

    function trackProgress(form) {
        const formData = new FormData(form);
        const user = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            bloodType: formData.get('bloodType'),
            weight: formData.get('weight'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipcode: formData.get('zipcode'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            medicalConditions: formData.get('medicalConditions')
        };
        updateProfileCompletion(user);
    }

    function setupSubmitHandler(form) {
        // Remove any existing listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        const updatedForm = document.querySelector('form.edit-profile-form');
        
        updatedForm.addEventListener('submit', function(e) {
            console.log('=== FORM SUBMIT CLICKED ===');
            e.preventDefault();
            
            const formData = new FormData(this);
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
            
            // Validate required fields
            const firstName = formData.get('firstName')?.trim();
            const lastName = formData.get('lastName')?.trim();
            const email = formData.get('email')?.trim();
            const phone = formData.get('phone')?.trim();
            
            if (!firstName) {
                alert('❌ Please enter your first name');
                return;
            }
            if (!lastName) {
                alert('❌ Please enter your last name');
                return;
            }
            if (!email) {
                alert('❌ Email is required');
                return;
            }
            if (!phone) {
                alert('❌ Please enter your phone number');
                return;
            }
            
            const updated = {
                ...currentUser,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                bloodType: formData.get('bloodType') || currentUser.bloodType,
                weight: formData.get('weight') || currentUser.weight,
                address: formData.get('address') || currentUser.address,
                city: formData.get('city') || currentUser.city,
                state: formData.get('state') || currentUser.state,
                zipcode: formData.get('zipcode') || currentUser.zipcode,
                dateOfBirth: formData.get('dateOfBirth') || currentUser.dateOfBirth,
                gender: formData.get('gender') || currentUser.gender,
                medicalConditions: formData.get('medicalConditions') || currentUser.medicalConditions
            };
            
            console.log('Updated user data:', updated);
            
            // Save to backend API first
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                alert('❌ Session expired. Please login again.');
                window.location.href = 'login.html';
                return;
            }
            
            fetch(`http://localhost:3000/api/donor/${currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(updated)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('✓ Profile saved to database');
                    
                    // Update localStorage with fresh data from database
                    if (data.donor) {
                        const updatedUser = { type: 'donor', ...data.donor };
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                        console.log('✓ Updated currentUser in localStorage');
                    } else {
                        localStorage.setItem('currentUser', JSON.stringify(updated));
                    }
                    
                    // Update donors list
                    const donors = JSON.parse(localStorage.getItem('donors')) || [];
                    const idx = donors.findIndex(d => d.email === currentUser.email || d.email === updated.email);
                    if (idx !== -1) {
                        donors[idx] = updated;
                        localStorage.setItem('donors', JSON.stringify(donors));
                        console.log('✓ Updated donors list');
                    }
                    
                    // Trigger profile sync across all pages
                    if (window.updateAllProfileDisplays) {
                        console.log('📡 Syncing profile to all pages...');
                        window.updateAllProfileDisplays();
                    }
                    
                    // Clear saved form data since profile was successfully updated
                    if (updated.email) {
                        localStorage.removeItem(updated.email + '_edit_form_data');
                        console.log('✓ Cleared saved form data');
                    }
                    
                    alert('✅ Profile updated successfully!');
                    window.location.href = 'dashboard.html';
                } else {
                    alert('❌ Failed to save profile: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error saving profile to backend:', error);
                // Fallback to localStorage only
                try {
                    localStorage.setItem('currentUser', JSON.stringify(updated));
                    const donors = JSON.parse(localStorage.getItem('donors')) || [];
                    const idx = donors.findIndex(d => d.email === currentUser.email);
                    if (idx !== -1) {
                        donors[idx] = updated;
                        localStorage.setItem('donors', JSON.stringify(donors));
                    }
                    alert('⚠️ Saved locally. Server connection failed.');
                    window.location.href = 'dashboard.html';
                } catch (localError) {
                    alert('❌ Error saving profile: ' + localError.message);
                }
            });
        });
        
        console.log('✓ Submit handler attached');
    }

    // Setup stats menu button toggle
    function setupStatsMenu() {
        const btn = document.getElementById('stats-menu-btn');
        const dropdown = document.getElementById('stats-dropdown');
        
        if (!btn || !dropdown) return;

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = dropdown.style.display !== 'none';
            dropdown.style.display = isOpen ? 'none' : 'block';
            btn.classList.toggle('active');
            btn.setAttribute('aria-expanded', !isOpen);
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
                btn.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Fetch donor's donation history from backend and update stats
    function fetchDonorStats(currentUser) {
        if (!currentUser || !currentUser.id) return;

        const donorId = currentUser.id;
        const url = `http://localhost:3000/api/donor/${donorId}/donations`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                const count = Array.isArray(data) ? data.length : 0;
                const el = document.getElementById('stat-donations');
                if (el) el.textContent = count;
            })
            .catch(err => {
                console.warn('Could not load donor donations:', err);
            });
    }

    // If script injected after HTML, run immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeForm);
    } else {
        initializeForm();
    }

    // Also try on load
    window.addEventListener('load', initializeForm);

    // Check if profile is complete
    function isProfileComplete(user) {
        const required = ['firstName', 'lastName', 'email', 'phone', 'bloodType', 'weight', 'address', 'city', 'state', 'zipcode', 'dateOfBirth', 'gender'];
        return required.every(field => user[field] && user[field].toString().trim() !== '');
    }

    // Update profile completion indicator
    function updateProfileCompletion(user) {
        const statusEl = document.getElementById('profileCompletionStatus');
        const messageEl = document.getElementById('completionMessage');
        const progressEl = document.getElementById('completionProgress');
        
        if (!statusEl) return;
        
        const fields = ['firstName', 'lastName', 'email', 'phone', 'bloodType', 'weight', 'address', 'city', 'state', 'zipcode', 'dateOfBirth', 'gender'];
        const completed = fields.filter(f => user[f] && user[f].toString().trim() !== '').length;
        const percentage = Math.round((completed / fields.length) * 100);
        const isComplete = percentage === 100;
        
        if (progressEl) {
            progressEl.style.width = percentage + '%';
            progressEl.style.backgroundColor = isComplete ? '#4CAF50' : '#FF9800';
        }
        
        if (messageEl) {
            if (isComplete) {
                messageEl.textContent = '✓ Profile Complete (100%) - You can donate blood now!';
                messageEl.style.color = '#4CAF50';
                statusEl.style.borderColor = '#4CAF50';
            } else {
                messageEl.textContent = `⏳ Profile Incomplete (${percentage}%) - Complete all fields to donate blood`;
                messageEl.style.color = '#FF9800';
                statusEl.style.borderColor = '#FF9800';
            }
        }
    }
})();
