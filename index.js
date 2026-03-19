(function(){
    function loadCSS(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        document.head.appendChild(script);
    }

    function loadComponent(containerId, fileName, scriptFile, cssFile) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Load CSS
        if (cssFile) {
            loadCSS(cssFile);
        }
        
        fetch(`../html/${fileName}`)
            .then(response => response.text())
            .then(html => {
                // Remove script tags from HTML before injecting
                const cleanHtml = html.replace(/<link[^>]*>/g, '').replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
                container.innerHTML = cleanHtml;
                
                // Load script after HTML is injected
                if (scriptFile) {
                    loadScript(scriptFile);
                }
            })
            .catch(error => console.error(`Error loading ${fileName}:`, error));
    }

    function init() {
        console.log('index.js initialized');
        
        // Load all components with their CSS and JS files
        loadComponent('navbar-container', 'navbar.html', '../js/navbar.js', '../css/navbar.css');
        loadComponent('hero-container', 'hero.html', '../js/hero.js', '../css/hero.css');
        loadComponent('blood-container', 'blood-types.html', '../js/blood-types.js', '../css/blood-types.css');
        loadComponent('footer-container', 'footer.html', '../js/footer.js', '../css/footer.css');
    }

    if (window.commonLoaded) init();
    else {
        const s = document.createElement('script');
        s.src = '../js/script.js';
        s.onload = init;
        document.head.appendChild(s);
    }
})();
