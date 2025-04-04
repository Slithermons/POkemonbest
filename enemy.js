// Enemy system adapted for Leaflet map

// Layer group for enemy markers (initialized in script.js)
let enemyLayer;

class Enemy {
    constructor(lat, lon, layerGroup) {
        this.lat = lat;
        this.lon = lon;
        this.layerGroup = layerGroup; // Reference to the Leaflet layer group

        // Determine enemy type and properties
        this.setTypeAndProperties();

        // Create Leaflet icon
        this.icon = L.icon({
            iconUrl: this.sprite,
            iconSize: [40, 40], // Adjust size as needed
            iconAnchor: [20, 40],
            popupAnchor: [0, -40],
            className: 'enemy-marker map-icon-darktheme' // Add classes for styling/filtering
        });

        // Create Leaflet marker
        this.marker = L.marker([this.lat, this.lon], { icon: this.icon })
            .addTo(this.layerGroup)
            .bindPopup(`<b>${this.name}</b><br>Power: ${this.power}<br><button class="interact-enemy-button" data-enemy-id="${this.id}">Interact</button>`); // Added ID for interaction

        // Assign a unique ID (simple approach for now)
        this.id = `enemy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        this.marker.enemyId = this.id; // Store ID on marker for easy access in events

        console.log(`Created ${this.name} at (${this.lat.toFixed(5)}, ${this.lon.toFixed(5)}) with power ${this.power}`);
    }

    setTypeAndProperties() {
        const typeRoll = Math.random();
        let iconSize;
        if (typeRoll < 0.6) { // 60% chance for Associates
            this.name = "Associates";
            this.sprite = "img/gunman1.png";
            this.power = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
            iconSize = [35, 35];
        } else if (typeRoll < 0.9) { // 30% chance for Soldiers
            this.name = "Soldiers";
            this.sprite = "img/gunman2.png";
            this.power = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
            iconSize = [40, 40];
        } else { // 10% chance for Caporegimes
            this.name = "Caporegimes";
            this.sprite = "img/gunman3.png";
            this.power = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;
            iconSize = [45, 45];
        }
         // Recreate icon with potentially different size
         this.icon = L.icon({
            iconUrl: this.sprite,
            iconSize: iconSize,
            iconAnchor: [iconSize[0] / 2, iconSize[1]], // Adjust anchor based on size
            popupAnchor: [0, -iconSize[1]],
            className: 'enemy-marker map-icon-darktheme'
        });
    }

    // Simplified movement: Randomly move within a small radius
    move() {
        const moveDistanceLat = (Math.random() - 0.5) * 0.0002; // Small random offset lat
        const moveDistanceLon = (Math.random() - 0.5) * 0.0003; // Small random offset lon

        const newLat = this.lat + moveDistanceLat;
        const newLon = this.lon + moveDistanceLon;

        // Basic boundary check (optional, keep within general area)
        // if (newLat > MAX_LAT || newLat < MIN_LAT || newLon > MAX_LON || newLon < MIN_LON) return;

        this.lat = newLat;
        this.lon = newLon;

        if (this.marker) {
            this.marker.setLatLng([this.lat, this.lon]);
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
