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

// --- Sound Management ---
let isSoundEnabled = true; // Default to on, will sync with checkbox
let bgmAudio = null;
// REMOVED: bgmNeedsUserInteraction flag and related listeners
// let bgmNeedsUserInteraction = false;
// let interactionListenerActive = false;
const battleSounds = [];
const battleSoundPaths = [
    'sound/gun1.mp3',
    'sound/gun2.mp3',
    'sound/gun3.mp3',
    'sound/gun4.mp3'
];
const bgmPath = 'sound/bgm.mp3';

// Generic sound player (used for battle sounds primarily now)
function playSound(audioElement) {
    if (isSoundEnabled && audioElement) {
        audioElement.currentTime = 0; // Rewind to start
        audioElement.play().catch(error => console.error("Error playing sound:", error));
    }
}

// Function to attempt playing BGM - Called by sound toggle ON event
function playBgm() {
    if (isSoundEnabled && bgmAudio && bgmAudio.paused) {
        console.log("Attempting to play BGM via explicit trigger...");
        const playPromise = bgmAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Error playing BGM:", error);
                // If it fails with NotAllowedError, log it but don't automatically retry/add listeners.
                if (error.name === 'NotAllowedError') {
                     console.warn("NotAllowedError: BGM playback failed. Browser requires user interaction before audio can play. Try toggling sound off/on again after clicking/interacting.");
                }
            });
        }
    } else if (!isSoundEnabled) {
         // console.log("playBgm called but sound is disabled.");
    } else if (!bgmAudio) {
         console.log("playBgm called but bgmAudio is not loaded yet.");
    } else if (isSoundEnabled && bgmAudio && !bgmAudio.paused) {
         // console.log("playBgm called, but BGM already playing.");
    }
}

function stopBgm() {
    if (bgmAudio && !bgmAudio.paused) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0; // Reset to beginning
        console.log("BGM stopped.");
    }
}

function playRandomBattleSound() {
    // Battle sounds should play if sound is enabled, regardless of BGM interaction state
    if (isSoundEnabled && battleSounds.length > 0) {
        const randomIndex = Math.floor(Math.random() * battleSounds.length);
        const soundToPlay = battleSounds[randomIndex];
        if (soundToPlay) {
            // Use the generic playSound function which includes the isSoundEnabled check
            playSound(soundToPlay);
        }
    }
}

// --- Asset Preloading ---
const iconAssetsToPreload = [
    'img/walk.png',       // Player/Enemy sprite
    'img/org.png',        // Organization base icon
    'img/business.png',   // Business icon
    'https://img.icons8.com/external-flatart-icons-flat-flatarticons/64/000000/external-money-bag-valentines-day-flatart-icons-flat-flatarticons.png', // Cash Drop
    'https://img.icons8.com/ios-filled/50/000000/user-secret.png' // Rival Icon
];

function preloadImages(urls) {
    let promises = [];
    urls.forEach(url => {
        promises.push(new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // Resolve even on error
            img.src = url;
        }));
    });
    return Promise.all(promises);
}

function preloadAudio(urls) {
    let promises = [];
    urls.forEach((url) => {
        promises.push(new Promise((resolve) => {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', resolve, { once: true });
            audio.addEventListener('error', (e) => {
                console.error(`Error loading audio: ${url}`, e);
                resolve(); // Resolve even on error
            }, { once: true });
            audio.preload = 'auto';
            audio.src = url;
            audio.load();

            if (url === bgmPath) {
                bgmAudio = audio;
                bgmAudio.loop = true;
            } else if (battleSoundPaths.includes(url)) {
                battleSounds.push(audio);
            }
        }));
    });
    return Promise.all(promises);
}


// Start preloading assets immediately
const imagePreloadPromise = preloadImages(iconAssetsToPreload).then(() => {
    console.log("Map icon assets preloaded.");
    areAssetsPreloaded = true;
}).catch(error => {
    console.error("Error during image preloading:", error);
    areAssetsPreloaded = true; // Still allow game to load
});

const audioPreloadPromise = preloadAudio([bgmPath, ...battleSoundPaths]).then(() => {
    console.log("Audio assets preloaded.");
}).catch(error => {
    console.error("Error during audio preloading:", error);
});

// Wait for image preloading before checking loading screen conditions
imagePreloadPromise.finally(() => {
     checkAndHideLoadingScreen();
});

// Set initial sound state AFTER audio preloading attempt finishes
audioPreloadPromise.finally(() => {
    console.log("Audio preloading finished.");
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        // Set the global variable based on the checkbox's default state (checked)
        isSoundEnabled = soundToggle.checked;
        console.log(`Initial sound state: ${isSoundEnabled ? 'ON' : 'OFF'}.`);
        // No need to check bgmNeedsUserInteraction here anymore
    } else {
        isSoundEnabled = true; // Default if toggle missing
        console.warn("Sound toggle not found, defaulting sound ON.");
    }
});

// REMOVED Interaction Handling functions (handleFirstInteraction, addInteractionListener, removeInteractionListener)

// --- Loading Screen Hide Logic ---
function checkAndHideLoadingScreen() {
    if (!isWindowLoaded || !isInitialLocationDone || !areAssetsPreloaded) {
        return;
    }
    console.log("All conditions met (Window Loaded + Location Done). Checking minimum time...");
    if (loadingBar) loadingBar.style.width = '100%';
    if (loadingInterval) clearInterval(loadingInterval);
    loadingInterval = null;

    const elapsedTime = performance.now() - startTime;
    const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);

    if (hideScreenTimeout) clearTimeout(hideScreenTimeout);

    console.log(`Waiting ${remainingTime.toFixed(0)}ms more for minimum duration.`);
    hideScreenTimeout = setTimeout(() => {
        if (loadingScreen) loadingScreen.style.display = 'none';
        console.log("Loading screen hidden.");
        hideScreenTimeout = null;
        // REMOVED playback attempt from here. Rely on sound toggle.
    }, remainingTime);
}

// 1. Listen for window load
window.addEventListener('load', () => {
    console.log("Window loaded.");
    isWindowLoaded = true;
    checkAndHideLoadingScreen();
});


// --- Map and Game World Setup ---
// Map variable is declared globally in gameWorld.js
let baseItemsForShop = { consumables: {}, equipment: {} };
let gameShop = null;

function prepareBaseItemsForShop() {
    console.log("Preparing base items for shop...");
    if (typeof itemsDatabase !== 'undefined') {
        itemsDatabase.forEach((item, id) => {
            if (item.itemType === ItemType.CONSUMABLE) {
                baseItemsForShop.consumables[id] = { ...item, price: item.price || 50 };
            }
        });
    } else { console.error("itemsDatabase not found!"); }

    if (typeof equipmentDatabase !== 'undefined') {
        equipmentDatabase.forEach((item, id) => {
            const type = item.equipmentType;
            if (!baseItemsForShop.equipment[type]) baseItemsForShop.equipment[type] = [];
            baseItemsForShop.equipment[type].push({ ...item });
        });
    } else { console.error("equipmentDatabase not found!"); }
    console.log("Base items prepared:", baseItemsForShop);

    if (typeof Shop !== 'undefined') {
        gameShop = new Shop("General Store", baseItemsForShop);
        console.log("Global gameShop instantiated.");
    } else { console.error("Shop class not found!"); }
}

// 2. Start the game initialization process *after* the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing map and game...");

    // --- Sound Toggle Listener ---
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        // Initial state is set in audioPreloadPromise.finally
        soundToggle.addEventListener('change', () => {
            isSoundEnabled = soundToggle.checked;
            console.log(`Sound toggled: ${isSoundEnabled}`);
            if (isSoundEnabled) {
                // Directly attempt playback when toggled ON.
                // playBgm() handles checks for audio readiness and errors.
                playBgm();
            } else {
                stopBgm();
                // Stop battle sounds
                battleSounds.forEach(sound => {
                    if (!sound.paused) {
                        sound.pause();
                        sound.currentTime = 0;
                    }
                });
            }
        });
    } else { console.warn("Sound toggle checkbox not found!"); }

    // --- Initialize Map Object ---
    map = L.map('map', {
        attributionControl: false,
        zoomControl: false
    }).setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
    console.log("Map initialized.");

    // --- Initialize Layers ---
    baseLayer = L.layerGroup().addTo(map);
    businessLayer = L.layerGroup().addTo(map);
    enemyLayer = L.layerGroup().addTo(map);
    cashDropLayer = L.layerGroup().addTo(map);
    rivalLayer = L.layerGroup().addTo(map);
    console.log("Feature layers initialized.");

    // --- Attach Map Event Listeners ---
    // Attach popup listener here AFTER map is initialized and uiManager.js (with the function) is loaded
    if (map && typeof handlePopupOpenForActions === 'function') {
        map.on('popupopen', handlePopupOpenForActions);
        console.log("Map popup listener attached in initialization.js.");
    } else {
        console.error("Could not attach map popup listener in initialization.js: map or handlePopupOpenForActions not ready.");
        // Consider adding a fallback or retry mechanism if this proves unreliable
    }
    map.on('moveend', async function() {
        if (!map || typeof fetchBasesInBounds !== 'function' /* add other checks */) {
            console.warn("Map 'moveend': Map or required functions not ready."); return;
        }
        const bounds = map.getBounds();
        console.log("Map moved, fetching data for bounds:", bounds);
        try {
            const basesInView = await fetchBasesInBounds(bounds); displayBases(basesInView);
            const businessesInView = await fetchBusinessesInBounds(bounds); displayBusinesses(businessesInView);
            updateBusinessMarkers();
            if (currentUserLocation) updateMarkersVisibility(currentUserLocation.lat, currentUserLocation.lon);
        } catch (error) { console.error("Error during map 'moveend':", error); }
    });
    console.log("Map listeners attached.");

    // --- Define the main game initialization function ---
    async function initializeGame() {
        console.log("Running initializeGame...");
        let initialLat = 51.505, initialLon = -0.09;
        let locationPermissionGranted = false;

        // --- Location Fetching ---
        if (navigator.geolocation && navigator.permissions) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                console.log("Geolocation permission:", permissionStatus.state);
                locationPermissionGranted = (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt');
                if (permissionStatus.state === 'denied') showCustomAlert("Location access denied. Using default.");
                permissionStatus.onchange = () => { locationPermissionGranted = (permissionStatus.state === 'granted'); };
            } catch (error) { console.error("Error checking geolocation permission:", error); }

            if (locationPermissionGranted) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
                    });
                    initialLat = position.coords.latitude; initialLon = position.coords.longitude;
                    currentUserLocation = { lat: initialLat, lon: initialLon };
                    console.log("Geolocation successful:", currentUserLocation);
                    map.setView([initialLat, initialLon], 16);
                    locationPermissionGranted = true; // Confirm granted
                } catch (error) {
                    console.warn("Geolocation failed. Using default.", error.message);
                    currentUserLocation = { lat: initialLat, lon: initialLon }; map.setView([initialLat, initialLon], 13);
                    locationPermissionGranted = false;
                }
            } else { currentUserLocation = { lat: initialLat, lon: initialLon }; map.setView([initialLat, initialLon], 13); }
        } else { console.warn("Geolocation/Permissions API not supported. Using default."); currentUserLocation = { lat: initialLat, lon: initialLon }; map.setView([initialLat, initialLon], 13); }

        // --- Player Marker ---
        const playerIcon = L.divIcon({ html: '<div class="player-sprite walk-down"></div>', className: 'player-marker', iconSize: [64, 64], iconAnchor: [32, 32] });
        const popupText = locationPermissionGranted ? 'You are here!' : 'Default location.';
        // Check if userMarker exists and is potentially null (from gameWorld.js)
        if (typeof userMarker === 'undefined' || userMarker === null) {
             console.log("Creating new user marker.");
             userMarker = L.marker([initialLat, initialLon], { icon: playerIcon }).addTo(map).bindPopup(popupText);
        } else {
             console.log("Updating existing user marker.");
             userMarker.setLatLng([initialLat, initialLon]).setPopupContent(popupText).setIcon(playerIcon);
        }
        userMarker.openPopup();
        console.log("Player marker created/updated.");

        // --- Prepare Shop Items ---
        prepareBaseItemsForShop();

        // --- Signal Location Done ---
        console.log("Initial location attempt finished.");
        isInitialLocationDone = true;
        checkAndHideLoadingScreen();

        // --- Post-Location Setup ---
        console.log("Spawning initial items/entities...");
        spawnCashDrops(initialLat, initialLon);
        spawnRivals(initialLat, initialLon);
        await findAndJoinInitialOrganization(initialLat, initialLon);
        const initialBounds = map.getBounds();
        const initialBusinesses = await fetchBusinessesInBounds(initialBounds); displayBusinesses(initialBusinesses);
        updateBusinessMarkers();
        // REMOVED: spawnEnemies(10, initialLat, initialLon, 0.008, enemyLayer);
        startEnemyMovement(3000); // Start general enemy movement
        startAssociateProximityChecks(); // Start the new associate management logic
        if (currentUserLocation) updateMarkersVisibility(currentUserLocation.lat, currentUserLocation.lon);
        console.log("Initial setup and proximity checks started.");

        // --- Position Watching ---
        if (locationPermissionGranted && navigator.geolocation.watchPosition) {
            let lastPos = null;
            navigator.geolocation.watchPosition(
                position => {
                    const lat = position.coords.latitude, lon = position.coords.longitude;
                    const newPos = { lat, lon };
                    if (userMarker) userMarker.setLatLng([lat, lon]);
                    if (lastPos && userMarker) { /* Update sprite direction based on dLat/dLon */
                        const dLat = newPos.lat - lastPos.lat, dLon = newPos.lon - lastPos.lon;
                        const absLat = Math.abs(dLat), absLon = Math.abs(dLon);
                        const spriteElement = userMarker.getElement()?.querySelector('.player-sprite');
                        if (spriteElement) {
                            spriteElement.classList.remove('walk-up', 'walk-down', 'walk-left', 'walk-right');
                            if (absLat > absLon) spriteElement.classList.add(dLat > 0 ? 'walk-up' : 'walk-down');
                            else if (absLon > absLat) spriteElement.classList.add(dLon > 0 ? 'walk-right' : 'walk-left');
                            else spriteElement.classList.add('walk-down'); // Default
                        }
                    }
                    currentUserLocation = newPos; lastPos = newPos;
                    updateMarkersVisibility(lat, lon);
                },
                error => { console.error("Error watching position:", error.message); },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else { console.log("Position watching disabled."); }

        // --- HP Regen ---
        startHpRegeneration();
        console.log("initializeGame setup complete.");
    } // <<< End of initializeGame function definition

    // --- Call Initialization ---
    console.log("Starting core game initialization...");
    initializeGame().catch(error => {
        console.error("Error during initializeGame execution:", error);
        if (!isInitialLocationDone) { isInitialLocationDone = true; checkAndHideLoadingScreen(); }
    });
});
