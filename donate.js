(function(){
    function init() {
        console.log('donate.js initialized');
        // Fetch and display donation location
        fetchDonationLocation();
    }

    function fetchDonationLocation() {
        const apiUrl = 'http://localhost:3000/api/location';
        
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                const locationName = document.getElementById('locationName');
                const locationDetails = document.getElementById('locationDetails');
                
                if (data && data.locationName) {
                    locationName.textContent = data.locationName + ' - Where your donation is happening';
                    let details = 'Visit us';
                    if (data.address) details += ' at ' + data.address;
                    if (data.city) details += ', ' + data.city;
                    details += ' to start your donation journey today!';
                    locationDetails.textContent = details;
                } else {
                    locationName.textContent = 'Kar Place - Where your donation is happening';
                    locationDetails.textContent = 'Visit us at Kar Place to start your donation journey today!';
                }
            })
            .catch(error => {
                console.log('Location fetch error, using default:', error);
                // Use default location if API fails
                document.getElementById('locationName').textContent = 'Kar Place - Where your donation is happening';
                document.getElementById('locationDetails').textContent = 'Visit us at Kar Place to start your donation journey today!';
            });
    }

    if (window.commonLoaded) init();
    else {
        const s = document.createElement('script');
        s.src = 'script.js';
        s.onload = init;
        document.head.appendChild(s);
    }
})();
