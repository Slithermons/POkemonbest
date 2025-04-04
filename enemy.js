// Enemy system adapted for Leaflet map

// Note: enemyLayer is declared and initialized in script.js

class Enemy {
    constructor(lat, lon, layerGroup) {
        this.lat = lat;
        this.lon = lon;
        this.layerGroup = layerGroup; // Reference to the Leaflet layer group

        // Determine enemy type and properties
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
        // Determine name and power based on type
        if (typeRoll < 0.6) { // 60% chance for Associates
            this.name = "Associates";
            this.power = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
        } else if (typeRoll < 0.9) { // 30% chance for Soldiers
            this.name = "Soldiers";
            this.power = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
        } else { // 10% chance for Caporegimes
            this.name = "Caporegimes";
            this.power = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;
        }
        // Set initial direction (can be randomized later if needed)
        this.initialDirectionClass = 'walk-down';
        // No need to set icon properties here anymore, handled in constructor
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
    interact(player) {
        console.log(`Player interacting with ${this.name} (ID: ${this.id})`);
        // Example: Check distance, initiate combat, etc.
        alert(`You encountered ${this.name} (Power: ${this.power})! Combat not implemented yet.`);
        // TODO: Implement combat or other interaction
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
