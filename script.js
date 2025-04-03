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
const MANUAL_JOIN_DISTANCE = 2000; // Max distance in meters to MANUALLY join a group by clicking
const AUTO_JOIN_SEARCH_RADIUS = 10000; // Initial search radius in meters for auto-joining
let currentUserGroup = null; // Variable to store the user's current group
const userGroupElement = document.getElementById('user-group'); // Get dashboard element
const leaveGroupButton = document.getElementById('leave-group-button'); // Get leave button element
let groupCooldownEndTime = 0; // Timestamp when the cooldown ends (0 means no cooldown)
const COOLDOWN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let basesCache = {}; // Cache found bases {id: baseInfo}
let displayedBaseIds = new Set(); // Keep track of displayed base IDs to avoid duplicates

// --- Group/Base Logic ---

// Function to generate group name from church name
function generateGroupName(churchName) {
    if (!churchName || churchName.trim() === "") {
        return { fullName: "Unknown Group", abbreviation: "UNG" };
    }
    // Simple abbreviation: First letter of first 3 words (or fewer)
    const words = churchName.split(' ').filter(w => w.length > 0);
    const abbreviation = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    return {
        fullName: `${churchName} Group`,
        abbreviation: abbreviation || "GRP" // Fallback abbreviation
    };
}

// Define a base icon (e.g., a building)
const baseIcon = L.icon({
    iconUrl: 'https://img.icons8.com/ios-filled/50/000000/bank.png', // Example bank/building icon
    iconSize: [40, 40],
    iconAnchor: [20, 40], // Point at the bottom center
    popupAnchor: [0, -40]
});

// Function to fetch bases within a radius around a point
async function fetchBasesAroundPoint(lat, lon, radiusMeters) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    // Query for churches around the point within the radius
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
        return processOverpassElements(data.elements); // Process and return structured base info
    } catch (error) {
        console.error("Error fetching data from Overpass API:", error);
        alert("Could not fetch nearby bases. The service might be busy.");
        return []; // Return empty array on error
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

        const groupInfo = generateGroupName(name);
        const baseInfo = {
            id: element.id,
            name: name,
            lat: lat,
            lon: lon,
            groupName: groupInfo.fullName,
            groupAbbreviation: groupInfo.abbreviation
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
            .bindPopup(`<b>${baseInfo.groupName}</b><br>(${baseInfo.name})<br><button class="join-button" data-group-name="${baseInfo.groupName}" data-group-abbr="${baseInfo.groupAbbreviation}" data-base-lat="${baseInfo.lat}" data-base-lon="${baseInfo.lon}">Join Group</button>`);

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
                    const groupName = this.getAttribute('data-group-name');
                    const groupAbbr = this.getAttribute('data-group-abbr');
                    const baseLat = parseFloat(this.getAttribute('data-base-lat'));
                    const baseLon = parseFloat(this.getAttribute('data-base-lon'));
                    joinGroupManually(groupName, groupAbbr, baseLat, baseLon); // Call manual join function
                    map.closePopup();
                }
            }
         });
    }
}


// Function to update the UI based on group status and cooldown
function updateGroupUI() {
    if (currentUserGroup) {
        userGroupElement.textContent = `${currentUserGroup.name} (${currentUserGroup.abbreviation})`;
        leaveGroupButton.style.display = 'block'; // Show leave button
    } else {
        const now = Date.now();
        if (groupCooldownEndTime > now) {
            const remainingMs = groupCooldownEndTime - now;
            const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
            const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
            userGroupElement.textContent = `Cooldown (${remainingHours}h ${remainingMinutes}m left)`;
            leaveGroupButton.style.display = 'none';
        } else {
            userGroupElement.textContent = 'None';
            leaveGroupButton.style.display = 'none'; // Hide leave button
        }
    }
}

// Function to handle MANUALLY joining a group via click
function joinGroupManually(groupName, groupAbbr, baseLat, baseLon) {
     // Check cooldown first
    const now = Date.now();
    if (groupCooldownEndTime > now) {
        alert(`You cannot join a group for another ${Math.ceil((groupCooldownEndTime - now) / (60 * 1000))} minutes.`);
        return;
    }

     if (!currentUserLocation) {
        alert("Cannot determine your location.");
        return;
    }
    if (currentUserGroup) {
        alert(`You are already in the ${currentUserGroup.name}.`);
        return;
    }

    const distance = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, baseLat, baseLon);
    console.log(`Attempting to manually join ${groupName}. Distance: ${distance.toFixed(1)} meters.`);

    if (distance <= MANUAL_JOIN_DISTANCE) {
        currentUserGroup = { name: groupName, abbreviation: groupAbbr };
        groupCooldownEndTime = 0; // Reset cooldown if joining successfully
        localStorage.removeItem('groupCooldownEndTime'); // Clear stored cooldown
        updateGroupUI(); // Update dashboard and show leave button
        alert(`You have joined the ${groupName}!`);
        // TODO: Persist group membership (e.g., localStorage)
    } else {
         alert(`You are too far away from this base to join ${groupName}! You need to be within ${MANUAL_JOIN_DISTANCE}m. (Distance: ${distance.toFixed(1)}m)`);
    }
}

// Function to automatically find and potentially join the closest group if none are within manual range
async function findAndJoinInitialGroup(userLat, userLon) {
    // Check cooldown first
    const now = Date.now();
    if (groupCooldownEndTime > now) {
        console.log("Cooldown active, skipping initial group join check.");
        updateGroupUI(); // Show cooldown message
        return;
    }
     if (currentUserGroup) return; // Already in a group

    console.log("Searching for initial group...");
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
        console.log(`No bases within ${MANUAL_JOIN_DISTANCE}m. Automatically joining closest base: ${closestBase.groupName} at ${minDistance.toFixed(1)}m.`);
        currentUserGroup = { name: closestBase.groupName, abbreviation: closestBase.groupAbbreviation };
        groupCooldownEndTime = 0; // Reset cooldown
        localStorage.removeItem('groupCooldownEndTime');
        updateGroupUI(); // Update dashboard and show leave button
        alert(`No groups found within ${MANUAL_JOIN_DISTANCE}m. You have been automatically assigned to the closest group: ${closestBase.groupName}.`);
        // TODO: Persist group membership
    } else if (baseWithinManualRangeExists) {
         console.log(`Bases found within ${MANUAL_JOIN_DISTANCE}m. User must join manually.`);
         updateGroupUI(); // Ensure UI shows "None" and no leave button yet
    } else {
        console.log("Could not find any bases to automatically join.");
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

// Function to handle leaving a group
function leaveGroup() {
    if (!currentUserGroup) {
        alert("You are not currently in a group.");
        return;
    }
    const groupName = currentUserGroup.name;
    currentUserGroup = null;
    groupCooldownEndTime = Date.now() + COOLDOWN_DURATION_MS;
    localStorage.setItem('groupCooldownEndTime', groupCooldownEndTime.toString()); // Store cooldown end time
    updateGroupUI(); // Update UI to show cooldown
    alert(`You have left the ${groupName}. You cannot join another group for 24 hours.`);
    // TODO: Clear persisted group membership
}


// --- Initial Setup ---
// Check cooldown status on load
const storedCooldownEnd = localStorage.getItem('groupCooldownEndTime');
if (storedCooldownEnd) {
    const endTime = parseInt(storedCooldownEnd, 10);
    if (endTime > Date.now()) {
        groupCooldownEndTime = endTime;
        console.log("Group join cooldown is active until:", new Date(groupCooldownEndTime));
    } else {
        localStorage.removeItem('groupCooldownEndTime'); // Cooldown expired
    }
}
updateGroupUI(); // Initial UI update based on potential cooldown

// Attach listener to leave button
leaveGroupButton.addEventListener('click', leaveGroup);


// Modify the initial geolocation success callback
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        position => {
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
            findAndJoinInitialGroup(lat, lon); // Attempt to find/join initial group
        },
        () => { // Error callback for initial position
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
            findAndJoinInitialGroup(defaultLat, defaultLon); // Attempt to find/join initial group even with default location
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
    findAndJoinInitialGroup(defaultLat, defaultLon); // Attempt to find/join initial group
}
// Remove the old map move listener
// map.on('load moveend', ...);
