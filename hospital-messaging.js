
// ==================== MESSAGING SYSTEM ====================

// Open Send Message Modal
function openSendMessageModal() {
    const hospital = getCurrentHospitalUser();
    if (!hospital || !hospital.id) {
        alert('Hospital information not found. Please refresh the page.');
        return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'send-message-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 600px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #c41e3a;">📨 Send Message to Donor</h2>
                <button onclick="closeSendMessageModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>

            <form onsubmit="handleSendMessage(event)" style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label for="msg-donor-email" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Donor Email Address *</label>
                    <input 
                        type="email" 
                        id="msg-donor-email" 
                        placeholder="donor@example.com" 
                        required
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                    />
                </div>

                <div>
                    <label for="msg-title" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Subject/Title *</label>
                    <input 
                        type="text" 
                        id="msg-title" 
                        placeholder="e.g., Appointment Reminder, Thank You, etc." 
                        required
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                    />
                </div>

                <div>
                    <label for="msg-type" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Message Type</label>
                    <select 
                        id="msg-type"
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
                    >
                        <option value="general">General Message</option>
                        <option value="appointment">Appointment Related</option>
                        <option value="donation">Donation Thank You</option>
                        <option value="alert">Important Alert</option>
                        <option value="reminder">Reminder</option>
                    </select>
                </div>

                <div>
                    <label for="msg-body" style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Message Content *</label>
                    <textarea 
                        id="msg-body" 
                        placeholder="Type your message here..." 
                        required
                        rows="6"
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: Arial, sans-serif;"
                    ></textarea>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button 
                        type="button" 
                        onclick="closeSendMessageModal()" 
                        style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        style="padding: 10px 20px; background: #c41e3a; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;"
                    >
                        📨 Send Message
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

// Close Send Message Modal
function closeSendMessageModal() {
    const modal = document.getElementById('send-message-modal');
    if (modal) {
        modal.remove();
    }
}

// Handle Send Message
function handleSendMessage(event) {
    event.preventDefault();

    const hospital = getCurrentHospitalUser();
    if (!hospital || !hospital.id) {
        alert('Hospital information not found');
        return;
    }

    const donorEmail = document.getElementById('msg-donor-email').value.trim();
    const title = document.getElementById('msg-title').value.trim();
    const type = document.getElementById('msg-type').value;
    const body = document.getElementById('msg-body').value.trim();

    if (!donorEmail || !title || !body) {
        alert('Please fill all required fields');
        return;
    }

    // First, find the donor ID by email
    fetch(`${API_BASE_URL}/donor/by-email/${donorEmail}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Donor not found with email: ${donorEmail}`);
            }
            return response.json();
        })
        .then(donor => {
            if (!donor || !donor.id) {
                throw new Error('Invalid donor data received');
            }

            // Now send the message to the donor
            return fetch(`${API_BASE_URL}/messages/send-to-donor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    donorId: donor.id,
                    hospitalId: hospital.id,
                    title: title,
                    message: body,
                    type: type
                })
            });
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`✅ Message sent successfully to ${donorEmail}!`);
                closeSendMessageModal();
            } else {
                alert(`❌ Failed to send message: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert(`❌ Error: ${error.message}`);
        });
}

// Send Appointment Reminder to Donor
function sendAppointmentReminder(donorId, donorEmail, appointmentDate, appointmentTime, hospitalName) {
    const hospital = getCurrentHospitalUser();
    if (!hospital || !hospital.id) {
        alert('Hospital information not found');
        return;
    }

    const message = `You have an appointment scheduled at ${hospitalName} on ${appointmentDate} at ${appointmentTime}. Please confirm your attendance.`;

    fetch(`${API_BASE_URL}/messages/send-to-donor`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            donorId: donorId,
            hospitalId: hospital.id,
            title: 'Appointment Reminder',
            message: message,
            type: 'appointment'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✓ Appointment reminder sent to', donorEmail);
        } else {
            console.error('Failed to send appointment reminder:', data.error);
        }
    })
    .catch(error => {
        console.error('Error sending appointment reminder:', error);
    });
}

// Send Thank You Message to Donor After Donation
function sendDonationThankYou(donorId, donorEmail, bloodType) {
    const hospital = getCurrentHospitalUser();
    if (!hospital || !hospital.id) {
        console.error('Hospital information not found');
        return;
    }

    const message = `Thank you for your generous donation of ${bloodType} blood! Your contribution saves lives. We appreciate your selfless act of kindness.`;

    fetch(`${API_BASE_URL}/messages/send-to-donor`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            donorId: donorId,
            hospitalId: hospital.id,
            title: 'Thank You for Donating!',
            message: message,
            type: 'donation'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✓ Thank you message sent to', donorEmail);
        } else {
            console.error('Failed to send thank you message:', data.error);
        }
    })
    .catch(error => {
        console.error('Error sending thank you message:', error);
    });
}
