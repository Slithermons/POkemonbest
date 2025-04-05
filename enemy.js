// Enemy system adapted for Leaflet map

// Note: enemyLayer is declared and initialized in script.js

class Enemy {
    constructor(lat, lon, layerGroup) {
        this.lat = lat;
        this.lon = lon;
        this.layerGroup = layerGroup; // Reference to the Leaflet layer group

        // Determine enemy type and properties (including stats)
        this.setTypeAndProperties(); // Sets name, power, stats, spriteSheet, etc.

        // Create Leaflet divIcon for animated sprite using the correct sheet
        this.icon = L.divIcon({
            html: `<div class="enemy-sprite ${this.initialDirectionClass || 'walk-down'}" style="background-image: url('${this.spriteSheet}');"></div>`, // Inner div for sprite animation with specific background
            className: 'enemy-marker', // Main marker class (no background needed)
            iconSize: [64, 64], // Match sprite frame size
            iconAnchor: [32, 64] // Anchor at bottom-center
        });

        // Create Leaflet marker
        this.marker = L.marker([this.lat, this.lon], { icon: this.icon })
            .addTo(this.layerGroup)
        // Assign a unique ID *before* creating the popup
        this.id = `enemy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Create Leaflet marker and bind popup with the correct ID
        this.marker = L.marker([this.lat, this.lon], { icon: this.icon })
            .addTo(this.layerGroup)
            .bindPopup(`<b>${this.name}</b><br>Power: ${this.power}<br><button class="interact-enemy-button" data-enemy-id="${this.id}">Interact</button>`);

        this.marker.enemyId = this.id; // Store ID on marker for easy access in events (optional but can be useful)

        // Add the new enemy instance to the global array
        enemies.push(this);

        console.log(`Created ${this.name} (ID: ${this.id}) at (${this.lat.toFixed(5)}, ${this.lon.toFixed(5)}) with power ${this.power}`);
    }

    setTypeAndProperties() {
        const typeRoll = Math.random();
        // Determine name, power, experience rate, and sprite sheet based on type
        if (typeRoll < 0.6) { // 60% chance for Associates
            this.name = "Associates";
            this.power = Math.floor(Math.random() * (120 - 40 + 1)) + 40; // Adjusted power: 40-120
            this.experienceRate = Math.floor(Math.random() * (15 - 5 + 1)) + 5; // Adjusted lower XP
            this.spriteSheet = 'img/associates.png';
        } else if (typeRoll < 0.9) { // 30% chance for Soldiers
            this.name = "Soldiers";
            this.power = Math.floor(Math.random() * (500 - 121 + 1)) + 121; // Power: 121-500 (Example range)
            this.experienceRate = Math.floor(Math.random() * (50 - 15 + 1)) + 15; // Adjusted medium XP
            this.spriteSheet = 'img/soldiers.png';
        } else { // 10% chance for Caporegimes
            this.name = "Caporegimes";
            this.power = Math.floor(Math.random() * (2000 - 501 + 1)) + 501; // Power: 501-2000 (Example range)
            this.experienceRate = Math.floor(Math.random() * (200 - 50 + 1)) + 50; // Higher XP
            this.spriteSheet = 'img/caporegimes.png';
        }

        // Add randomness multiplier to stats derived from power
        const statMultiplier = 0.8 + Math.random() * 0.4; // Random factor between 0.8 and 1.2

        // Derive stats from power with added randomness
        this.health = Math.max(10, Math.floor(this.power * 1.5 * statMultiplier)); // Base health related to power
        this.attack = Math.max(1, Math.floor(this.power / 8 * statMultiplier));    // Base attack
        this.defense = Math.max(0, Math.floor(this.power / 15 * statMultiplier));   // Base defense

        // Set initial direction (can be randomized later if needed)
        this.initialDirectionClass = 'walk-down';

        // Define potential loot based on enemy type
        this.defineLootTable();
    }

    defineLootTable() {
        this.lootTable = []; // Array of { itemId: string, chance: float (0-1), quantity: [min, max] }
        switch (this.name) {
            case "Associates":
                this.lootTable = [
                    { itemId: 'FOOD001', chance: 0.3, quantity: [1, 2] }, // Canned Beans
                    { itemId: 'CRAFT001', chance: 0.2, quantity: [1, 3] }, // Scrap Metal
                    { itemId: 'MED002', chance: 0.1, quantity: [1, 1] },  // Bandages
                    { itemId: 'MONEY', chance: 1, quantity: [20, 50] } // Added: 20-50$
                ];
                break;
            case "Soldiers":
                this.lootTable = [
                    { itemId: 'MED001', chance: 0.4, quantity: [1, 1] }, // Small Medkit
                    { itemId: 'FOOD002', chance: 0.3, quantity: [1, 2] }, // Energy Bar
                    { itemId: 'CRAFT001', chance: 0.4, quantity: [2, 5] }, // Scrap Metal
                    { itemId: 'CRAFT002', chance: 0.15, quantity: [1, 1] }, // Duct Tape
                    { itemId: 'UTIL003', chance: 0.05, quantity: [1, 1] }, // Brass Knuckles (low chance)
                    { itemId: 'MONEY', chance: 1, quantity: [50, 100] } // Added: 50-100$
                ];
                break;
            case "Caporegimes":
                this.lootTable = [
                    { itemId: 'DRUG001', chance: 0.5, quantity: [1, 1] }, // Adrenaline Shot
                    { itemId: 'DRUG002', chance: 0.4, quantity: [1, 2] }, // Painkillers
                    { itemId: 'DRUG003', chance: 0.3, quantity: [1, 1] }, // Stimulant Shot
                    { itemId: 'CRAFT002', chance: 0.5, quantity: [1, 3] }, // Duct Tape
                    { itemId: 'KEY001', chance: 0.1, quantity: [1, 1] },   // Warehouse Key (rare)
                    { itemId: 'RING002', chance: 0.08, quantity: [1, 1] },  // Capo's Signet (rare)
                    { itemId: 'MONEY', chance: 1, quantity: [100, 500] } // Added: 100-500$
                ];
                break;
            default: // Default case if name doesn't match (shouldn't happen)
                 // Add a fallback money drop just in case
                this.lootTable.push({ itemId: 'MONEY', chance: 0.5, quantity: [1, 10] });
                break;
        }
        // Generic money drop line removed as it's handled per type now
    }

    // Method to determine loot based on the table
    getLoot() {
        const droppedLoot = [];
        this.lootTable.forEach(itemDrop => {
            if (Math.random() < itemDrop.chance) {
                const quantity = Math.floor(Math.random() * (itemDrop.quantity[1] - itemDrop.quantity[0] + 1)) + itemDrop.quantity[0];
                if (quantity > 0) {
                    droppedLoot.push({ itemId: itemDrop.itemId, quantity: quantity });
                }
            }
        });
        console.log(`${this.name} dropped loot:`, droppedLoot);
        return droppedLoot; // Returns an array of { itemId: string, quantity: number }
    }


    // Simplified movement: Randomly move within a small radius
    move() {
        const moveDistanceLat = (Math.random() - 0.5) * 0.0002; // Small random offset lat
        const moveDistanceLon = (Math.random() - 0.5) * 0.0003; // Small random offset lon

        const newLat = this.lat + moveDistanceLat;
        const newLon = this.lon + moveDistanceLon;

        // Basic boundary check (optional, keep within general area)
        // Determine movement direction and update sprite class
        let directionClass = 'walk-down'; // Default
        const absLat = Math.abs(moveDistanceLat);
        const absLon = Math.abs(moveDistanceLon);

        if (absLat > absLon) { // Moved more vertically
            directionClass = moveDistanceLat > 0 ? 'walk-up' : 'walk-down';
        } else if (absLon > absLat) { // Moved more horizontally
            directionClass = moveDistanceLon > 0 ? 'walk-right' : 'walk-left';
        } // If equal, keep previous or default (already set to walk-down)

        this.lat = newLat;
        this.lon = newLon;

        if (this.marker) {
            this.marker.setLatLng([this.lat, this.lon]);

            // Update sprite direction class
            const spriteElement = this.marker.getElement()?.querySelector('.enemy-sprite');
            if (spriteElement) {
                spriteElement.classList.remove('walk-up', 'walk-down', 'walk-left', 'walk-right');
                spriteElement.classList.add(directionClass);
            }
        }
    }

    // Placeholder for interaction logic
    interact(player) { // Player object might not be needed here if script.js handles the call
        console.log(`Player interacting with ${this.name} (ID: ${this.id}, Health: ${this.health}, Atk: ${this.attack}, Def: ${this.defense})`);
        // The actual call to startBattle will now be initiated from script.js
        // based on the button click, passing this enemy object.
        // showCustomAlert(`You encountered ${this.name} (Power: ${this.power})! Combat starting...`); // Alert moved to script.js or battle.js
    }

    remove() {
        if (this.marker && this.layerGroup) {
            this.layerGroup.removeLayer(this.marker);
            this.marker = null; // Clear reference
        }
        console.log(`Removed ${this.name} (ID: ${this.id})`);
    }
}

// Global array to hold enemy instances - Initialized here
let enemies = [];

// --- Proximity Management for Associates ---
const ASSOCIATE_PROXIMITY_RADIUS = 150; // meters
const ASSOCIATE_SPAWN_MIN_RADIUS = 100; // meters (min distance to spawn from player)
const ASSOCIATE_SPAWN_MAX_RADIUS = 150; // meters (max distance to spawn from player)
const ASSOCIATE_CHECK_INTERVAL = 5000; // Check every 5 seconds

let associateCheckIntervalId = null;

function manageAssociatesProximity() {
    if (!currentUserLocation || !enemyLayer) {
        // console.log("Skipping associate check: No player location or enemy layer.");
        return;
    }

    let nearbyAssociatesCount = 0;
    enemies.forEach(enemy => {
        if (enemy.name === "Associates") {
            const distance = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, enemy.lat, enemy.lon);
            if (distance <= ASSOCIATE_PROXIMITY_RADIUS) {
                nearbyAssociatesCount++;
            }
        }
    });

    // console.log(`Nearby Associates (${ASSOCIATE_PROXIMITY_RADIUS}m): ${nearbyAssociatesCount}`); // Debug log

    if (nearbyAssociatesCount === 0) {
        console.log("No nearby Associates found. Spawning one.");
        spawnSingleAssociateNearPlayer(currentUserLocation.lat, currentUserLocation.lon, enemyLayer);
    }
    // Optional: Could add logic here to spawn a second one if count is 1, maybe with a lower chance.
    // else if (nearbyAssociatesCount === 1 && Math.random() < 0.2) { // e.g., 20% chance to spawn a second
    //     console.log("One nearby Associate found. Spawning another.");
    //     spawnSingleAssociateNearPlayer(currentUserLocation.lat, currentUserLocation.lon, enemyLayer);
    // }
}

function spawnSingleAssociateNearPlayer(centerLat, centerLon, layerGroup) {
    // Spawn slightly away from the player
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnRadiusMeters = ASSOCIATE_SPAWN_MIN_RADIUS + Math.random() * (ASSOCIATE_SPAWN_MAX_RADIUS - ASSOCIATE_SPAWN_MIN_RADIUS);
    const metersPerDegreeLat = 111320; // Approximate meters per degree latitude
    const metersPerDegreeLon = metersPerDegreeLat * Math.cos(centerLat * Math.PI / 180);

    const latOffset = (spawnRadiusMeters * Math.sin(spawnAngle)) / metersPerDegreeLat;
    const lonOffset = (spawnRadiusMeters * Math.cos(spawnAngle)) / metersPerDegreeLon;

    const spawnLat = centerLat + latOffset;
    const spawnLon = centerLon + lonOffset;

    // Create an enemy instance - it will add itself to the 'enemies' array via constructor
    const newAssociate = new Enemy(spawnLat, spawnLon, layerGroup);
    // Force type to Associates for this specific spawn function
    newAssociate.name = "Associates";
    newAssociate.power = Math.floor(Math.random() * (120 - 40 + 1)) + 40;
    newAssociate.experienceRate = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
    newAssociate.spriteSheet = 'img/associates.png';
    newAssociate.health = Math.max(10, Math.floor(newAssociate.power * 1.5 * (0.8 + Math.random() * 0.4)));
    newAssociate.attack = Math.max(1, Math.floor(newAssociate.power / 8 * (0.8 + Math.random() * 0.4)));
    newAssociate.defense = Math.max(0, Math.floor(newAssociate.power / 15 * (0.8 + Math.random() * 0.4)));
    newAssociate.defineLootTable(); // Redefine loot based on forced type

    // Update the marker popup content if needed (optional, constructor might be sufficient)
    // newAssociate.marker.setPopupContent(`<b>${newAssociate.name}</b><br>Power: ${newAssociate.power}<br><button class="interact-enemy-button" data-enemy-id="${newAssociate.id}">Interact</button>`);

    // Ensure visibility check runs soon after spawn if needed
    if (typeof updateMarkersVisibility === 'function' && currentUserLocation) {
        updateMarkersVisibility(currentUserLocation.lat, currentUserLocation.lon);
    }
}

function startAssociateProximityChecks() {
    if (associateCheckIntervalId) {
        clearInterval(associateCheckIntervalId);
    }
    console.log(`Starting Associate proximity check interval (${ASSOCIATE_CHECK_INTERVAL}ms)`);
    associateCheckIntervalId = setInterval(manageAssociatesProximity, ASSOCIATE_CHECK_INTERVAL);
    // Run initial check immediately
    manageAssociatesProximity();
}

function stopAssociateProximityChecks() {
     if (associateCheckIntervalId) {
        clearInterval(associateCheckIntervalId);
        associateCheckIntervalId = null;
        console.log("Stopped Associate proximity checks.");
    }
}

// OLD spawnEnemies function REMOVED as it conflicts with the new logic.
// // Function to spawn enemies around a central point
// function spawnEnemies(count, centerLat, centerLon, radiusDegrees, layerGroup) { ... }

// Function to find enemy by ID
function findEnemyById(id) {
    return enemies.find(enemy => enemy.id === id);
}


// Enemy movement interval (will be started in initialization.js)
let enemyMoveInterval = null;

function startEnemyMovement(intervalMs = 2000) { // Move every 2 seconds default
    if (enemyMoveInterval) {
        clearInterval(enemyMoveInterval); // Clear existing interval if any
    }
    console.log(`Starting enemy movement interval (${intervalMs}ms)`);
    enemyMoveInterval = setInterval(() => {
        // Only move enemies that are currently visible/relevant? Or all? Move all for now.
        enemies.forEach(enemy => {
            // Optional: Add check if enemy is within a larger radius before moving
            enemy.move()
        });
    }, intervalMs);
}

function stopEnemyMovement() {
    if (enemyMoveInterval) {
        clearInterval(enemyMoveInterval);
        enemyMoveInterval = null;
        console.log("Stopped enemy movement interval.");
    }
}
