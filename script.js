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
let hideScreenTimeout = null; // To store the timeout for hiding the screen

// Function to check all conditions and hide the loading screen
function checkAndHideLoadingScreen() {
    // Only proceed if both flags are true
    if (!isWindowLoaded || !isInitialLocationDone) {
        // console.log(`Check failed: isWindowLoaded=${isWindowLoaded}, isInitialLocationDone=${isInitialLocationDone}`);
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


let currentUserLocation = null; // Variable to store user's current location
let userMarker = null; // Variable to store the marker for the user's location
let baseLayer = L.layerGroup().addTo(map); // Layer group to hold base markers
let fetchedBounds = null; // Keep track of areas where bases have been fetched

// Function to calculate distance between two lat/lon points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in meters
    return distance;
}

// --- Item & Weapon Definitions ---
const items = {
    medkit: { name: "Medkit", description: "Restores some health.", type: "consumable", effect: { health: 50 } },
    lockpick: { name: "Lockpick", description: "May bypass certain obstacles.", type: "tool" }
};

const weapons = {
    pistol: { name: "Pistol", description: "Basic firearm.", type: "firearm", damage: 10, ammo: 6 }
};

// --- Player State ---
let playerHealth = 100; // Example player health
let playerInventory = []; // Array to hold item/weapon objects possessed by the player
let currentPlayerId = 'player123'; // Example unique player ID
let currentPlayerPower = 75; // Example player power level
let playerUsername = ''; // Variable for username
let playerAlias = ''; // Variable for alias
// Example: playerInventory = [ { id: 'medkit', quantity: 1 }, { id: 'pistol', ammo: 6 } ];

// --- Cash Drop Data and Spawning ---
const cashDropData = { name: 'Cash Drop', minAmount: 50, maxAmount: 500 };

// --- Dashboard and Collection Logic ---
let currentCash = 0;
const cashAmountElement = document.getElementById('cash-amount'); // Updated ID
const MANUAL_JOIN_DISTANCE = 2000; // Max distance in meters to MANUALLY join an organization by clicking
const AUTO_JOIN_SEARCH_RADIUS = 10000; // Initial search radius in meters for auto-joining
let currentUserOrganization = null; // Variable to store the user's current organization
const userOrganizationElement = document.getElementById('user-organization'); // Get dashboard element (Updated ID)
const leaveOrganizationButton = document.getElementById('leave-organization-button'); // Get leave button element (Updated ID)
// Cooldown variables removed
let basesCache = {}; // Cache found bases {id: baseInfo}
let displayedBaseIds = new Set(); // Keep track of displayed base IDs to avoid duplicates
let businessLayer = L.layerGroup().addTo(map); // Layer group for businesses
let businessesCache = {}; // Cache found businesses {id: businessInfo}
let displayedBusinessIds = new Set(); // Keep track of displayed business IDs
let currentOrganizationBaseLocation = null; // Store the LatLon of the joined org's base
const TERRITORY_RADIUS = 2000; // 2km radius for territory control (used for profit collection)
const PROTECTION_ACTIVATION_RANGE = 2000; // 2km radius for activating protection
const MAX_PROTECTING_USERS = 10; // Max users per org protecting a business
let enemyLayer = L.layerGroup().addTo(map); // Layer group for enemies
const protectionBookElement = document.getElementById('protection-book'); // Get protection book container
const controlledBusinessesListElement = document.getElementById('controlled-businesses-list'); // Get list element
const inventoryListElement = document.getElementById('inventory-list'); // Get inventory list element
const usernameInput = document.getElementById('username-input'); // Get username input
const aliasInput = document.getElementById('alias-input'); // Get alias input
const saveUserInfoBtn = document.getElementById('save-user-info-btn'); // Get save button

// --- User Info Management ---

function saveUserInfo() {
    playerUsername = usernameInput.value.trim();
    playerAlias = aliasInput.value.trim();
    localStorage.setItem('playerUsername', playerUsername);
    localStorage.setItem('playerAlias', playerAlias);
    alert('User info saved!');
    // Re-render protection book in case alias changed
    updateProtectionBookUI();
}

function loadUserInfo() {
    const savedUsername = localStorage.getItem('playerUsername');
    const savedAlias = localStorage.getItem('playerAlias');
    if (savedUsername) {
        playerUsername = savedUsername;
        usernameInput.value = playerUsername;
    }
    if (savedAlias) {
        playerAlias = savedAlias;
        aliasInput.value = playerAlias;
    }
    console.log(`Loaded User Info - Username: ${playerUsername}, Alias: ${playerAlias}`);
}

// --- Inventory Management ---

// Function to update the inventory UI
function updateInventoryUI() {
    if (!inventoryListElement) return;

    inventoryListElement.innerHTML = ''; // Clear current list

    if (playerInventory.length === 0) {
        inventoryListElement.innerHTML = '<li>(Empty)</li>';
        return;
    }

    // Group items by ID for display (e.g., Medkit x2)
    const groupedInventory = playerInventory.reduce((acc, itemEntry) => {
        acc[itemEntry.id] = (acc[itemEntry.id] || 0) + (itemEntry.quantity || 1);
        return acc;
    }, {});

    for (const itemId in groupedInventory) {
        const itemDefinition = items[itemId] || weapons[itemId]; // Check both items and weapons
        if (itemDefinition) {
            const quantity = groupedInventory[itemId];
            const listItem = document.createElement('li');
            listItem.textContent = `${itemDefinition.name}${quantity > 1 ? ` x${quantity}` : ''}`;
            listItem.title = itemDefinition.description; // Add tooltip
            listItem.dataset.itemId = itemId; // Store item ID for potential click actions
            // TODO: Add click listener for item usage
            inventoryListElement.appendChild(listItem);
        }
    }
}

// Function to add an item/weapon to inventory
function addItemToInventory(itemId, quantity = 1) {
    const itemDefinition = items[itemId] || weapons[itemId];
    if (!itemDefinition) {
        console.error(`Attempted to add unknown item: ${itemId}`);
        return;
    }

    // Find existing entry for stackable items
    const existingEntryIndex = playerInventory.findIndex(entry => entry.id === itemId && itemDefinition.type === 'consumable'); // Only stack consumables for now

    if (existingEntryIndex > -1 && itemDefinition.type === 'consumable') {
        playerInventory[existingEntryIndex].quantity = (playerInventory[existingEntryIndex].quantity || 1) + quantity;
    } else {
        // Add new entry
        const newEntry = { id: itemId };
        if (itemDefinition.type === 'consumable') {
            newEntry.quantity = quantity;
        } else if (itemDefinition.type === 'firearm' && itemDefinition.ammo) {
            newEntry.ammo = itemDefinition.ammo; // Add initial ammo for weapons
        }
        playerInventory.push(newEntry);
    }

    console.log(`Added ${quantity}x ${itemDefinition.name} to inventory.`, playerInventory);
    updateInventoryUI(); // Refresh the UI
}


// --- Organization/Base Logic --- (Renamed section)

// Function to generate organization name from church name
function generateOrganizationName(churchName) { // Renamed function
    if (!churchName || churchName.trim() === "") {
        return { fullName: "Unknown Organization", abbreviation: "UNO" }; // Updated default name
    }
    // Simple abbreviation: First letter of first 3 words (or fewer)
    const words = churchName.split(' ').filter(w => w.length > 0);
    const abbreviation = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    return {
        fullName: `${churchName} Organization`, // Updated name format
        abbreviation: abbreviation || "ORG" // Updated fallback abbreviation
    };
}

// Define a base icon (e.g., a building)
const baseIcon = L.icon({
    iconUrl: 'https://img.icons8.com/ios-filled/50/000000/bank.png', // Example bank/building icon
    iconSize: [40, 40],
    iconAnchor: [20, 40], // Point at the bottom center
    popupAnchor: [0, -40],
    className: 'map-icon-darktheme' // Class for CSS filter
});

// Function to fetch bases within specific map bounds
async function fetchBasesInBounds(bounds) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    // Query for churches within the map bounds
     const query = `
        [out:json][timeout:25];
        (
          node["amenity"="place_of_worship"]["religion"="christian"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["amenity"="place_of_worship"]["religion"="christian"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          relation["amenity"="place_of_worship"]["religion"="christian"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
        );
        out center;
    `;
    console.log("Querying Overpass API for bases in bounds:", bounds);
     try {
        const response = await fetch(overpassUrl, { method: 'POST', body: query });
        const data = await response.json();
        console.log("Overpass response received:", data.elements.length, "elements");
        return processOverpassElements(data.elements); // Process and return structured base info
    } catch (error) {
        console.error("Error fetching data from Overpass API:", error);
        alert("Could not fetch nearby bases. The service might be busy.");
        return []; // Return empty array on error
    }
}

// Function to fetch bases within a radius (used for initial auto-join)
async function fetchBasesAroundPoint(lat, lon, radiusMeters) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json][timeout:25];
        (
          node(around:${radiusMeters},${lat},${lon})["amenity"="place_of_worship"]["religion"="christian"];
          way(around:${radiusMeters},${lat},${lon})["amenity"="place_of_worship"]["religion"="christian"];
          relation(around:${radiusMeters},${lat},${lon})["amenity"="place_of_worship"]["religion"="christian"];
        );
        out center;
    `;
    console.log(`Querying Overpass API for bases around [${lat}, ${lon}] within ${radiusMeters}m...`);
    try {
        const response = await fetch(overpassUrl, { method: 'POST', body: query });
        const data = await response.json();
        console.log("Overpass response received:", data.elements.length, "elements");
        return processOverpassElements(data.elements);
    } catch (error) {
        console.error("Error fetching data from Overpass API:", error);
        return [];
    }
}


// Function to process raw Overpass elements into structured base info
function processOverpassElements(elements) {
    const bases = [];
    elements.forEach(element => {
        const name = element.tags?.name || "Unnamed Church";
        let lat, lon;

        if (element.type === "node") {
            lat = element.lat;
            lon = element.lon;
        } else if (element.center) { // For ways/relations, use the center point
            lat = element.center.lat;
            lon = element.center.lon;
        } else {
            return; // Skip if no coordinates found
        }

        const orgInfo = generateOrganizationName(name); // Use renamed function
        const baseInfo = {
            id: element.id,
            name: name, // Church name
            lat: lat,
            lon: lon,
            organizationName: orgInfo.fullName, // Renamed property
            organizationAbbreviation: orgInfo.abbreviation // Renamed property
        };
        basesCache[baseInfo.id] = baseInfo; // Cache the base info
        bases.push(baseInfo);
    });
    return bases;
}

// Function to display base markers on the map
function displayBases(bases) {
    bases.forEach(baseInfo => {
        // Avoid adding duplicate markers if already displayed
        if (displayedBaseIds.has(baseInfo.id)) {
            return;
        }

        const marker = L.marker([baseInfo.lat, baseInfo.lon], { icon: baseIcon })
            .addTo(baseLayer)
             // Updated popup content and button attributes
            .bindPopup(`<b>${baseInfo.organizationName}</b><br>(${baseInfo.name})<br><button class="join-button" data-org-name="${baseInfo.organizationName}" data-org-abbr="${baseInfo.organizationAbbreviation}" data-base-lat="${baseInfo.lat}" data-base-lon="${baseInfo.lon}">Join Organization</button>`);

        displayedBaseIds.add(baseInfo.id); // Mark as displayed
    });

    // Ensure the popup listener is attached (only needs to be done once)
    // This listener is now handled by handlePopupOpenForActions
    // if (!map.listens('popupopen')) { ... }
}


// Function to update the UI based on organization status (Removed cooldown logic)
function updateOrganizationUI() { // Renamed function
    if (currentUserOrganization) {
        userOrganizationElement.textContent = `${currentUserOrganization.name} (${currentUserOrganization.abbreviation})`; // Use renamed variable/element
        leaveOrganizationButton.style.display = 'block'; // Show leave button (use renamed variable)
        updateProtectionBookUI(); // Update and potentially show the book
    } else {
        userOrganizationElement.textContent = 'None'; // Use renamed element
        leaveOrganizationButton.style.display = 'none'; // Hide leave button (use renamed variable)
        protectionBookElement.style.display = 'none'; // Hide protection book
        controlledBusinessesListElement.innerHTML = ''; // Clear book content
    }
}

// Function to handle MANUALLY joining an organization via click (Removed cooldown check)
function joinOrganizationManually(orgName, orgAbbr, baseLat, baseLon) { // Renamed function and parameters
     // Cooldown check removed

     if (!currentUserLocation) {
        alert("Cannot determine your location.");
        return;
    }
    if (currentUserOrganization) { // Use renamed variable
        alert(`You are already in the ${currentUserOrganization.name}.`); // Use renamed variable
        return;
    }

    const distance = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, baseLat, baseLon);
    console.log(`Attempting to manually join ${orgName}. Distance: ${distance.toFixed(1)} meters.`); // Use renamed parameter

    if (distance <= MANUAL_JOIN_DISTANCE) {
        currentUserOrganization = { name: orgName, abbreviation: orgAbbr }; // Use renamed variable and parameters
        currentOrganizationBaseLocation = { lat: baseLat, lon: baseLon }; // *** Store base location ***
        console.log("Manually joined organization. Updating UI and markers.");
        updateOrganizationUI(); // Call renamed function
        updateBusinessMarkers(); // *** Explicitly update business icons/popups ***
        alert(`You have joined the ${orgName}!`); // Use renamed parameter
        // TODO: Persist organization membership & base location
    } else {
         alert(`You are too far away from this base to join ${orgName}! You need to be within ${MANUAL_JOIN_DISTANCE}m. (Distance: ${distance.toFixed(1)}m)`); // Use renamed parameter
    }
}

// Function to automatically find and potentially join the closest organization if none are within manual range (Removed cooldown check)
async function findAndJoinInitialOrganization(userLat, userLon) { // Renamed function
    // Cooldown check removed
     if (currentUserOrganization) return; // Already in an organization (use renamed variable)

    console.log("Searching for initial organization..."); // Updated log message
    const nearbyBases = await fetchBasesAroundPoint(userLat, userLon, AUTO_JOIN_SEARCH_RADIUS);

    if (!nearbyBases || nearbyBases.length === 0) {
        console.log("No bases found within search radius.");
        // Optionally expand search radius here or inform user
        // Update markers even if no bases found, to reflect current state (no org)
        updateBusinessMarkers(); // Ensure UI updates even if no org is joined
        return;
    }

    let closestBase = null;
    let minDistance = Infinity;
    let baseWithinManualRangeExists = false;

    nearbyBases.forEach(base => {
        const distance = calculateDistance(userLat, userLon, base.lat, base.lon);
        base.distance = distance; // Add distance to base info for sorting/checking

        if (distance < minDistance) {
            minDistance = distance;
            closestBase = base;
        }
        if (distance <= MANUAL_JOIN_DISTANCE) {
            baseWithinManualRangeExists = true;
        }
    });

    // Display all found bases regardless
    displayBases(nearbyBases);

    if (!baseWithinManualRangeExists && closestBase) {
        console.log(`No bases within ${MANUAL_JOIN_DISTANCE}m. Automatically joining closest base: ${closestBase.organizationName} at ${minDistance.toFixed(1)}m.`); // Use renamed property
        currentUserOrganization = { name: closestBase.organizationName, abbreviation: closestBase.organizationAbbreviation }; // Use renamed variable and properties
        currentOrganizationBaseLocation = { lat: closestBase.lat, lon: closestBase.lon }; // *** Store base location ***
        console.log("Automatically joined organization. Updating UI and markers.");
        updateOrganizationUI(); // Call renamed function
        updateBusinessMarkers(); // *** Explicitly update business icons/popups ***
        alert(`No organizations found within ${MANUAL_JOIN_DISTANCE}m. You have been automatically assigned to the closest one: ${closestBase.organizationName}.`); // Updated alert message
        // TODO: Persist organization membership & base location
    } else if (baseWithinManualRangeExists) {
         console.log(`Bases found within ${MANUAL_JOIN_DISTANCE}m. User must join manually.`);
         updateOrganizationUI(); // Call renamed function
         // Still update markers even if user needs to join manually, to reflect current state (no org)
         updateBusinessMarkers();
    } else {
        console.log("Could not find any bases to automatically join."); // Updated log message
        // Update markers even if no bases found, to reflect current state (no org)
        updateBusinessMarkers();
    }
}


function collectCash(cashMarker, cashLat, cashLon) {
    if (!currentUserLocation) {
        alert("Cannot determine your location.");
        return;
    }

    const distance = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, cashLat, cashLon);
    console.log(`Attempting to collect cash. Distance: ${distance.toFixed(1)} meters.`);

    // Use MANUAL_JOIN_DISTANCE for cash collection too? Or keep it shorter? Using shorter for now.
    const CASH_COLLECTION_DISTANCE = 50; // Keep cash collection range short
    if (distance <= CASH_COLLECTION_DISTANCE) {
        // Collect the cash
        const amount = Math.floor(Math.random() * (cashDropData.maxAmount - cashDropData.minAmount + 1)) + cashDropData.minAmount;
        currentCash += amount;
        cashAmountElement.textContent = currentCash;
        map.removeLayer(cashMarker); // Remove the collected cash drop

        // Chance to get an item instead of cash
        const ITEM_DROP_CHANCE = 0.2; // 20% chance
        if (Math.random() < ITEM_DROP_CHANCE) {
            // Give a random item (e.g., medkit for now)
            const droppedItemId = 'medkit'; // Example: always drop medkit
            addItemToInventory(droppedItemId);
            alert(`You found a ${items[droppedItemId].name}!`);
        } else {
            // Collect cash
            const amount = Math.floor(Math.random() * (cashDropData.maxAmount - cashDropData.minAmount + 1)) + cashDropData.minAmount;
            currentCash += amount;
            cashAmountElement.textContent = currentCash;
            alert(`You collected $${amount}!`);
            // TODO: Add transaction details to storage if needed
        }
    } else {
        // Too far away
        alert(`You are too far away to collect this cash! (Distance: ${distance.toFixed(1)}m)`);
    }
}

// Spawning Cash Drops
function spawnCashDrops(centerLat, centerLon) {
    const spawnRadius = 0.005; // Approx 500 meters
    const numDrops = 5;

    // Define a cash drop icon (e.g., money bag)
    const cashIcon = L.icon({
        iconUrl: 'https://img.icons8.com/external-flatart-icons-flat-flatarticons/64/000000/external-money-bag-valentines-day-flatart-icons-flat-flatarticons.png', // Example money bag icon
        iconSize: [40, 40], // Adjusted size
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
        className: 'map-icon-darktheme' // Class for CSS filter
    });

    for (let i = 0; i < numDrops; i++) {
        const randomAngle = Math.random() * 2 * Math.PI;
        const randomRadius = Math.random() * spawnRadius;
        const lat = centerLat + randomRadius * Math.cos(randomAngle);
        const lon = centerLon + randomRadius * Math.sin(randomAngle) / Math.cos(centerLat * Math.PI / 180); // Adjust longitude

        const cashLat = lat; // Store drop's specific lat
        const cashLon = lon; // Store drop's specific lon

        const marker = L.marker([cashLat, cashLon], { icon: cashIcon }).addTo(map)
            .bindPopup(`A ${cashDropData.name} is here!`) // Updated popup text
            .on('click', () => {
                // Pass marker and its location to the collect function
                collectCash(marker, cashLat, cashLon);
            });
    }
    console.log(`Spawned ${numDrops} cash drops around [${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}]`);
}

// --- Rival Data and Spawning ---
const rivalData = [
    { name: 'Tony "The Shark" Gambino' },
    { name: 'Vinnie "The Viper" Rossi' },
    { name: 'Silvio "The Ghost" Moretti' }
];

function spawnRivals(centerLat, centerLon) {
    const spawnRadius = 0.008; // Slightly larger radius for rivals
    const numRivals = 3;

     // Define a rival icon (e.g., silhouette or fedora)
    const rivalIcon = L.icon({
        iconUrl: 'https://img.icons8.com/ios-filled/50/000000/user-secret.png', // Example secret user icon
        iconSize: [35, 35],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17],
        className: 'map-icon-darktheme' // Class for CSS filter
    });


    for (let i = 0; i < numRivals; i++) {
        const randomAngle = Math.random() * 2 * Math.PI;
        // Use a different radius range
        const randomRadius = spawnRadius * 0.5 + Math.random() * spawnRadius * 0.5;
        const lat = centerLat + randomRadius * Math.cos(randomAngle);
        const lon = centerLon + randomRadius * Math.sin(randomAngle) / Math.cos(centerLat * Math.PI / 180); // Adjust longitude

        const randomRival = rivalData[Math.floor(Math.random() * rivalData.length)];

        const marker = L.marker([lat, lon], { icon: rivalIcon }).addTo(map) // Use rival icon
            .bindPopup(`${randomRival.name} is nearby...`) // Updated popup
            .on('click', () => {
                // TODO: Implement rival interaction logic (e.g., fight, negotiate)
                alert(`You encountered ${randomRival.name}! Interaction not implemented yet.`);
            });
    }
    console.log(`Spawned ${numRivals} rivals around [${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}]`);
}


// --- Business / Protection Money Logic ---

// Function to handle activating protection on a business
function activateProtection(businessId) {
    const businessInfo = businessesCache[businessId];
    if (!businessInfo) {
        console.error(`Business not found in cache: ${businessId}`);
        return;
    }

    if (!currentUserLocation) {
        alert("Cannot determine your location.");
        return;
    }
    if (!currentUserOrganization) {
        alert("You must be in an organization to protect a business.");
        return;
    }

    // Check 1: Player distance to business
    const distanceToBusiness = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, businessInfo.lat, businessInfo.lon);
    if (distanceToBusiness > PROTECTION_ACTIVATION_RANGE) {
        alert(`You are too far away from ${businessInfo.name} to activate protection. (Need to be within ${PROTECTION_ACTIVATION_RANGE}m, currently ${distanceToBusiness.toFixed(0)}m)`);
        return;
    }

    // Check 2: Is the business already protected by *another* organization?
    if (businessInfo.protectingOrganization && businessInfo.protectingOrganization.abbreviation !== currentUserOrganization.abbreviation) {
        alert(`${businessInfo.name} is already protected by ${businessInfo.protectingOrganization.name}. Contesting not implemented yet.`);
        // TODO: Implement contesting logic here later
        return;
    }

    // Check 3: Is the current player already protecting this business?
    const alreadyProtecting = businessInfo.protectingUsers.some(user => user.userId === currentPlayerId);
    if (alreadyProtecting) {
        alert(`You are already contributing protection to ${businessInfo.name}.`);
        return;
    }

    // Check 4: Is the user limit reached for the *current* organization?
    if (businessInfo.protectingOrganization && businessInfo.protectingOrganization.abbreviation === currentUserOrganization.abbreviation && businessInfo.protectingUsers.length >= MAX_PROTECTING_USERS) {
        alert(`${businessInfo.name} already has the maximum number of protectors (${MAX_PROTECTING_USERS}) from your organization.`);
        return;
    }
     // Check 4b: If no org is protecting yet, ensure limit isn't reached (shouldn't happen if length is 0, but safe check)
     if (!businessInfo.protectingOrganization && businessInfo.protectingUsers.length >= MAX_PROTECTING_USERS) {
         alert(`${businessInfo.name} already has the maximum number of protectors (${MAX_PROTECTING_USERS}).`); // Generic message
         return;
     }


    // --- All checks passed, activate/add protection ---
    console.log(`Activating protection for ${businessInfo.name} by ${currentPlayerId} (Power: ${currentPlayerPower})`);

    // Set protecting organization if it's not already set to the current one
    if (!businessInfo.protectingOrganization || businessInfo.protectingOrganization.abbreviation !== currentUserOrganization.abbreviation) {
        businessInfo.protectingOrganization = { ...currentUserOrganization }; // Store a copy
        // If switching orgs (or first time), clear previous users (shouldn't happen due to check 2, but safe)
        businessInfo.protectingUsers = [];
        businessInfo.protectionPower = 0;
    }

    // Add current player to protectors
    businessInfo.protectingUsers.push({ userId: currentPlayerId, userPower: currentPlayerPower });

    // Recalculate total protection power for this organization
    businessInfo.protectionPower = businessInfo.protectingUsers.reduce((sum, user) => sum + user.userPower, 0);

    alert(`You are now helping protect ${businessInfo.name}! Total Protection Power: ${businessInfo.protectionPower}`);

    // Update the marker and protection book immediately
    updateSingleBusinessMarker(businessId);
    updateProtectionBookUI(); // Refresh book list

    // TODO: Persist protection changes
}

// Function to update the Protection Book UI
function updateProtectionBookUI() {
    if (!currentUserOrganization) {
        protectionBookElement.style.display = 'none';
        controlledBusinessesListElement.innerHTML = '';
        return;
    }

    controlledBusinessesListElement.innerHTML = ''; // Clear existing list
    let controlledCount = 0;
    let totalProtectionPower = 0; // Track total power of controlled businesses

    // Iterate through cached businesses that are currently displayed
    displayedBusinessIds.forEach(id => {
        const businessInfo = businessesCache[id];
        // Check if the business exists and is controlled *for profit* by the current org
        if (businessInfo && businessInfo.isControlled) { // isControlled checks territory radius
            controlledCount++;
            const profit = calculatePotentialProfit(businessInfo);
            const listItem = document.createElement('li');
            listItem.classList.add('controlled-business-item');

            let protectionInfo = '(Unprotected)';
            let protectorAlias = ''; // Variable to hold the alias
            // Check if it's protected by *this* organization
            if (businessInfo.protectingOrganization && businessInfo.protectingOrganization.abbreviation === currentUserOrganization.abbreviation) {
                protectionInfo = `(Power: ${businessInfo.protectionPower})`;
                totalProtectionPower += businessInfo.protectionPower; // Add to total
                // If protected by current org, display the saved alias
                if (playerAlias) {
                    protectorAlias = ` <span class="protector-alias">(${playerAlias})</span>`;
                }
            } else if (businessInfo.protectingOrganization) {
                 protectionInfo = `(Protected by ${businessInfo.protectingOrganization.abbreviation})`; // Show if protected by others
            }


            // Display name, alias (if applicable), profit, and protection status
            listItem.innerHTML = `
                <span class="business-name">${businessInfo.name}${protectorAlias}</span>
                <span class="business-profit">$${profit}</span>
                <span class="business-protection">${protectionInfo}</span>
            `;
            controlledBusinessesListElement.appendChild(listItem);
        }
    });

    // Add a summary line for total protection power?
    if (controlledCount > 0) {
        const summaryItem = document.createElement('li');
        summaryItem.classList.add('protection-summary');
        summaryItem.innerHTML = `<b>Total Protection Power: ${totalProtectionPower}</b>`;
        controlledBusinessesListElement.appendChild(summaryItem); // Add to the end
        protectionBookElement.style.display = 'block'; // Show the book
    } else {
         controlledBusinessesListElement.innerHTML = '<li>No businesses currently controlled.</li>';
         protectionBookElement.style.display = 'block'; // Keep book visible but show empty message
    }
}


// Define business icons
const defaultBusinessIcon = L.icon({ // Icon when no org or outside territory (if no org)
    iconUrl: 'https://img.icons8.com/ios-glyphs/30/000000/shop.png', // Black shop icon
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    className: 'map-icon-darktheme' // Class for CSS filter
});
const allowedBusinessIcon = L.icon({ // Icon for businesses IN player's territory (controlled)
    iconUrl: 'https://img.icons8.com/ios-filled/30/4CAF50/shop.png', // Green shop icon
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
    // No filter needed for colored icons? Or adjust filter? Let's skip for now.
});
const notAllowedBusinessIcon = L.icon({ // Icon for businesses OUTSIDE player's territory (when in an org)
    iconUrl: 'https://img.icons8.com/ios-filled/30/F44336/shop.png', // Red shop icon
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
     // No filter needed for colored icons? Or adjust filter? Let's skip for now.
});


// Function to fetch nearby businesses (shops, restaurants, cafes)
async function fetchBusinessesInBounds(bounds) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    // Query for shops, restaurants, cafes etc.
    const query = `
        [out:json][timeout:25];
        (
          node["shop"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["shop"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          node["amenity"~"restaurant|cafe|fast_food|bar|pub"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["amenity"~"restaurant|cafe|fast_food|bar|pub"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
        );
        out center;
    `;
    console.log("Querying Overpass API for businesses in bounds:", bounds);
    try {
        const response = await fetch(overpassUrl, { method: 'POST', body: query });
        const data = await response.json();
        console.log("Overpass business response received:", data.elements.length, "elements");
        return processBusinessElements(data.elements);
    } catch (error) {
        console.error("Error fetching business data from Overpass API:", error);
        // Don't alert for business errors, could be too frequent
        return [];
    }
}

// Function to process raw Overpass business elements
function processBusinessElements(elements) {
    const businesses = [];
    elements.forEach(element => {
        const tags = element.tags || {};
        const name = tags.name || tags.shop || tags.amenity || "Unnamed Business";
        let lat, lon;

        if (element.type === "node") {
            lat = element.lat;
            lon = element.lon;
        } else if (element.center) {
            lat = element.center.lat;
            lon = element.center.lon;
        } else {
            return;
        }

        // Basic profit potential (can be refined)
        const potential = tags.shop === 'supermarket' ? 100 : (tags.amenity === 'restaurant' ? 75 : 50);

        // Only add to cache if not already present (or update if needed)
        // Check if business already exists in cache before creating a new entry
        if (!businessesCache[element.id]) {
            const businessInfo = {
                id: element.id,
                name: name,
                lat: lat,
                lon: lon,
                type: tags.shop || tags.amenity,
                potential: potential, // Base potential for income
                lastCollected: 0, // Timestamp of last collection
                isControlled: false, // Default to not controlled (for profit)
                marker: null, // Placeholder for marker
                // --- Protection Fields ---
                protectingOrganization: null, // { name: string, abbreviation: string }
                protectionPower: 0,
                protectingUsers: [] // Array of { userId: string, userPower: number }
            };
            businessesCache[businessInfo.id] = businessInfo;
            businesses.push(businessInfo); // Add to the list to be displayed *now*
        } else {
             // If it exists, maybe update potential? For now, just skip adding to the 'businesses' array
             // to avoid duplicate processing by displayBusinesses.
             // console.log(`Business ${element.id} already in cache.`);
        }
    });
    return businesses; // Return only newly processed businesses for displayBusinesses
}

// Function to display business markers, checking territory
function displayBusinesses(businesses) {
     businesses.forEach(businessInfo => {
        // This function now primarily adds *new* markers. Updates are handled by updateBusinessMarkers.
        if (displayedBusinessIds.has(businessInfo.id)) {
            // If ID is already displayed, skip adding a new marker.
            // updateSingleBusinessMarker will handle updates later if needed.
            return;
        }

        // Start with the default icon; updateSingleBusinessMarker will set the correct one later
        let icon = defaultBusinessIcon;
        let popupContent = `<b>${businessInfo.name}</b><br>(${businessInfo.type})`;
        // Initial control check (will be re-checked by updateBusinessMarkers)
        let isControlled = false; // Assume not controlled initially
        if (currentUserOrganization && currentOrganizationBaseLocation) {
            const distanceToBase = calculateDistance(
                businessInfo.lat, businessInfo.lon,
                currentOrganizationBaseLocation.lat, currentOrganizationBaseLocation.lon
            );
            // Initial check to set isControlled flag, but icon is handled by updateSingleBusinessMarker
            if (distanceToBase <= TERRITORY_RADIUS) {
                isControlled = true;
                // Don't set icon here, let updateSingleBusinessMarker handle it
                // icon = allowedBusinessIcon; // Removed this line
                const profit = calculatePotentialProfit(businessInfo); // Calculate initial potential profit
                // Popup content for controlled businesses will be added by updateSingleBusinessMarker
                // popupContent += `<br>Potential Profit: $${profit}<br><button class="collect-button" data-business-id="${businessInfo.id}">Collect Profit</button>`; // Removed this line
            }
            // No need for an else here to set notAllowedBusinessIcon, updateSingleBusinessMarker handles all cases
        }

        const marker = L.marker([businessInfo.lat, businessInfo.lon], { icon: icon })
            .addTo(businessLayer)
            .bindPopup(popupContent);

        // Store marker reference and initial control status in cache
        businessesCache[businessInfo.id].marker = marker;
        businessesCache[businessInfo.id].isControlled = isControlled;

        displayedBusinessIds.add(businessInfo.id); // Mark as displayed
     });

     // Add ONE listener for collect/join buttons using delegation (if not already added)
     if (!map.listens('popupopen', handlePopupOpenForActions)) {
        map.on('popupopen', handlePopupOpenForActions);
     }
}

// Combined handler for popup open to attach button listeners
function handlePopupOpenForActions(e) {
    const popupNode = e.popup._contentNode; // Get the container element of the popup

    // Handle Collect Button
    const collectButton = popupNode.querySelector('.collect-button');
    if (collectButton) {
        // Use a unique handler function to avoid duplicate listeners if popup reopens quickly
        const collectHandler = function() {
            const businessId = this.getAttribute('data-business-id');
            collectProfit(businessId);
            map.closePopup(); // Close popup after action
        };
        collectButton.onclick = collectHandler; // Assign the handler
    }

    // Handle Join Button
    const joinButton = popupNode.querySelector('.join-button');
    if (joinButton) {
        const joinHandler = function() {
            const orgName = this.getAttribute('data-org-name');
            const orgAbbr = this.getAttribute('data-org-abbr');
            const baseLat = parseFloat(this.getAttribute('data-base-lat'));
            const baseLon = parseFloat(this.getAttribute('data-base-lon'));
            joinOrganizationManually(orgName, orgAbbr, baseLat, baseLon);
            map.closePopup();
        };
        joinButton.onclick = joinHandler;
    }

    // Handle Activate Protection Button
    const activateButton = popupNode.querySelector('.activate-protection-button');
    if (activateButton) {
        const activateHandler = function() {
            const businessId = this.getAttribute('data-business-id');
            activateProtection(businessId);
            // Don't close popup immediately, let activateProtection handle alerts/updates
            // map.closePopup();
        };
        activateButton.onclick = activateHandler;
    }

    // Handle Interact Enemy Button
    const interactEnemyButton = popupNode.querySelector('.interact-enemy-button');
    if (interactEnemyButton) {
        const interactHandler = function() {
            const enemyId = this.getAttribute('data-enemy-id');
            const enemy = findEnemyById(enemyId); // Function from enemy.js
            if (enemy) {
                enemy.interact(null); // Pass player object if needed later
            } else {
                console.error(`Enemy with ID ${enemyId} not found for interaction.`);
            }
            map.closePopup(); // Close popup after interaction attempt
        };
        interactEnemyButton.onclick = interactHandler;
    }
}


// Function to update existing business markers (e.g., when joining/leaving org)
function updateBusinessMarkers() {
    console.log("Updating ALL displayed business markers based on organization status...");
    let controlledBusinessesChanged = false; // Flag to see if *any* business changed status
    displayedBusinessIds.forEach(id => {
        const statusDidChange = updateSingleBusinessMarker(id); // Check if this specific business changed
        if (statusDidChange) {
            controlledBusinessesChanged = true; // Mark that at least one changed
        }
    });
     // Update the protection book UI only if the control status of at least one business changed
    if (controlledBusinessesChanged) {
         console.log("Controlled businesses changed, updating protection book UI.");
         updateProtectionBookUI();
    } else {
         console.log("No change detected in controlled businesses.");
    }
}

// Function to update a single business marker's icon and popup
// Returns true if the control status OR protection status changed, false otherwise.
function updateSingleBusinessMarker(businessId) {
     const businessInfo = businessesCache[businessId];
     if (!businessInfo || !businessInfo.marker) {
         return false; // No change if marker doesn't exist
     }

     const previousControlStatus = businessInfo.isControlled;
     const previousProtectionPower = businessInfo.protectionPower; // Store old power

     let currentIcon = defaultBusinessIcon;
     let currentPopupContent = `<b>${businessInfo.name}</b><br>(${businessInfo.type})`;
     let isNowControlled = false; // For profit collection

     // --- Determine Profit Control Status & Base Icon ---
     if (currentUserOrganization && currentOrganizationBaseLocation) {
         const distanceToBase = calculateDistance(
             businessInfo.lat, businessInfo.lon,
             currentOrganizationBaseLocation.lat, currentOrganizationBaseLocation.lon
         );
         if (distanceToBase <= TERRITORY_RADIUS) {
             isNowControlled = true; // Can collect profit
             currentIcon = allowedBusinessIcon; // Green icon (base for controlled)
         } else {
             isNowControlled = false;
             currentIcon = notAllowedBusinessIcon; // Red icon
         }
     } else {
         isNowControlled = false;
         currentIcon = defaultBusinessIcon; // Black icon
     }

     // --- Add Protection Info & Button ---
     if (businessInfo.protectingOrganization) {
         currentPopupContent += `<br><hr>Protected by: ${businessInfo.protectingOrganization.name} (${businessInfo.protectingOrganization.abbreviation})`;
         currentPopupContent += `<br>Protection Power: ${businessInfo.protectionPower}`;
         currentPopupContent += `<br>Protectors: ${businessInfo.protectingUsers.length}/${MAX_PROTECTING_USERS}`;
     } else {
         currentPopupContent += `<br><hr>Status: Unprotected`;
     }

     // --- Add "Activate Protection" Button Logic ---
     let canActivate = false;
     if (currentUserOrganization && currentUserLocation) {
         const distanceToBusiness = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, businessInfo.lat, businessInfo.lon);
         const isAlreadyProtecting = businessInfo.protectingUsers.some(user => user.userId === currentPlayerId);

         // Conditions to show the button:
         if (distanceToBusiness <= PROTECTION_ACTIVATION_RANGE && // Player in range of business
             !isAlreadyProtecting && // Player not already protecting
             (!businessInfo.protectingOrganization || // EITHER unprotected
              (businessInfo.protectingOrganization.abbreviation === currentUserOrganization.abbreviation && // OR protected by player's org
               businessInfo.protectingUsers.length < MAX_PROTECTING_USERS)) // AND user limit not reached
            )
         {
             canActivate = true;
         }
     }

     if (canActivate) {
         currentPopupContent += `<br><button class="activate-protection-button" data-business-id="${businessInfo.id}">Activate Protection</button>`;
     }

     // --- Add "Collect Profit" Button Logic (only if controlled for profit) ---
     if (isNowControlled) {
         const profit = calculatePotentialProfit(businessInfo);
         currentPopupContent += `<br><hr>Potential Profit: $${profit}`; // Add separator
         // Only show collect button if there's profit OR it was just controlled (profit might be 0)
         if (profit > 0 || (previousControlStatus !== isNowControlled)) {
             currentPopupContent += `<br><button class="collect-button" data-business-id="${businessInfo.id}">Collect Profit</button>`;
         }
     }


     // --- Check if anything significant changed ---
     const profitControlStatusChanged = previousControlStatus !== isNowControlled;
     const protectionStatusChanged = previousProtectionPower !== businessInfo.protectionPower || // Power changed
                                    (!businessInfo.protectingOrganization && previousProtectionPower > 0) || // Went from protected to unprotected
                                    (businessInfo.protectingOrganization && previousProtectionPower === 0); // Went from unprotected to protected

     // Update cache and marker state
     businessInfo.isControlled = isNowControlled;

     // Reset collection time if profit control just started
     if (profitControlStatusChanged && isNowControlled) {
         businessInfo.lastCollected = Date.now();
         console.log(`Business ${businessInfo.id} (${businessInfo.name}) profit control started. Resetting lastCollected.`);
         // Re-calculate profit (should be 0) and update popup content immediately if needed
         // (The logic above already adds the collect button based on isNowControlled)
     } else if (profitControlStatusChanged && !isNowControlled) {
         console.log(`Business ${businessInfo.id} (${businessInfo.name}) profit control stopped.`);
     }

     // Update marker icon (based on profit control status)
     businessInfo.marker.setIcon(currentIcon);

     // Update popup content
     // Only update popup if content differs to avoid unnecessary redraws/flicker
     if (businessInfo.marker.getPopup().getContent() !== currentPopupContent) {
        businessInfo.marker.setPopupContent(currentPopupContent);
     }

     // --- Add/Remove CSS class for blue styling ---
     const markerElement = businessInfo.marker.getElement();
     if (markerElement) {
         const isProtectedByPlayerOrg = businessInfo.protectingOrganization &&
                                        currentUserOrganization &&
                                        businessInfo.protectingOrganization.abbreviation === currentUserOrganization.abbreviation;

         if (isProtectedByPlayerOrg) {
             markerElement.classList.add('protected-by-player-org');
         } else {
             markerElement.classList.remove('protected-by-player-org');
         }
     }
     // --- End CSS class modification ---


     // Return true if either profit control or protection status changed
     return profitControlStatusChanged || protectionStatusChanged;
}


// Function to calculate potential profit ($1 per minute = $1/60 per second) - Adjusted Rate
const PROFIT_RATE_PER_MINUTE = 1.0; // $1 per minute base rate
const PROFIT_RATE_PER_MS = PROFIT_RATE_PER_MINUTE / (60 * 1000); // Dollars per millisecond
const MAX_ACCUMULATION_MINUTES = 60; // Max profit accumulation time (e.g., 1 hour)
const MAX_ACCUMULATION_MS = MAX_ACCUMULATION_MINUTES * 60 * 1000;

function calculatePotentialProfit(businessInfo) {
    // Profit only generates if controlled
    if (!businessInfo || !businessInfo.isControlled) {
        return 0;
    }
    const now = Date.now();
    // If lastCollected is 0, it means profit just started accumulating (or hasn't been collected yet)
    // Use the time it became controlled if available, otherwise use 'now' (resulting in 0 profit initially)
    // For simplicity, using lastCollected. If 0, profit starts from 'now'.
    const lastCollectionTime = businessInfo.lastCollected || now; // Treat 0 as 'now' for calculation start
    const timeSinceLastCollect = now - lastCollectionTime;

    // Ensure time difference isn't negative (e.g., clock adjustments)
    if (timeSinceLastCollect < 0) return 0;

    // Cap accumulation time
    const accumulationTimeMs = Math.min(timeSinceLastCollect, MAX_ACCUMULATION_MS);
    const profit = accumulationTimeMs * PROFIT_RATE_PER_MS;
    return Math.floor(profit); // Return whole dollars
}

// Function to handle collecting profit
function collectProfit(businessId) {
    const businessInfo = businessesCache[businessId];
    if (!businessInfo) return;

    if (!currentUserLocation) {
        alert("Cannot determine your location.");
        return;
    }
     if (!currentUserOrganization || !businessInfo.isControlled) {
         alert("This business is not under your organization's control.");
         return;
    }

    const distanceToBusiness = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, businessInfo.lat, businessInfo.lon);
    const PROFIT_COLLECTION_DISTANCE = 2000; // Can collect from 2km away (Testing)

    if (distanceToBusiness <= PROFIT_COLLECTION_DISTANCE) {
        const profit = calculatePotentialProfit(businessInfo);
        if (profit > 0) {
            currentCash += profit;
            cashAmountElement.textContent = currentCash;
            businessInfo.lastCollected = Date.now(); // Update last collected time
            alert(`Collected $${profit} from ${businessInfo.name}.`);
            // Update popup immediately to show $0 potential and refresh book
             updateSingleBusinessMarker(businessId); // Update the specific marker
             updateProtectionBookUI(); // Refresh book list with updated profit
        } else {
            alert(`${businessInfo.name} has no profit to collect currently.`);
        }
    } else {
        alert(`You are too far away to collect profit from ${businessInfo.name}. (Distance: ${distanceToBusiness.toFixed(1)}m)`);
    }
}


// Function to handle leaving an organization (Removed cooldown logic)
function leaveOrganization() { // Renamed function
    if (!currentUserOrganization) { // Use renamed variable
        alert("You are not currently in an organization."); // Updated message
        return;
    }
    const orgName = currentUserOrganization.name; // Use renamed variable
    currentUserOrganization = null; // Use renamed variable
    currentOrganizationBaseLocation = null; // *** Clear base location ***
    console.log("Left organization. Updating UI and markers.");
    updateOrganizationUI(); // Call renamed function
    updateBusinessMarkers(); // *** Update business icons/popups ***
    alert(`You have left the ${orgName}.`); // Updated message
    // TODO: Clear persisted organization membership & base location
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
                alert("Location access was denied. Please enable it in your browser settings to use your current location. Using default location.");
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

                console.log("User location updated:", currentUserLocation);
                // Optional: Re-center map: map.panTo([lat, lon]);
                // Optional: Fetch new data if user moves significantly? (Could use map.moveend)
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

    console.log("initializeGame setup tasks complete.");
}

// Initial UI update (shows 'None' initially before async operations)
loadUserInfo(); // Load username/alias first
updateOrganizationUI();
updateInventoryUI(); // Initial inventory UI update

// Attach listener to leave button
leaveOrganizationButton.addEventListener('click', leaveOrganization);

// Attach listener to save user info button
if (saveUserInfoBtn) {
    saveUserInfoBtn.addEventListener('click', saveUserInfo);
} else {
    console.error("Save User Info button not found!");
}

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


// --- UI Minimize/Show Logic ---

function setupMinimizeToggle(containerId, showButtonId) {
    const containerDiv = document.getElementById(containerId);
    const minimizeBtn = containerDiv ? containerDiv.querySelector('.minimize-btn') : null;
    const showBtn = document.getElementById(showButtonId);

    if (containerDiv && minimizeBtn && showBtn) {
        // Minimize Action
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering other clicks if needed
            containerDiv.classList.add('minimized');
            showBtn.style.display = 'block'; // Show the corresponding show button
            containerDiv.style.display = 'none'; // Hide the container
        });

        // Show Action
        showBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Check specific conditions before showing
            if (containerId === 'protection-book' && !currentUserOrganization) {
                 console.log("Cannot show Protection Book: Not in an organization.");
                 // Optionally alert the user or just do nothing
                 // alert("Join an organization to view the Protection Book.");
                 return; // Don't show the book if not in an org
            }

            containerDiv.classList.remove('minimized');
            containerDiv.style.display = 'block'; // Make sure container is visible
            showBtn.style.display = 'none'; // Hide the show button itself
        });

         // Initially hide the show button
         showBtn.style.display = 'none';

    } else {
        console.error(`Could not find all elements for minimize/show functionality: ${containerId}, ${showButtonId}`);
        if (!containerDiv) console.error(`Container not found: #${containerId}`);
        if (containerDiv && !minimizeBtn) console.error(`Minimize button not found inside #${containerId}`);
        if (!showBtn) console.error(`Show button not found: #${showButtonId}`);
    }
}

// Setup for Dashboard
setupMinimizeToggle('dashboard', 'show-dashboard-btn');

// Setup for Protection Book
setupMinimizeToggle('protection-book', 'show-book-btn');


// --- Map Control Button Listeners ---
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const centerMapBtn = document.getElementById('center-map-btn');

if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
        map.zoomIn();
    });
}
if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
        map.zoomOut();
    });
}
if (centerMapBtn) {
    centerMapBtn.addEventListener('click', () => {
        if (currentUserLocation) {
            map.setView([currentUserLocation.lat, currentUserLocation.lon], map.getZoom()); // Keep current zoom level
        } else {
            alert("Current location not available yet.");
        }
    });
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
});
