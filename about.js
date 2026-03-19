(function(){
    function init() {
        console.log('about.js initialized');
        // about page specific JS (animations or behaviors)
    }

    if (window.commonLoaded) init();
    else {
        const s = document.createElement('script');
        s.src = 'script.js';
        s.onload = init;
        document.head.appendChild(s);
    }
})();
