(function(){
    function init() {
        console.log('contact.js initialized');
        // contact page specific JS
    }

    if (window.commonLoaded) init();
    else {
        const s = document.createElement('script');
        s.src = 'script.js';
        s.onload = init;
        document.head.appendChild(s);
    }
})();
