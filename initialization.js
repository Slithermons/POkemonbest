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
    const soundToggle = document.getElementById('sound-toggle'); // Keep this declaration
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

        // --- Show "How to Play" Modal on First Load ---
        if (typeof openHowToPlayModal === 'function') {
            const hasSeen = localStorage.getItem('hasSeenHowToPlay');
            if (!hasSeen) {
                openHowToPlayModal();
                localStorage.setItem('hasSeenHowToPlay', 'true');
                console.log("Showing 'How to Play' modal for the first time.");
            } else {
                console.log("User has seen 'How to Play' modal before.");
            }
        } else {
            console.warn("openHowToPlayModal function not found, cannot show modal.");
        }
        // --- End How to Play ---

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
document.addEventListener('DOMContentLoaded', async () => { // Made async
    console.log("DOM fully loaded. Checking authentication...");

    // --- Cardano Wallet Authentication Check ---
    const playerStakeAddress = localStorage.getItem('playerCardanoStakeAddress');
    if (!playerStakeAddress) {
        console.log("No Cardano stake address found in localStorage. Redirecting to login.");
        window.location.href = 'login.html'; // Redirect to login page
        return; // Stop further initialization on this page
    } else {
        console.log(`Cardano user authenticated. Stake Address: ${playerStakeAddress}`);
        // --- Set the global window.currentPlayerId ---
        // Ensure it's accessible globally, especially for saveGame.js
        window.currentPlayerId = playerStakeAddress;
        console.log(`Global window.currentPlayerId set to: ${window.currentPlayerId}`);
        // --- End Set currentPlayerId ---
    }
    // --- End Authentication Check ---

    // --- Initialize Supabase Client FIRST ---
    if (typeof SaveManager !== 'undefined' && typeof SaveManager.initializeSupabase === 'function') {
        SaveManager.initializeSupabase(); // Initialize Supabase client early
    } else {
        console.error("SaveManager or initializeSupabase not found! Supabase integration might fail.");
    }

    // --- REMOVED Guest-to-Wallet Linking Logic ---

    console.log("Authentication successful. Initializing map and game...");

    // --- Load Daily Limits ---
    if (typeof loadDailyRemovalLimit === 'function') {
        loadDailyRemovalLimit(); // Load protection removal limits from localStorage
    } else {
        console.error("loadDailyRemovalLimit function not found! Daily limits may not work correctly.");
    }

    // --- Sound Toggle Listener ---
    const soundToggleElement = document.getElementById('sound-toggle'); // Get the element
    if (soundToggleElement) {
        // Initial state is set in audioPreloadPromise.finally
        soundToggleElement.addEventListener('change', () => {
            isSoundEnabled = soundToggleElement.checked; // Use the correct element variable
            console.log(`Sound toggled: ${isSoundEnabled}`);
            if (isSoundEnabled) {
                playBgm();
            } else {
                stopBgm();
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

    // --- Debounced Map Move Handler ---
    let mapMoveTimeout = null;
    const DEBOUNCE_DELAY = 1000; // 1 second delay

    async function handleMapMoveEnd() {
        if (!map || typeof fetchBasesInBounds !== 'function' || typeof fetchBusinessesInBounds !== 'function' || typeof updateBusinessMarkers !== 'function' || typeof updateMarkersVisibility !== 'function') {
            console.warn("Map 'moveend' handler: Map or required functions not ready.");
            return;
        }
        const bounds = map.getBounds();
        console.log("Map finished moving. Fetching data for bounds:", bounds);
        try {
            // Fetch in parallel? Might still hit rate limits. Fetch sequentially for now.
            const basesInView = await fetchBasesInBounds(bounds);
            displayBases(basesInView); // Display new bases

            const businessesInView = await fetchBusinessesInBounds(bounds);
            displayBusinesses(businessesInView); // Display new businesses

            updateBusinessMarkers(); // Update all markers based on current state
            if (currentUserLocation) updateMarkersVisibility(currentUserLocation.lat, currentUserLocation.lon); // Update visibility
        } catch (error) {
            console.error("Error during debounced map 'moveend' data fetch:", error);
        }
    }

    map.on('moveend', function() {
        console.log("Map 'moveend' event triggered. Setting debounce timer...");
        if (mapMoveTimeout) {
            clearTimeout(mapMoveTimeout); // Clear existing timeout
        }
        mapMoveTimeout = setTimeout(handleMapMoveEnd, DEBOUNCE_DELAY); // Set new timeout
    });
    // --- End Debounced Map Move Handler ---

    console.log("Map listeners attached.");

    // --- Define the main game initialization function ---
    async function initializeGame() {
        console.log("Running initializeGame...");

        // --- Load Game State ---
        let loadedGameState = null;
        let loadErrorOccurred = false; // Flag for load errors

        // REMOVED check for linkedGuestState
        if (typeof SaveManager !== 'undefined' && typeof SaveManager.loadGame === 'function') {
            // Perform the normal load process (local or Supabase)
            console.log("Performing standard game load (local or Supabase)...");
            try {
                loadedGameState = await SaveManager.loadGame();
            } catch (error) {
                console.error("Error during SaveManager.loadGame():", error);
                loadErrorOccurred = true;
            }
        } else {
            console.error("SaveManager or loadGame not found! Cannot load saved data.");
            loadErrorOccurred = true;
        }

        // If loading failed or returned null/undefined, use default state
        if (loadErrorOccurred || !loadedGameState) {
            console.warn("Loading failed or returned no state. Using default game state.");
            loadedGameState = getDefaultGameState(); // Assuming getDefaultGameState is defined or accessible
            // Try to get player ID if possible and add it to the default state
            const playerId = localStorage.getItem('playerCardanoStakeAddress');
            if (playerId && loadedGameState.player) {
                loadedGameState.player.id = playerId;
            }
        }

        // Apply loaded/default state to the global gameState
        if (typeof gameState !== 'undefined') {
             Object.assign(gameState, loadedGameState); // Merge loaded/default state into global state
             console.log("Loaded/Default game state applied:", gameState);

             // --- Apply Loaded Player State to Global Variables ---
             // Ensure global variables in gameWorld.js are updated from the loaded state
             const loadedPlayer = loadedGameState.player;
             if (loadedPlayer) { // Check if player object exists
                 if (typeof playerCurrentHp !== 'undefined' && loadedPlayer.hp !== undefined) {
                     playerCurrentHp = loadedPlayer.hp;
                     console.log(`Applied loaded HP to global variable: ${playerCurrentHp}`);
                 }
                 if (typeof playerMaxHp !== 'undefined' && loadedPlayer.maxHp !== undefined) {
                     // Option 1: Use saved maxHp directly (if saved)
                     // playerMaxHp = loadedPlayer.maxHp;
                     // Option 2: Recalculate based on loaded stats (safer if maxHp depends on stats/level)
                     if (typeof calculateMaxHp === 'function' && loadedPlayer.stats && loadedPlayer.level !== undefined) {
                         playerMaxHp = calculateMaxHp(loadedPlayer.level, loadedPlayer.stats.vitality);
                         console.log(`Recalculated Max HP based on loaded state: ${playerMaxHp}`);
                     } else {
                         playerMaxHp = loadedPlayer.maxHp || 100; // Fallback
                         console.log(`Applied loaded Max HP directly (or fallback): ${playerMaxHp}`);
                     }
                 }
                 if (typeof playerInventory !== 'undefined' && Array.isArray(loadedPlayer.inventory)) {
                     // Replace the entire inventory array
                     playerInventory.length = 0; // Clear existing array first
                     playerInventory.push(...loadedPlayer.inventory); // Add items from loaded state
                     console.log(`Applied loaded inventory to global variable. Count: ${playerInventory.length}`);
                 }
                 if (typeof playerEquipment !== 'undefined' && typeof loadedPlayer.equipment === 'object' && loadedPlayer.equipment !== null) {
                     // Replace the equipment object
                     Object.keys(playerEquipment).forEach(key => delete playerEquipment[key]); // Clear existing
                     Object.assign(playerEquipment, loadedPlayer.equipment); // Assign loaded equipment
                     console.log(`Applied loaded equipment to global variable:`, playerEquipment);
                 }
                 if (typeof playerStats !== 'undefined' && typeof loadedPlayer.stats === 'object' && loadedPlayer.stats !== null) {
                     Object.assign(playerStats, loadedPlayer.stats); // Merge loaded stats
                     console.log(`Applied loaded stats to global variable:`, playerStats);
                 }
                 if (typeof playerLevel !== 'undefined' && loadedPlayer.level !== undefined) {
                     playerLevel = loadedPlayer.level;
                     console.log(`Applied loaded level to global variable: ${playerLevel}`);
                 }
                 if (typeof playerExperience !== 'undefined' && loadedPlayer.experience !== undefined) {
                     playerExperience = loadedPlayer.experience;
                     console.log(`Applied loaded experience to global variable: ${playerExperience}`);
                 }
                 if (typeof playerAlias !== 'undefined' && loadedPlayer.alias !== undefined) {
                     playerAlias = loadedPlayer.alias;
                     console.log(`Applied loaded alias to global variable: ${playerAlias}`);
                 }
                 if (typeof playerUsername !== 'undefined' && loadedPlayer.username !== undefined) {
                     playerUsername = loadedPlayer.username;
                     console.log(`Applied loaded username to global variable: ${playerUsername}`);
                 }
                 if (typeof playerPower !== 'undefined' && loadedPlayer.power !== undefined) {
                     playerPower = loadedPlayer.power;
                     console.log(`Applied loaded power to global variable: ${playerPower}`);
                 }
                 // Apply cash separately below to ensure UI update happens
                 // Apply organization separately below to ensure UI update happens

                 // Recalculate derived stats after applying base stats/equipment
                 if (typeof calculateCharacterStats === 'function') {
                     calculateCharacterStats();
                     console.log("Recalculated character stats after applying loaded state.");
                 }
             } else {
                 console.error("Loaded game state is missing the 'player' object!");
             }
             // --- End Apply Loaded Player State ---

        } else {
             console.warn("Global gameState object not found. Loaded state not applied globally.");
        }


        // Use loaded state or defaults (currentPlayerState now reflects the applied loaded data if successful)
        const currentPlayerState = (typeof gameState !== 'undefined' && gameState.player) ? gameState.player : getDefaultGameState().player; // Fallback needed if gameState isn't defined globally
        const currentSettings = (typeof gameState !== 'undefined' && gameState.settings) ? gameState.settings : getDefaultGameState().settings;

        // --- Apply Loaded Cash & Org (with UI updates) ---
        if (typeof currentCash !== 'undefined' && currentPlayerState.cash !== undefined) {
             currentCash = currentPlayerState.cash; // Explicitly set global cash
             console.log(`Applied loaded cash to global variable: ${currentCash}`);
             if (typeof updateCashUI === 'function') {
                 updateCashUI(currentCash); // Update UI
             } else {
                 console.error("updateCashUI function not found during game initialization!");
             }
        }
        if (typeof currentUserOrganization !== 'undefined' && currentPlayerState.organization !== undefined) {
            currentUserOrganization = currentPlayerState.organization; // Update global org object
            console.log(`Applied loaded organization to global variable:`, currentUserOrganization);
        }
        if (typeof currentOrganizationBaseLocation !== 'undefined' && currentPlayerState.orgBaseLocation !== undefined) {
            currentOrganizationBaseLocation = currentPlayerState.orgBaseLocation; // Update global org base location
            console.log(`Applied loaded org base location to global variable:`, currentOrganizationBaseLocation);
        }
        if (typeof updateOrganizationUI === 'function') {
            updateOrganizationUI(); // Update Org UI after applying state
        } else {
            console.error("updateOrganizationUI function not found during game initialization!");
        }
        // --- End Apply Loaded Cash & Org ---


        let initialLat = 51.505, initialLon = -0.09; // Default location
        let locationPermissionGranted = false;

        // --- Apply Loaded Settings ---
        isSoundEnabled = currentSettings.soundOn;
        const soundToggleElementApply = document.getElementById('sound-toggle'); // Get element again here
        if (soundToggleElementApply) soundToggleElementApply.checked = isSoundEnabled; // Use the correct element variable
        console.log(`Initial sound state set from loaded/default: ${isSoundEnabled}`);
        // REMOVED: Automatic BGM play attempt on load. Rely on toggle interaction.
        // audioPreloadPromise.finally(() => {
        //     if (isSoundEnabled) {
        //         playBgm();
        //     } else {
        //         stopBgm();
        //     }
        // });


        // --- Location Setup (Default View) ---
        // Set map view to default initially. Centering and marker update will happen on user request.
        // Assign to existing variables declared earlier in initializeGame scope
        initialLat = 51.505; initialLon = -0.09; // Default location
        currentUserLocation = { lat: initialLat, lon: initialLon }; // Set global default
        map.setView([initialLat, initialLon], 17); // Set default view (Zoomed in)
        console.log("Map view set to default location.");

        // --- Player Marker (Initial Placement at Default) ---
        const playerIcon = L.divIcon({ html: '<div class="player-sprite walk-down"></div>', className: 'player-marker', iconSize: [64, 64], iconAnchor: [32, 32] });
        const popupText = 'Default location. Click "Find Me" to update.';
        // Check if userMarker exists (declared in gameWorld.js)
        if (typeof userMarker === 'undefined' || userMarker === null) {
             console.log("Creating new user marker at default location.");
             userMarker = L.marker([initialLat, initialLon], { icon: playerIcon }).addTo(map).bindPopup(popupText);
        } else {
             console.log("Updating existing user marker to default location.");
             userMarker.setLatLng([initialLat, initialLon]).setPopupContent(popupText).setIcon(playerIcon);
        }
        // Don't open popup automatically userMarker.openPopup();
        console.log("Player marker created/updated at default location.");
        // --- End Initial Location/Marker Setup ---

        // --- Apply Loaded Player State to UI/Game ---
        // (Requires uiManager.js and gameWorld.js to be loaded)
        // Call specific UI update functions since updatePlayerUI is missing
        console.log("Calling specific UI update functions after loading state...");
        if (typeof updateHpUI === 'function') {
            updateHpUI(); // Updates HP bar based on global playerCurrentHp/playerMaxHp
        } else { console.warn("updateHpUI function not found."); }

        if (typeof updateCashUI === 'function') {
            updateCashUI(currentCash); // Updates cash display based on global currentCash
        } else { console.warn("updateCashUI function not found."); }

        if (typeof updateOrganizationUI === 'function') {
            updateOrganizationUI(); // Updates org display based on global currentUserOrganization
        } else { console.warn("updateOrganizationUI function not found."); }

        if (typeof updateExperienceUI === 'function') {
             updateExperienceUI(); // Updates level/exp display based on global playerLevel/playerExperience
        } else { console.warn("updateExperienceUI function not found."); }

        // Update bottom bar alias directly (already loaded into playerAlias global var)
        const aliasBarElement = document.getElementById('player-alias-bar');
        if (aliasBarElement) {
            aliasBarElement.textContent = playerAlias || 'Alias';
        } else { console.warn("player-alias-bar element not found."); }

        // updateInventoryUI and updateEquipmentUI are called later in initializeGame after finding location/joining org
        // if (typeof updateInventoryUI === 'function') {
        //    updateInventoryUI(currentPlayerState.inventory); // Update inventory modal
        // } else { console.warn("updateInventoryUI function not found."); } // Removed orphaned else

        if (typeof updateEquipmentUI === 'function') {
            updateEquipmentUI(currentPlayerState.equipment); // Update equipment modal/slots
        } else { console.warn("updateEquipmentUI function not found."); }

        // Update other game logic variables if needed (e.g., in gameWorld.js)
        // Example: if (typeof gameWorld !== 'undefined') gameWorld.player = currentPlayerState;


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
        const initialBusinesses = await fetchBusinessesInBounds(initialBounds);
        displayBusinesses(initialBusinesses); // Display fetched businesses first

        // --- Apply Loaded Business State AFTER initial fetch/display ---
        if (typeof applyLoadedBusinessState === 'function') {
            applyLoadedBusinessState(); // Now merge saved state (protection, etc.)
        } else {
            console.error("applyLoadedBusinessState function not found! Saved business state cannot be applied.");
        }
        // --- End Apply Loaded Business State ---

        updateBusinessMarkers(); // Update markers based on potentially merged state
        // REMOVED: spawnEnemies(10, initialLat, initialLon, 0.008, enemyLayer);
        startEnemyMovement(3000); // Start general enemy movement
        startAssociateProximityChecks(); // Start the new associate management logic
        if (currentUserLocation) updateMarkersVisibility(currentUserLocation.lat, currentUserLocation.lon);
        console.log("Initial setup and proximity checks started.");

        // --- Position Watching (Moved to requestAndWatchLocation) ---
        // The watchPosition logic is now started *after* a successful getCurrentPosition
        // triggered by the user clicking the "Find Me" button.
        console.log("Position watching will start upon user request.");

        // --- HP Regen ---
        startHpRegeneration(); // Start HP regen regardless of location state

        // --- Location Request Function (To be called by user action) ---
        async function requestAndWatchLocation() {
            console.log("User requested location...");
            let localInitialLat = 51.505, localInitialLon = -0.09; // Default within function scope
            let localLocationPermissionGranted = false;

            // Disable button temporarily to prevent spamming
            const locateButton = document.getElementById('locate-me-button');
            if (locateButton) locateButton.disabled = true;


            if (navigator.geolocation && navigator.permissions) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                    console.log("Geolocation permission:", permissionStatus.state);
                    localLocationPermissionGranted = (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt');

                    if (permissionStatus.state === 'denied') {
                        showCustomAlert("Location access denied by browser settings. Please enable location access for this site.");
                        if (locateButton) locateButton.disabled = false; // Re-enable button
                        return; // Stop if denied
                    }
                    // Re-check permission on change (useful if user grants it after initial denial)
                    permissionStatus.onchange = () => {
                         console.log("Geolocation permission state changed to:", permissionStatus.state);
                         localLocationPermissionGranted = (permissionStatus.state === 'granted');
                         // Potentially re-trigger or update UI based on new state
                    };

                    if (localLocationPermissionGranted) {
                        try {
                            console.log("Attempting to get current position...");
                            showCustomAlert("Requesting location...", 'info', 3000); // Inform user
                            const position = await new Promise((resolve, reject) => {
                                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
                            });
                            localInitialLat = position.coords.latitude;
                            localInitialLon = position.coords.longitude;
                            currentUserLocation = { lat: localInitialLat, lon: localInitialLon }; // Update global
                            console.log("Geolocation successful:", currentUserLocation);
                            map.setView([localInitialLat, localInitialLon], 17); // Center map (Zoomed in)
                            if (userMarker) { // Update existing marker
                                userMarker.setLatLng([localInitialLat, localInitialLon]).setPopupContent('You are here!').openPopup();
                            }
                            localLocationPermissionGranted = true; // Confirm granted
                            showCustomAlert("Location updated!", 'success', 3000);

                            // --- Start Position Watching ONLY after successful getCurrentPosition ---
                            if (navigator.geolocation.watchPosition) {
                                console.log("Starting position watching...");
                                let lastPos = currentUserLocation; // Initialize with current location
                                // TODO: Store watch ID to potentially clear it later if needed
                                navigator.geolocation.watchPosition(
                                    watchPos => {
                                        const lat = watchPos.coords.latitude, lon = watchPos.coords.longitude;
                                        const newPos = { lat, lon };
                                        if (userMarker) userMarker.setLatLng([lat, lon]);
                                        if (lastPos && userMarker) { // Update sprite direction
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
                                        currentUserLocation = newPos; // Update global
                                        lastPos = newPos;
                                        updateMarkersVisibility(lat, lon); // Update visibility based on new location
                                    },
                                    error => { console.error("Error watching position:", error.message); },
                                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                                );
                            } else { console.log("Position watching not supported/enabled."); }
                            // --- End Position Watching ---

                        } catch (error) {
                            console.warn("Geolocation failed:", error.message);
                            showCustomAlert(`Could not get location: ${error.message}. Map remains centered on default.`);
                            // Keep map at default, currentUserLocation might still be default
                            localLocationPermissionGranted = false;
                        }
                    } else {
                         // This case should ideally be handled by the 'denied' check above,
                         // but added for robustness if permission is 'prompt' and user denies.
                         showCustomAlert("Location permission was not granted.");
                    }
                } catch (error) {
                    console.error("Error checking geolocation permission:", error);
                    showCustomAlert("Could not check location permissions.");
                } finally {
                     if (locateButton) locateButton.disabled = false; // Re-enable button in all cases
                }
            } else {
                console.warn("Geolocation/Permissions API not supported.");
                showCustomAlert("Geolocation is not supported by your browser.");
                 if (locateButton) locateButton.disabled = false; // Re-enable button
            }
        } // --- End of requestAndWatchLocation function ---


        console.log("initializeGame setup complete.");
    } // <<< End of initializeGame function definition


    // --- Add Event Listener for the Locate Button ---
    const locateButton = document.getElementById('locate-me-button');
    if (locateButton) {
        // Correctly call the function designed to handle location requests on click
        locateButton.addEventListener('click', requestAndWatchLocation);
        console.log("Event listener added for locate-me-button to call requestAndWatchLocation.");
    } else {
        console.warn("Could not find #locate-me-button to attach listener.");
    }
    // --- End Locate Button Listener ---


    // --- Call Initialization ---
    console.log("Starting core game initialization...");
    initializeGame().catch(error => {
        console.error("Error during initializeGame execution:", error);
        // Ensure loading screen hides even if init fails partially
        if (!isInitialLocationDone) { isInitialLocationDone = true; }
        checkAndHideLoadingScreen();
    });
});


// --- Helper: Get Default Game State (Example Structure) ---
// Ensure this function exists or is defined if used as a fallback
function getDefaultGameState() {
    console.log("Providing default game state.");
    // Make sure this structure matches your actual expected gameState structure
    return {
        player: {
            id: localStorage.getItem('playerCardanoStakeAddress') || 'default-player', // Try to get ID
            hp: 100,
            maxHp: 100,
            cash: 50,
            level: 1,
            experience: 0,
            stats: { strength: 5, agility: 5, vitality: 5, charisma: 5 },
            inventory: [],
            equipment: { head: null, body: null, weapon: null, mask: null },
            organization: null,
            orgBaseLocation: null,
            alias: 'Newcomer',
            username: 'Player',
            power: 10
            // Add other necessary default player fields
        },
        settings: {
            soundOn: true
            // Add other default settings
        },
        businesses: {}, // Example structure
        // Add other top-level state sections
    };
}
