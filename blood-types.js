// Blood Types Component JS
(function() {
    function initBloodTypes() {
        console.log('Blood Types section initialized');
        
        // Add blood card hover effects
        const bloodCards = document.querySelectorAll('.blood-card');
        bloodCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-10px)';
            });
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });

        // Handle back button with proper event delegation
        const backBtn = document.querySelector('#blood .back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (typeof scrollToSection === 'function') {
                    scrollToSection('home');
                } else {
                    console.error('scrollToSection function not found');
                }
            });
        } else {
            console.warn('Back button not found in Blood Types section');
        }
    }

    // Initialize immediately when script loads
    initBloodTypes();
})();
