// --- Loading Screen Logic ---
const startTime = performance.now(); // Record start time
const minimumLoadTime = 5000; // 5 seconds in milliseconds
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
let loadingInterval = null; // To store the interval ID

if (loadingBar) {
    // Start simulating progress
    loadingInterval = setInterval(() => {
        const elapsedTime = performance.now() - startTime;
        // Calculate progress based ONLY on time elapsed towards minimumLoadTime
        const progress = Math.min(100, (elapsedTime / minimumLoadTime) * 100);
        loadingBar.style.width = progress + '%';

        // Stop interval based on time, not just visual progress
        if (elapsedTime >= minimumLoadTime) {
            loadingBar.style.width = '100%'; // Ensure it visually completes
            if (loadingInterval) {
                clearInterval(loadingInterval);
                loadingInterval = null;
            }
        }
    }, 50); // Update progress roughly 20 times per second
} else {
    console.error("Loading bar element not found!");
}

let isWindowLoaded = false;
let isInitialLocationDone = false;
let areAssetsPreloaded = false; // Flag for asset preloading
let hideScreenTimeout = null; // To store the timeout for hiding the screen

// --- Asset Preloading ---
const iconAssetsToPreload = [
    'img/walk.png',       // Player/Enemy sprite
    'img/org.png',        // Organization base icon
    'img/business.png',   // Business icon
    // External URLs might not strictly need preloading but can help ensure they're cached
    'https://img.icons8.com/external-flatart-icons-flat-flatarticons/64/000000/external-money-bag-valentines-day-flatart-icons-flat-flatarticons.png', // Cash Drop
    'https://img.icons8.com/ios-filled/50/000000/user-secret.png' // Rival Icon
    // Add other critical image assets here if needed
];

function preloadImages(urls) {
    let promises = [];
    urls.forEach(url => {
        promises.push(new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // Resolve even on error to not block loading indefinitely
            img.src = url;
        }));
    });
    return Promise.all(promises);
}

// Start preloading assets immediately
preloadImages(iconAssetsToPreload).then(() => {
    console.log("Map icon assets preloaded (or failed gracefully).");
    areAssetsPreloaded = true;
    checkAndHideLoadingScreen(); // Check if other conditions are met
}).catch(error => {
    // This catch might not be strictly necessary if errors resolve the promise
    console.error("Error during image preloading:", error);
    areAssetsPreloaded = true; // Still allow game to load even if preloading fails
    checkAndHideLoadingScreen();
});


// Function to check all conditions and hide the loading screen
function checkAndHideLoadingScreen() {
    // Only proceed if all flags are true
    if (!isWindowLoaded || !isInitialLocationDone || !areAssetsPreloaded) {
        // console.log(`Check failed: isWindowLoaded=${isWindowLoaded}, isInitialLocationDone=${isInitialLocationDone}, areAssetsPreloaded=${areAssetsPreloaded}`);
        return;
    }

    console.log("All conditions met (Window Loaded + Location Done). Checking minimum time...");

    // Ensure bar is 100% and interval is stopped (redundant check, but safe)
    if (loadingBar) {
        loadingBar.style.width = '100%';
    }
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }

    // Calculate remaining time for the minimum duration
    const elapsedTime = performance.now() - startTime;
    const remainingTime = Math.max(0, minimumLoadTime - elapsedTime); // Ensure remainingTime is not negative

    // Clear any existing timeout to avoid multiple triggers if checkAndHide is called multiple times quickly
    if (hideScreenTimeout) {
        clearTimeout(hideScreenTimeout);
    }

    console.log(`Waiting ${remainingTime.toFixed(0)}ms more for minimum duration.`);

    hideScreenTimeout = setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            console.log("Loading screen hidden after all conditions met and minimum duration.");
        }
        hideScreenTimeout = null; // Clear the stored timeout ID
    }, remainingTime);
}

// 1. Listen for window load
window.addEventListener('load', () => {
    console.log("Window loaded.");
    isWindowLoaded = true;
    checkAndHideLoadingScreen(); // Check if location is also done
});


// Initialize the map
const map = L.map('map', {
    attributionControl: false, // Disable attribution text
    zoomControl: false // Disable default zoom buttons
}).setView([51.505, -0.09], 13); // Default view if geolocation fails

// Add CartoDB Dark Matter tile layer (Reverted)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
	// attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>', // Attribution text (control hidden)
	subdomains: 'abcd',
	maxZoom: 20 // CartoDB supports higher zoom
}).addTo(map);

// --- Global Base Items & Shop Instance ---
let baseItemsForShop = { consumables: {}, equipment: {} };
let gameShop = null; // Will hold the Shop instance

// Function to prepare base items for the shop from loaded databases
// Ensure this runs AFTER items.js and equipment.js are loaded
function prepareBaseItemsForShop() {
    console.log("Preparing base items for shop...");
    // Process Consumables
    if (typeof itemsDatabase !== 'undefined') {
        itemsDatabase.forEach((item, id) => {
            if (item.itemType === ItemType.CONSUMABLE) {
                // Add a simple price if missing, or use existing if defined
                baseItemsForShop.consumables[id] = { ...item, price: item.price || 50 }; // Example default price 50
            }
        });
    } else {
        console.error("itemsDatabase not found during shop item preparation!");
    }

    // Process Equipment
    if (typeof equipmentDatabase !== 'undefined') {
        equipmentDatabase.forEach((item, id) => {
            const type = item.equipmentType; // e.g., EquipmentType.WEAPON
            if (!baseItemsForShop.equipment[type]) {
                baseItemsForShop.equipment[type] = [];
            }
            // Add equipment with its defined stats and rarity
            baseItemsForShop.equipment[type].push({ ...item });
        });
    } else {
        console.error("equipmentDatabase not found during shop item preparation!");
    }
    console.log("Base items prepared:", baseItemsForShop);

    // Instantiate the global shop (assuming Shop class is loaded from shop.js)
    if (typeof Shop !== 'undefined') {
        // Using a generic name for now, could be tied to a specific location later
        gameShop = new Shop("General Store", baseItemsForShop);
        console.log("Global gameShop instantiated:", gameShop);
    } else {
        console.error("Shop class not found! Ensure shop.js is loaded before initialization.js tries to use it.");
    }
}

// --- Initial Setup ---

// Function to perform initial setup (fetch location, spawn items, find org, fetch initial businesses)
async function initializeGame() {
    console.log("Initializing game...");
    let initialLat = 51.505; // Default lat
    let initialLon = -0.09;  // Default lon
    let locationPermissionGranted = false; // Flag to track permission

    // --- Location Fetching with Permissions Check ---
    if (navigator.geolocation && navigator.permissions) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            console.log("Geolocation permission status:", permissionStatus.state);

            if (permissionStatus.state === 'granted') {
                locationPermissionGranted = true;
                // Permission already granted, proceed to get location
            } else if (permissionStatus.state === 'prompt') {
                // Permission needs to be asked, getCurrentPosition will trigger the prompt
                locationPermissionGranted = true; // Assume it might be granted
            } else if (permissionStatus.state === 'denied') {
                // Permission denied, inform user and use default
                showCustomAlert("Location access was denied. Please enable it in your browser settings to use your current location. Using default location."); // Use custom alert
                locationPermissionGranted = false;
            }

            // Listen for changes in permission status
            permissionStatus.onchange = () => {
                console.log("Geolocation permission status changed to:", permissionStatus.state);
                // Potentially reload or update UI if permission changes mid-session
                locationPermissionGranted = (permissionStatus.state === 'granted');
                // If permission is granted later, maybe re-initialize location?
                // For now, just update the flag. WatchPosition might start working.
            };

        } catch (error) {
            console.error("Error checking geolocation permission:", error);
            // Fallback to trying to get location anyway, or use default
            locationPermissionGranted = false; // Assume no permission if query fails
        }

        // Attempt to get location only if permission is not explicitly denied
        if (locationPermissionGranted) {
            const locationPromise = new Promise((resolve, reject) => {
                console.log("Attempting to get current position...");
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000, // Increased timeout for initial fix
                    maximumAge: 0
                });
            });

            try {
                const position = await locationPromise;
                initialLat = position.coords.latitude;
                initialLon = position.coords.longitude;
                currentUserLocation = { lat: initialLat, lon: initialLon };
                console.log("Geolocation successful:", currentUserLocation);
                map.setView([initialLat, initialLon], 16); // Zoom in closer

            } catch (error) {
                console.warn("Geolocation failed or timed out. Using default location.", error.message);
                // Keep default lat/lon
                currentUserLocation = { lat: initialLat, lon: initialLon };
                map.setView([initialLat, initialLon], 13); // Wider view for default
                locationPermissionGranted = false; // Mark as failed for watchPosition check
            }
        } else {
             // Use default location if permission was denied or query failed
             console.log("Using default location due to permission status.");
             currentUserLocation = { lat: initialLat, lon: initialLon };
             map.setView([initialLat, initialLon], 13);
        }

    } else {
        console.warn("Geolocation or Permissions API not supported. Using default location.");
        // Use default location
        currentUserLocation = { lat: initialLat, lon: initialLon };
        map.setView([initialLat, initialLon], 13);
        locationPermissionGranted = false;
    }

    // --- Create or Update Player Marker ---
    const playerIcon = L.divIcon({
        html: '<div class="player-sprite walk-down"></div>',
        className: 'player-marker',
        iconSize: [64, 64],
        iconAnchor: [32, 32]
    });

    const popupText = locationPermissionGranted && currentUserLocation.lat !== 51.505 ? 'You are here!' : 'Default location.';

    if (!userMarker) {
        userMarker = L.marker([initialLat, initialLon], { icon: playerIcon }).addTo(map).bindPopup(popupText);
    } else {
        userMarker.setLatLng([initialLat, initialLon]).setPopupContent(popupText);
        // Ensure icon is correct
        if (userMarker.getIcon() !== playerIcon) {
            userMarker.setIcon(playerIcon);
        }
    }
    userMarker.openPopup();

    // --- Prepare Base Items for Shop ---
    prepareBaseItemsForShop(); // Call the function here

    // --- Signal that location attempt is done ---
    console.log("Initial location attempt finished.");
    isInitialLocationDone = true;
    checkAndHideLoadingScreen(); // Check if we can hide the screen now


    // --- Continue with other setup tasks AFTER location is determined ---
    console.log("Spawning initial items...");
    spawnCashDrops(initialLat, initialLon);
    spawnRivals(initialLat, initialLon);

    console.log("Attempting to find initial organization...");
    await findAndJoinInitialOrganization(initialLat, initialLon);

    console.log("Fetching initial businesses...");
    const initialBounds = map.getBounds();
    const initialBusinesses = await fetchBusinessesInBounds(initialBounds);
    displayBusinesses(initialBusinesses);

    console.log("Running initial business marker update...");
    updateBusinessMarkers(); // Update icons/popups and Protection Book

    console.log("Spawning enemies...");
    const enemySpawnRadiusDegrees = 0.008; // Approx 800m radius in degrees (adjust as needed)
    const numberOfEnemies = 10; // Number of enemies to spawn
    spawnEnemies(numberOfEnemies, initialLat, initialLon, enemySpawnRadiusDegrees, enemyLayer); // Call the function from enemy.js
    startEnemyMovement(3000); // Start enemy movement (e.g., every 3 seconds)

    // *** Initial visibility check after everything is loaded/spawned ***
    if (currentUserLocation) {
        console.log("Running initial marker visibility check...");
        updateMarkersVisibility(currentUserLocation.lat, currentUserLocation.lon);
    }

    console.log("Setting up position watching...");
    // Start watching for position changes only if permission was granted
    if (locationPermissionGranted && navigator.geolocation && navigator.geolocation.watchPosition) {
        let lastPos = null; // Store the last position to calculate movement vector

        navigator.geolocation.watchPosition(
            position => { // Success Callback for updates
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const newPos = { lat, lon };

                // Update marker position
                if (userMarker) {
                    userMarker.setLatLng([lat, lon]);
                }

                // Determine movement direction and update sprite class
                if (lastPos && userMarker) {
                    const dLat = newPos.lat - lastPos.lat;
                    const dLon = newPos.lon - lastPos.lon;
                    const absLat = Math.abs(dLat);
                    const absLon = Math.abs(dLon);

                    const spriteElement = userMarker.getElement()?.querySelector('.player-sprite');

                    if (spriteElement) {
                        // Remove existing direction classes
                        spriteElement.classList.remove('walk-up', 'walk-down', 'walk-left', 'walk-right');

                        // Determine primary direction
                        if (absLat > absLon) { // Moved more vertically
                            if (dLat > 0) {
                                spriteElement.classList.add('walk-up'); // Moving North (Sprite row 1)
                            } else {
                                spriteElement.classList.add('walk-down'); // Moving South (Sprite row 3)
                            }
                        } else if (absLon > absLat) { // Moved more horizontally
                            if (dLon > 0) {
                                spriteElement.classList.add('walk-right'); // Moving East (Sprite row 4)
                            } else {
                                spriteElement.classList.add('walk-left'); // Moving West (Sprite row 2)
                            }
                        } else {
                            // Minimal movement or diagonal - keep previous or default to down? Defaulting to down.
                            spriteElement.classList.add('walk-down');
                        }
                    }
                }

                currentUserLocation = newPos; // Update current location state
                lastPos = newPos; // Store current position as the last position for the next update

                // *** Update marker visibility on location change ***
                updateMarkersVisibility(lat, lon);

                // console.log("User location updated:", currentUserLocation); // Keep log concise
                // Optional: Re-center map: map.panTo([lat, lon]);
            },
            error => { // Error Callback for updates
                console.error("Error watching position:", error.message);
            },
            { // Options for watchPosition
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
         console.log("Geolocation is not supported or watchPosition unavailable. Position watching disabled.");
    }

    // Start HP Regeneration
    console.log("Starting HP regeneration timer...");
    startHpRegeneration(); // Function from gameWorld.js

    console.log("initializeGame setup tasks complete.");
}

// --- Map Event Listeners ---
map.on('moveend', async function() { // Use async here
    const bounds = map.getBounds();
    console.log("Map view moved, fetching data for new bounds:", bounds);

    // Fetch bases first
    const basesInView = await fetchBasesInBounds(bounds);
    displayBases(basesInView); // Display new bases

    // Fetch businesses next
    const businessesInView = await fetchBusinessesInBounds(bounds);
    displayBusinesses(businessesInView); // Display new businesses

    // *** Explicitly update all displayed business markers AFTER new ones are processed ***
    // This ensures all visible businesses reflect the current organization status.
    console.log("Map moved, running business marker update.");
    updateBusinessMarkers(); // Update icons/popups and Protection Book

    // *** Update visibility based on player distance AFTER fetching/updating markers ***
    if (currentUserLocation) {
        updateMarkersVisibility(currentUserLocation.lat, currentUserLocation.lon);
    }
});

// --- Zoom Level Layer Control --- (REMOVED)
// const ZOOM_THRESHOLD = 13;
// function updateLayerVisibility() { ... }
// map.on('zoomend', updateLayerVisibility);
// updateLayerVisibility(); // Initial check removed


// 2. Start the game initialization process (which includes location fetching)
// initializeGame is now async and will set isInitialLocationDone when location attempt finishes
initializeGame().then(() => {
    console.log("initializeGame promise resolved successfully.");
    // Note: isInitialLocationDone is set inside initializeGame's finally block
}).catch(error => {
    console.error("Error during initializeGame execution:", error);
    // Ensure the flag is set even if initializeGame fails later
    // (though the finally block should handle most cases)
    if (!isInitialLocationDone) {
        console.warn("Setting isInitialLocationDone in catch block as a fallback.");
        isInitialLocationDone = true;
        checkAndHideLoadingScreen();
    }
});
