(function(){
    console.log('=== EditHospitalProfile.js STARTED ===');

    function initializeForm() {
        console.log('Attempting to initialize hospital edit form...');
        const form = document.getElementById('hospital-edit-form');
        
        if (!form) {
            console.error('Hospital edit form not found!');
            // Retry in 500ms
            setTimeout(initializeForm, 500);
            return;
        }
        
        console.log('✓ Hospital edit form found!', form);
        
        // Load hospital data from localStorage first
        let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
        console.log('Current user from localStorage:', currentUser);
        
        // If we have an ID, fetch full data from API
        if (currentUser.id) {
            fetchHospitalProfileFromAPI(currentUser.id, form);
        } else {
            // Fallback to localStorage data
            prefillForm(currentUser);
            updateProfileCompletion(currentUser);
            setupProgressTracking(form);
            setupSubmitHandler(form);
            console.log('✓ Form initialized with localStorage data');
        }
    }

    function fetchHospitalProfileFromAPI(hospitalId, form) {
        console.log('Fetching hospital profile from API:', hospitalId);
        
        fetch(`http://localhost:3000/api/hospital/${hospitalId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch hospital profile');
                }
                return response.json();
            })
            .then(hospital => {
                console.log('✓ Hospital profile fetched from API:', hospital);
                
                // Map API field names to form field names
                const mappedHospital = {
                    hospitalName: hospital.hospitalName,
                    email: hospital.email,
                    phone: hospital.phone,
                    licenseNumber: hospital.licenseNumber,
                    address: hospital.address,
                    city: hospital.city,
                    state: hospital.state,
                    zipcode: hospital.zipCode,
                    country: hospital.country,
                    description: hospital.description,
                    services: hospital.services || '',
                    website: hospital.websiteUrl
                };
                
                // Pre-fill form
                prefillForm(mappedHospital);
                
                // Update progress
                updateProfileCompletion(mappedHospital);
                
                // Setup event listeners
                setupProgressTracking(form);
                setupSubmitHandler(form);
                
                console.log('✓ Form initialization complete with API data');
            })
            .catch(error => {
                console.error('Error fetching hospital profile from API:', error);
                console.log('Falling back to localStorage data...');
                
                // Fallback to localStorage data
                let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
                prefillForm(currentUser);
                updateProfileCompletion(currentUser);
                setupProgressTracking(form);
                setupSubmitHandler(form);
                
                alert('⚠️ Using cached data. Some information might not be up to date.');
            });
    }

    function prefillForm(hospital) {
        const fields = [
            { id: 'eh-hospitalName', key: 'hospitalName' },
            { id: 'eh-email', key: 'email' },
            { id: 'eh-phone', key: 'phone' },
            { id: 'eh-licenseNumber', key: 'licenseNumber' },
            { id: 'eh-address', key: 'address' },
            { id: 'eh-city', key: 'city' },
            { id: 'eh-state', key: 'state' },
            { id: 'eh-zipcode', key: 'zipcode' },
            { id: 'eh-country', key: 'country' },
            { id: 'eh-description', key: 'description' },
            { id: 'eh-services', key: 'services' },
            { id: 'eh-website', key: 'website' }
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                element.value = hospital[field.key] || '';
            }
        });
        
        console.log('✓ Hospital form pre-filled with data');
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
        const hospital = {
            hospitalName: formData.get('hospitalName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            licenseNumber: formData.get('licenseNumber'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipcode: formData.get('zipcode'),
            country: formData.get('country'),
            description: formData.get('description'),
            services: formData.get('services'),
            website: formData.get('website')
        };
        updateProfileCompletion(hospital);
    }

    function setupSubmitHandler(form) {
        // Remove any existing listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        const updatedForm = document.getElementById('hospital-edit-form');
        
        updatedForm.addEventListener('submit', function(e) {
            console.log('=== HOSPITAL PROFILE FORM SUBMIT ===');
            e.preventDefault();
            
            const formData = new FormData(this);
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
            
            // Validate required fields
            const hospitalName = formData.get('hospitalName')?.trim();
            const email = formData.get('email')?.trim();
            const phone = formData.get('phone')?.trim();
            const licenseNumber = formData.get('licenseNumber')?.trim();
            
            if (!hospitalName) {
                alert('❌ Please enter hospital name');
                return;
            }
            if (!email) {
                alert('❌ Email is required');
                return;
            }
            if (!phone) {
                alert('❌ Please enter phone number');
                return;
            }
            if (!licenseNumber) {
                alert('❌ Please enter license number');
                return;
            }
            
            const updatedData = {
                hospitalName: hospitalName,
                phone: phone,
                licenseNumber: licenseNumber,
                address: formData.get('address')?.trim() || '',
                city: formData.get('city')?.trim() || '',
                state: formData.get('state')?.trim() || '',
                zipCode: formData.get('zipcode')?.trim() || '',
                country: formData.get('country')?.trim() || 'USA',
                description: formData.get('description')?.trim() || '',
                websiteUrl: formData.get('website')?.trim() || '',
                services: formData.get('services')?.trim() || ''
            };
            
            console.log('Updated hospital data:', updatedData);
            
            // Check if we have a hospital ID to use API
            if (currentUser.id) {
                // Use API to update
                fetch(`http://localhost:3000/api/hospital/${currentUser.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update profile');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('✓ Profile updated via API:', data);
                    
                    // Update localStorage with new data
                    const updated = {
                        ...currentUser,
                        hospitalName: updatedData.hospitalName,
                        phone: updatedData.phone,
                        licenseNumber: updatedData.licenseNumber,
                        address: updatedData.address,
                        city: updatedData.city,
                        state: updatedData.state,
                        zipcode: updatedData.zipCode,
                        country: updatedData.country,
                        description: updatedData.description,
                        website: updatedData.websiteUrl,
                        services: updatedData.services,
                        email: email
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(updated));
                    localStorage.setItem('currentHospital', JSON.stringify(updated));
                    console.log('✓ Saved to localStorage');
                    
                    alert('✅ Profile updated successfully!');
                    window.location.href = 'hospital-dashboard.html';
                })
                .catch(error => {
                    console.error('API Error:', error);
                    alert('❌ Error updating profile: ' + error.message);
                });
            } else {
                // Fallback to localStorage if no API ID
                console.warn('No hospital ID found, using localStorage fallback');
                
                const updated = {
                    ...currentUser,
                    hospitalName: updatedData.hospitalName,
                    email: email,
                    phone: updatedData.phone,
                    licenseNumber: licenseNumber,
                    address: updatedData.address,
                    city: updatedData.city,
                    state: updatedData.state,
                    zipcode: updatedData.zipCode,
                    country: currentUser.country || 'USA',
                    description: updatedData.description,
                    services: formData.get('services')?.trim() || currentUser.services,
                    website: updatedData.websiteUrl,
                    type: 'hospital'
                };
                
                try {
                    // Save to both storage locations for consistency
                    localStorage.setItem('currentHospital', JSON.stringify(updated));
                    localStorage.setItem('currentUser', JSON.stringify(updated));
                    console.log('✓ Saved to localStorage');
                    
                    // Update hospitals list
                    const hospitals = JSON.parse(localStorage.getItem('hospitals')) || [];
                    const idx = hospitals.findIndex(h => h.email === currentUser.email || h.email === updated.email);
                    if (idx !== -1) {
                        hospitals[idx] = updated;
                        localStorage.setItem('hospitals', JSON.stringify(hospitals));
                        console.log('✓ Updated hospitals list');
                    }
                    
                    alert('✅ Profile updated successfully!');
                    window.location.href = 'hospital-dashboard.html';
                } catch (error) {
                    console.error('Error saving:', error);
                    alert('❌ Error saving profile: ' + error.message);
                }
            }
        });
        
        console.log('✓ Submit handler attached');
    }

    // Check if hospital profile is complete
    function isProfileComplete(hospital) {
        const required = ['hospitalName', 'email', 'phone', 'licenseNumber'];
        return required.every(field => hospital[field] && hospital[field].toString().trim() !== '');
    }

    // Update profile completion indicator
    function updateProfileCompletion(hospital) {
        const statusEl = document.getElementById('hospitalCompletionStatus');
        const messageEl = document.getElementById('completionMessage');
        const progressEl = document.getElementById('completionProgress');
        
        if (!statusEl) return;
        
        const fields = ['hospitalName', 'email', 'phone', 'licenseNumber', 'address', 'city', 'description', 'website'];
        const completed = fields.filter(f => hospital[f] && hospital[f].toString().trim() !== '').length;
        const percentage = Math.round((completed / fields.length) * 100);
        const isComplete = percentage === 100;
        
        if (progressEl) {
            progressEl.style.width = percentage + '%';
            progressEl.style.backgroundColor = isComplete ? '#4CAF50' : '#FF9800';
        }
        
        if (messageEl) {
            if (isComplete) {
                messageEl.textContent = '✓ Profile Complete (100%)';
                messageEl.style.color = '#4CAF50';
                statusEl.style.borderColor = '#4CAF50';
            } else {
                messageEl.textContent = `⏳ Profile Completion (${percentage}%)`;
                messageEl.style.color = '#FF9800';
                statusEl.style.borderColor = '#FF9800';
            }
        }
    }

    // If script injected after HTML, run immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeForm);
    } else {
        initializeForm();
    }

    // Also try on load
    window.addEventListener('load', initializeForm);
})();
