// Hero Component JS
(function() {
    // Array of motivational quotes
    const heroQuotes = [
        "Join thousands of heroes who donate blood and save lives every day. Your contribution can make the difference between life and death.",
        "Every drop of blood you donate can save up to three lives. Be the reason someone gets a second chance.",
        "Blood donation is the gift of life. Your generosity today can bring hope to families tomorrow.",
        "Heroes don't always wear capes. Sometimes they roll up their sleeves and donate blood.",
        "Your blood type doesn't matter when it comes to saving lives. Every donation counts.",
        "One hour of your time can give someone a lifetime. Donate blood and become a hero.",
        "Blood donors are life savers. Your single donation can save multiple lives in emergencies.",
        "Be someone's miracle today. Your blood donation can make the impossible possible.",
        "The need for blood never takes a vacation. Your regular donation keeps saving lives.",
        "Donating blood costs you nothing but means everything to someone in need.",
        "Be a hero without a cape. Donate blood and give the gift of life.",
        "Your donation today could save a mother, father, child, or friend tomorrow.",
        "Every two seconds, someone needs blood. Your donation can be the answer to their prayers.",
        "Blood donation is not just about giving blood, it's about giving life and hope.",
        "Real superheroes donate blood. Join our community of lifesavers today."
    ];

    function initHero() {
        console.log('Hero initialized');
        
        // Change hero subtitle with random quote
        changeHeroQuote();
        
        // Add hero-specific functionality
        const heroButtons = document.querySelectorAll('.hero-buttons .cta-btn');
        heroButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const onclick = this.getAttribute('onclick');
                if (onclick) {
                    eval(onclick);
                }
            });
        });

        // Animate counter statistics
        animateCounters();
    }

    function changeHeroQuote() {
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) {
            // Select random quote
            const randomIndex = Math.floor(Math.random() * heroQuotes.length);
            const randomQuote = heroQuotes[randomIndex];
            
            // Fade out, change text, fade in
            heroSubtitle.style.opacity = '0';
            setTimeout(() => {
                heroSubtitle.textContent = randomQuote;
                heroSubtitle.style.transition = 'opacity 0.8s ease-in';
                heroSubtitle.style.opacity = '1';
            }, 300);
        }
    }

    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-count'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString();
                }
            };

            // Start animation when hero section is visible
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateCounter();
                        observer.disconnect();
                    }
                });
            }, { threshold: 0.5 });

            const heroSection = document.querySelector('.hero');
            if (heroSection) {
                observer.observe(heroSection);
            }
        });
    }

    // Initialize immediately when script loads
    initHero();
})();
