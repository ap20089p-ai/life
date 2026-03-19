// Auto-save functionality for registration forms
(function() {
    'use strict';

    // Auto-save configuration
    const AUTO_SAVE_CONFIG = {
        debounceDelay: 1000, // 1 second delay before saving
        storageKeys: {
            donorDraft: 'donor_registration_draft',
            hospitalDraft: 'hospital_registration_draft'
        }
    };

    let saveTimeout = null;

    /**
     * Debounced save function
     */
    function debouncedSave(callback) {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(callback, AUTO_SAVE_CONFIG.debounceDelay);
    }

    /**
     * Save form data to localStorage
     */
    function saveFormData(formId, storageKey) {
        const form = document.getElementById(formId);
        if (!form) return;

        const formData = {};
        const inputs = form.querySelectorAll('input:not([type="password"])');
        
        inputs.forEach(input => {
            if (input.name && input.value) {
                formData[input.name] = input.value;
            }
        });

        // Only save if there's actual data
        if (Object.keys(formData).length > 0) {
            try {
                localStorage.setItem(storageKey, JSON.stringify({
                    data: formData,
                    timestamp: new Date().toISOString()
                }));
                showSaveIndicator('✓ Auto-saved', 'success');
            } catch (e) {
                console.error('Failed to auto-save:', e);
            }
        }
    }

    /**
     * Restore form data from localStorage
     */
    function restoreFormData(formId, storageKey) {
        const form = document.getElementById(formId);
        if (!form) return false;

        try {
            const savedData = localStorage.getItem(storageKey);
            if (!savedData) return false;

            const { data, timestamp } = JSON.parse(savedData);
            
            // Check if saved data is older than 7 days
            const savedDate = new Date(timestamp);
            const daysDiff = (new Date() - savedDate) / (1000 * 60 * 60 * 24);
            
            if (daysDiff > 7) {
                // Clear old data
                localStorage.removeItem(storageKey);
                return false;
            }

            // Restore data to form fields
            let restoredCount = 0;
            Object.keys(data).forEach(fieldName => {
                const input = form.querySelector(`[name="${fieldName}"]`);
                if (input && !input.value) { // Only restore if field is empty
                    input.value = data[fieldName];
                    restoredCount++;
                }
            });

            if (restoredCount > 0) {
                showRestoreNotification(formId, storageKey);
                return true;
            }
        } catch (e) {
            console.error('Failed to restore data:', e);
        }
        return false;
    }

    /**
     * Clear saved draft data
     */
    function clearDraft(storageKey) {
        try {
            localStorage.removeItem(storageKey);
        } catch (e) {
            console.error('Failed to clear draft:', e);
        }
    }

    /**
     * Show save indicator
     */
    function showSaveIndicator(message, type = 'info') {
        // Remove existing indicator
        const existingIndicator = document.querySelector('.auto-save-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = `auto-save-indicator ${type}`;
        indicator.textContent = message;
        indicator.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : '#2196F3'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(indicator);

        // Remove after 2 seconds
        setTimeout(() => {
            indicator.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }

    /**
     * Show restore notification
     */
    function showRestoreNotification(formId, storageKey) {
        const form = document.getElementById(formId);
        if (!form) return;

        const notification = document.createElement('div');
        notification.className = 'restore-notification';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                <span>📝 Draft data restored. Continue where you left off?</span>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-keep-draft" style="background: #4caf50; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-size: 13px;">Keep</button>
                    <button class="btn-clear-draft" style="background: #f44336; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-size: 13px;">Clear</button>
                </div>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #fff;
            border: 2px solid #2196F3;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            max-width: 500px;
            animation: slideDown 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Handle keep button
        notification.querySelector('.btn-keep-draft').addEventListener('click', () => {
            notification.remove();
        });

        // Handle clear button
        notification.querySelector('.btn-clear-draft').addEventListener('click', () => {
            // Clear form
            form.reset();
            // Clear storage
            clearDraft(storageKey);
            notification.remove();
            showSaveIndicator('Draft cleared', 'info');
        });

        // Auto-close after 10 seconds if no action
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    /**
     * Initialize auto-save for a form
     */
    function initAutoSave(formId, storageKey) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Restore saved data on load
        restoreFormData(formId, storageKey);

        // Add auto-save on input
        form.addEventListener('input', (e) => {
            // Don't save password fields
            if (e.target.type === 'password') return;
            
            debouncedSave(() => {
                saveFormData(formId, storageKey);
            });
        });

        // Clear draft on successful submission
        form.addEventListener('submit', () => {
            setTimeout(() => {
                clearDraft(storageKey);
            }, 100);
        });
    }

    /**
     * Add CSS animations
     */
    function addAnimationStyles() {
        if (document.getElementById('auto-save-styles')) return;

        const style = document.createElement('style');
        style.id = 'auto-save-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
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
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-100px);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize on page load
     */
    function init() {
        // Add animation styles
        addAnimationStyles();

        // Initialize donor registration auto-save
        if (document.getElementById('donor-form')) {
            initAutoSave('donor-form', AUTO_SAVE_CONFIG.storageKeys.donorDraft);
        }

        // Initialize hospital registration auto-save
        if (document.getElementById('hospital-form')) {
            initAutoSave('hospital-form', AUTO_SAVE_CONFIG.storageKeys.hospitalDraft);
        }

        // Re-initialize when sections are loaded dynamically
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.id === 'donor-form' || node.querySelector('#donor-form')) {
                            initAutoSave('donor-form', AUTO_SAVE_CONFIG.storageKeys.donorDraft);
                        }
                        if (node.id === 'hospital-form' || node.querySelector('#hospital-form')) {
                            initAutoSave('hospital-form', AUTO_SAVE_CONFIG.storageKeys.hospitalDraft);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions for manual use if needed
    window.formAutoSave = {
        clearDraft: clearDraft,
        saveFormData: saveFormData,
        restoreFormData: restoreFormData
    };
})();
