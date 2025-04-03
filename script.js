// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13); // Default view if geolocation fails

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
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

// Get user's location and watch for changes
if (navigator.geolocation) {
    // Get initial position
    navigator.geolocation.getCurrentPosition(
        // Success Callback for initial load
        position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            currentUserLocation = { lat, lon }; // Store initial location
            map.setView([lat, lon], 16); // Center map on user's location

            // Add or update user marker
            if (!userMarker) {
                userMarker = L.marker([lat, lon]).addTo(map).bindPopup('You are here!');
            } else {
                userMarker.setLatLng([lat, lon]);
            }
            userMarker.openPopup();

            spawnCashDrops(lat, lon); // Spawn Cash Drops near the user
            spawnRivals(lat, lon); // Spawn Rivals near the user
        },
        // Error Callback for initial load
        () => {
            console.log("Geolocation failed on initial load. Using default location.");
            const defaultLat = 51.505;
            const defaultLon = -0.09;
            currentUserLocation = { lat: defaultLat, lon: defaultLon }; // Store default location

            // Add default location marker if no user marker exists
             if (!userMarker) {
                userMarker = L.marker([defaultLat, defaultLon]).addTo(map).bindPopup('Default location.');
                userMarker.openPopup();
            }

            spawnCashDrops(defaultLat, defaultLon); // Spawn Cash Drops near default location
            spawnRivals(defaultLat, defaultLon); // Spawn Characters near default location
        }
    );

    // Watch for position changes
    navigator.geolocation.watchPosition(
        // Success Callback for updates
        position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            currentUserLocation = { lat, lon }; // Update current location

            // Update user marker position
            if (!userMarker) {
                 userMarker = L.marker([lat, lon]).addTo(map).bindPopup('You are here!');
            } else {
                userMarker.setLatLng([lat, lon]);
            }
            // Optionally re-center map on user movement: map.panTo([lat, lon]);
            console.log("User location updated:", currentUserLocation);
        },
        // Error Callback for updates
        error => {
            console.error("Error watching position:", error.message);
        },
        // Options for watchPosition
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );

} else {
    // Geolocation not supported
    console.log("Geolocation is not supported by this browser.");
    const defaultLat = 51.505;
    const defaultLon = -0.09;
    currentUserLocation = { lat: defaultLat, lon: defaultLon }; // Store default location

    // Add default location marker
    if (!userMarker) {
        userMarker = L.marker([defaultLat, defaultLon]).addTo(map).bindPopup('Default location.');
        userMarker.openPopup();
    }

    spawnCashDrops(defaultLat, defaultLon); // Spawn Cash Drops near default location
    spawnRivals(defaultLat, defaultLon); // Spawn Rivals near default location
}

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
const TERRITORY_RADIUS = 2000; // 2km radius for territory control
const protectionBookElement = document.getElementById('protection-book'); // Get protection book container
const controlledBusinessesListElement = document.getElementById('controlled-businesses-list'); // Get list element

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
    popupAnchor: [0, -40]
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
    if (!map.listens('popupopen')) {
                 map.on('popupopen', function(e) {
            const joinButton = e.popup._contentNode.querySelector('.join-button');
            if (joinButton) {
                // Remove previous listener if any to prevent duplicates
                joinButton.onclick = null;
                joinButton.onclick = function() {
                    const orgName = this.getAttribute('data-org-name'); // Read updated attribute
                    const orgAbbr = this.getAttribute('data-org-abbr'); // Read updated attribute
                    const baseLat = parseFloat(this.getAttribute('data-base-lat'));
                    const baseLon = parseFloat(this.getAttribute('data-base-lon'));
                    joinOrganizationManually(orgName, orgAbbr, baseLat, baseLon); // Call renamed function
                    map.closePopup();
                }
            }
         });
    }
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
        alert(`You collected $${amount}!`);
        // TODO: Add transaction details to storage if needed
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
        popupAnchor: [0, -20]
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
        popupAnchor: [0, -17]
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

// Function to update the Protection Book UI
function updateProtectionBookUI() {
    if (!currentUserOrganization) {
        protectionBookElement.style.display = 'none';
        controlledBusinessesListElement.innerHTML = '';
        return;
    }

    controlledBusinessesListElement.innerHTML = ''; // Clear existing list
    let controlledCount = 0;

    // Iterate through cached businesses that are currently displayed
    displayedBusinessIds.forEach(id => {
        const businessInfo = businessesCache[id];
        // Check if the business exists and is marked as controlled
        if (businessInfo && businessInfo.isControlled) {
            controlledCount++;
            const profit = calculatePotentialProfit(businessInfo);
            const listItem = document.createElement('li');
            // Display name and current potential profit
            listItem.innerHTML = `<span class="business-name">${businessInfo.name}</span> <span class="business-profit">$${profit}</span>`;
            // Optional: Add click listener to pan to business?
            // listItem.onclick = () => map.panTo([businessInfo.lat, businessInfo.lon]);
            controlledBusinessesListElement.appendChild(listItem);
        }
    });

    if (controlledCount > 0) {
         protectionBookElement.style.display = 'block'; // Show the book if there are controlled businesses
    } else {
         // Optionally keep the book visible but show an empty message
         controlledBusinessesListElement.innerHTML = '<li>No businesses currently controlled.</li>';
         protectionBookElement.style.display = 'block';
    }
}


// Define a business icon
const businessIcon = L.icon({
    iconUrl: 'https://img.icons8.com/ios-glyphs/30/000000/shop.png', // Example shop icon
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});
const controlledBusinessIcon = L.icon({ // Icon for businesses in player's territory
    iconUrl: 'https://img.icons8.com/ios-filled/30/4CAF50/shop.png', // Example green shop icon
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
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

        const businessInfo = {
            id: element.id,
            name: name,
            lat: lat,
            lon: lon,
            type: tags.shop || tags.amenity,
            potential: potential, // Base potential for income
            lastCollected: 0 // Timestamp of last collection
        };
        businessesCache[businessInfo.id] = businessInfo;
        businesses.push(businessInfo);
    });
    return businesses;
}

// Function to display business markers, checking territory
function displayBusinesses(businesses) {
     businesses.forEach(businessInfo => {
        if (displayedBusinessIds.has(businessInfo.id)) {
             // If already displayed, potentially update its icon/popup if org changed
             updateSingleBusinessMarker(businessInfo.id);
            return;
        }

        let icon = businessIcon;
        let popupContent = `<b>${businessInfo.name}</b><br>(${businessInfo.type})`;
        let isControlled = false;

        // Check if player is in an org and business is within territory
        if (currentUserOrganization && currentOrganizationBaseLocation) {
            const distanceToBase = calculateDistance(
                businessInfo.lat, businessInfo.lon,
                currentOrganizationBaseLocation.lat, currentOrganizationBaseLocation.lon
            );
            if (distanceToBase <= TERRITORY_RADIUS) {
                isControlled = true;
                icon = controlledBusinessIcon; // Use green icon
                // Add profit info and collect button
                const profit = calculatePotentialProfit(businessInfo);
                popupContent += `<br>Potential Profit: $${profit}<br><button class="collect-button" data-business-id="${businessInfo.id}">Collect Profit</button>`;
            }
        }

        const marker = L.marker([businessInfo.lat, businessInfo.lon], { icon: icon })
            .addTo(businessLayer)
            .bindPopup(popupContent);

        // Store marker reference in cache for updates
        businessesCache[businessInfo.id].marker = marker;
        businessesCache[businessInfo.id].isControlled = isControlled; // Store control status

        displayedBusinessIds.add(businessInfo.id);
     });

 // Add ONE listener for collect/join buttons using delegation
 if (!map.listens('popupopen', handlePopupOpenForActions)) { // Check if listener exists
    map.on('popupopen', handlePopupOpenForActions);
 }
}

// Combined handler for popup open to attach button listeners
function handlePopupOpenForActions(e) {
    // Handle Collect Button
    const collectButton = e.popup._contentNode.querySelector('.collect-button');
    if (collectButton) {
        collectButton.onclick = function() {
            const businessId = this.getAttribute('data-business-id');
            collectProfit(businessId);
            map.closePopup(); // Close popup after action
        }
    }
    // Handle Join Button
    const joinButton = e.popup._contentNode.querySelector('.join-button');
    if (joinButton) {
        // Remove previous listener to prevent duplicates if popup reopens quickly
        joinButton.onclick = null;
        joinButton.onclick = function() {
            const orgName = this.getAttribute('data-org-name');
             const orgAbbr = this.getAttribute('data-org-abbr');
             const baseLat = parseFloat(this.getAttribute('data-base-lat'));
             const baseLon = parseFloat(this.getAttribute('data-base-lon'));
             joinOrganizationManually(orgName, orgAbbr, baseLat, baseLon);
            map.closePopup(); // Close popup after action
        }
    }
}


// Function to update existing business markers (e.g., when joining/leaving org)
function updateBusinessMarkers() {
    console.log("Updating business markers based on organization status...");
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
// Returns true if the control status changed, false otherwise.
function updateSingleBusinessMarker(businessId) {
     const businessInfo = businessesCache[businessId];
     if (!businessInfo || !businessInfo.marker) return false; // Skip if no info or marker, return false (no change)

     const previousControlStatus = businessInfo.isControlled; // Store old status
     let currentIcon = businessIcon;
     let currentPopupContent = `<b>${businessInfo.name}</b><br>(${businessInfo.type})`;
     let isNowControlled = false;

     // Determine current control status
     if (currentUserOrganization && currentOrganizationBaseLocation) {
         const distanceToBase = calculateDistance(
             businessInfo.lat, businessInfo.lon,
             currentOrganizationBaseLocation.lat, currentOrganizationBaseLocation.lon
         );
         if (distanceToBase <= TERRITORY_RADIUS) {
             isNowControlled = true;
             currentIcon = controlledBusinessIcon;
             const profit = calculatePotentialProfit(businessInfo);
             currentPopupContent += `<br>Potential Profit: $${profit}<br><button class="collect-button" data-business-id="${businessInfo.id}">Collect Profit</button>`;
         }
     }

     // Check if the control status actually changed
     const statusChanged = previousControlStatus !== isNowControlled;

     // Update the cache with the new control status
     businessInfo.isControlled = isNowControlled;

     // If the business just became controlled, reset its collection time to start profit now
     if (statusChanged && isNowControlled) {
         businessInfo.lastCollected = Date.now();
         console.log(`Business ${businessInfo.id} (${businessInfo.name}) is now controlled. Resetting lastCollected.`);
         // Re-calculate profit and update popup content immediately
         const profit = calculatePotentialProfit(businessInfo); // Should be 0 now
         currentPopupContent = `<b>${businessInfo.name}</b><br>(${businessInfo.type})<br>Potential Profit: $${profit}<br><button class="collect-button" data-business-id="${businessInfo.id}">Collect Profit</button>`;
     }


     // Update marker icon and popup content
     businessInfo.marker.setIcon(currentIcon);
     // Only update popup if content differs to avoid unnecessary redraws
     if (businessInfo.marker.getPopup().getContent() !== currentPopupContent) {
        businessInfo.marker.setPopupContent(currentPopupContent);
     }


     return statusChanged; // Return whether the control status changed
}


// Function to calculate potential profit ($1 per minute = $1/60 per second) - Adjusted Rate
const PROFIT_RATE_PER_MINUTE = 1.0; // $1 per minute base rate
const PROFIT_RATE_PER_MS = PROFIT_RATE_PER_MINUTE / (60 * 1000); // Dollars per millisecond
const MAX_ACCUMULATION_MINUTES = 60; // Max profit accumulation time (e.g., 1 hour)
const MAX_ACCUMULATION_MS = MAX_ACCUMULATION_MINUTES * 60 * 1000;

function calculatePotentialProfit(businessInfo) {
    if (!businessInfo.isControlled) { // Can't generate profit if not controlled
        return 0;
    }
    const now = Date.now();
    // Use lastCollected timestamp; if 0, assume it starts accumulating now (or from when control was gained, ideally)
    // For simplicity, we'll use lastCollected. If 0, profit starts from 'now'.
    const lastCollectionTime = businessInfo.lastCollected || now;
    const timeSinceLastCollect = now - lastCollectionTime;
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
    const PROFIT_COLLECTION_DISTANCE = 100; // Can collect from 100m away

    if (distanceToBusiness <= PROFIT_COLLECTION_DISTANCE) {
        const profit = calculatePotentialProfit(businessInfo);
        if (profit > 0) {
            currentCash += profit;
            cashAmountElement.textContent = currentCash;
            businessInfo.lastCollected = Date.now(); // Update last collected time
            alert(`Collected $${profit} from ${businessInfo.name}.`);
            // Update popup immediately to show $0 potential and refresh book
             updateSingleBusinessMarker(businessId);
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
    updateOrganizationUI(); // Call renamed function
    updateBusinessMarkers(); // *** Update business icons/popups ***
    alert(`You have left the ${orgName}.`); // Updated message
    // TODO: Clear persisted organization membership & base location
}


// --- Initial Setup ---
// Cooldown check removed
updateOrganizationUI(); // Initial UI update (call renamed function)

// Attach listener to leave button (use renamed variable)
leaveOrganizationButton.addEventListener('click', leaveOrganization);


// Modify the initial geolocation success callback to be async
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        async position => { // Make this async
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            currentUserLocation = { lat, lon };
            map.setView([lat, lon], 16);
            if (!userMarker) {
                userMarker = L.marker([lat, lon]).addTo(map).bindPopup('You are here!');
            } else {
                userMarker.setLatLng([lat, lon]);
            }
            userMarker.openPopup();

            spawnCashDrops(lat, lon);
            spawnRivals(lat, lon);
            await findAndJoinInitialOrganization(lat, lon); // Await the search/join process
            // updateBusinessMarkers(); // This is now called within findAndJoinInitialOrganization and map moveend
        },
        async () => { // Error callback for initial position - make async
            console.log("Geolocation failed on initial load. Using default location.");
            const defaultLat = 51.505;
            const defaultLon = -0.09;
            currentUserLocation = { lat: defaultLat, lon: defaultLon };
             if (!userMarker) {
                userMarker = L.marker([defaultLat, defaultLon]).addTo(map).bindPopup('Default location.');
                userMarker.openPopup();
            }
            spawnCashDrops(defaultLat, defaultLon);
            spawnRivals(defaultLat, defaultLon);
            await findAndJoinInitialOrganization(defaultLat, defaultLon); // Await the search/join process
             // updateBusinessMarkers(); // This is now called within findAndJoinInitialOrganization and map moveend
        }
    );
    // ... rest of watchPosition logic remains the same ...
} else {
     // Geolocation not supported - handle initial setup
    console.log("Geolocation is not supported by this browser.");
    const defaultLat = 51.505;
    const defaultLon = -0.09;
    currentUserLocation = { lat: defaultLat, lon: defaultLon };
    if (!userMarker) {
        userMarker = L.marker([defaultLat, defaultLon]).addTo(map).bindPopup('Default location.');
        userMarker.openPopup();
    }
    spawnCashDrops(defaultLat, defaultLon);
    spawnRivals(defaultLat, defaultLon);
    // Need to handle initial load without geolocation too
    findAndJoinInitialOrganization(defaultLat, defaultLon).then(() => {
        // updateBusinessMarkers(); // Called within findAndJoin...
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
    displayBusinesses(businessesInView); // Display new businesses AND update existing ones in view

    // *** Explicitly update all displayed business markers AFTER new ones are processed ***
    // This ensures all visible businesses reflect the current organization status.
    updateBusinessMarkers();
});
