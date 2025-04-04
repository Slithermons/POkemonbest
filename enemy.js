// Enemy system adapted for Leaflet map

// Note: enemyLayer is declared and initialized in script.js

class Enemy {
    constructor(lat, lon, layerGroup) {
        this.lat = lat;
        this.lon = lon;
        this.layerGroup = layerGroup; // Reference to the Leaflet layer group

        // Determine enemy type and properties (including stats)
        this.setTypeAndProperties();

        // Create Leaflet divIcon for animated sprite
        this.icon = L.divIcon({
            html: `<div class="enemy-sprite ${this.initialDirectionClass || 'walk-down'}"></div>`, // Inner div for sprite animation
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

        console.log(`Created ${this.name} at (${this.lat.toFixed(5)}, ${this.lon.toFixed(5)}) with power ${this.power}`);
    }

    setTypeAndProperties() {
        const typeRoll = Math.random();
        // Determine name, power, and experience rate based on type
        if (typeRoll < 0.6) { // 60% chance for Associates
            this.name = "Associates";
            this.power = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
            this.experienceRate = Math.floor(Math.random() * (20 - 5 + 1)) + 5; // Lower XP
        } else if (typeRoll < 0.9) { // 30% chance for Soldiers
            this.name = "Soldiers";
            this.power = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
            this.experienceRate = Math.floor(Math.random() * (50 - 20 + 1)) + 20; // Medium XP
        } else { // 10% chance for Caporegimes
            this.name = "Caporegimes";
            this.power = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;
            this.experienceRate = Math.floor(Math.random() * (200 - 50 + 1)) + 50; // Higher XP
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
                    { itemId: 'MED002', chance: 0.1, quantity: [1, 1] }  // Bandages
                ];
                break;
            case "Soldiers":
                this.lootTable = [
                    { itemId: 'MED001', chance: 0.4, quantity: [1, 1] }, // Small Medkit
                    { itemId: 'FOOD002', chance: 0.3, quantity: [1, 2] }, // Energy Bar
                    { itemId: 'CRAFT001', chance: 0.4, quantity: [2, 5] }, // Scrap Metal
                    { itemId: 'CRAFT002', chance: 0.15, quantity: [1, 1] }, // Duct Tape
                    { itemId: 'UTIL003', chance: 0.05, quantity: [1, 1] } // Brass Knuckles (low chance)
                ];
                break;
            case "Caporegimes":
                this.lootTable = [
                    { itemId: 'DRUG001', chance: 0.5, quantity: [1, 1] }, // Adrenaline Shot
                    { itemId: 'DRUG002', chance: 0.4, quantity: [1, 2] }, // Painkillers
                    { itemId: 'DRUG003', chance: 0.3, quantity: [1, 1] }, // Stimulant Shot
                    { itemId: 'CRAFT002', chance: 0.5, quantity: [1, 3] }, // Duct Tape
                    { itemId: 'KEY001', chance: 0.1, quantity: [1, 1] },   // Warehouse Key (rare)
                    { itemId: 'RING002', chance: 0.08, quantity: [1, 1] }  // Capo's Signet (rare)
                ];
                break;
        }
        // Add a small chance for money drop for all types
        this.lootTable.push({ itemId: 'MONEY', chance: 0.6, quantity: [Math.floor(this.power / 10), Math.floor(this.power / 5)] });
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

// Global array to hold enemy instances
let enemies = [];

// Function to spawn enemies around a central point
function spawnEnemies(count, centerLat, centerLon, radiusDegrees, layerGroup) {
    // Clear existing enemies
    enemies.forEach(enemy => enemy.remove());
    enemies = [];
    if (!layerGroup) {
        console.error("Enemy layer group not provided to spawnEnemies!");
        return;
    }
    enemyLayer = layerGroup; // Store reference if needed globally here

    console.log(`Spawning ${count} enemies around [${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}] within ${radiusDegrees} degrees.`);

    for (let i = 0; i < count; i++) {
        // Generate random point within a circular radius
        const randomAngle = Math.random() * 2 * Math.PI;
        // Use sqrt(random) for more uniform distribution within the circle
        const randomRadius = radiusDegrees * Math.sqrt(Math.random());

        // Calculate new coordinates
        // Note: This is an approximation, more accurate for smaller radii.
        // For longitude, adjust based on latitude to account for map projection distortion.
        const lat = centerLat + randomRadius * Math.sin(randomAngle);
        const lon = centerLon + randomRadius * Math.cos(randomAngle) / Math.cos(centerLat * Math.PI / 180);

        // TODO: Add check here to prevent spawning on water (requires external data or service)
        // For now, spawn anywhere within radius.

        enemies.push(new Enemy(lat, lon, layerGroup));
    }
}

// Function to find enemy by ID
function findEnemyById(id) {
    return enemies.find(enemy => enemy.id === id);
}


// Enemy movement interval (will be started in script.js)
let enemyMoveInterval = null;

function startEnemyMovement(intervalMs = 2000) { // Move every 2 seconds default
    if (enemyMoveInterval) {
        clearInterval(enemyMoveInterval); // Clear existing interval if any
    }
    console.log(`Starting enemy movement interval (${intervalMs}ms)`);
    enemyMoveInterval = setInterval(() => {
        enemies.forEach(enemy => enemy.move());
    }, intervalMs);
}

function stopEnemyMovement() {
    if (enemyMoveInterval) {
        clearInterval(enemyMoveInterval);
        enemyMoveInterval = null;
        console.log("Stopped enemy movement interval.");
    }
}
