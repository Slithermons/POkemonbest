// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13); // Default view if geolocation fails

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Get user's location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        // Success Callback
        position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            map.setView([lat, lon], 16); // Center map on user's location with higher zoom
            L.marker([lat, lon]).addTo(map) // Add a marker at the user's location
                .bindPopup('You are here!')
                .openPopup();
            spawnPokemon(lat, lon); // Spawn Pokemon near the user
        },
        // Error Callback
        () => {
            console.log("Geolocation failed. Using default location.");
            const defaultLat = 51.505;
            const defaultLon = -0.09;
            // Optionally, add a marker at the default location
            L.marker([defaultLat, defaultLon]).addTo(map)
                .bindPopup('Default location.')
                .openPopup();
            spawnPokemon(defaultLat, defaultLon); // Spawn Pokemon near default location
        }
    );
} else {
    // Geolocation not supported
    console.log("Geolocation is not supported by this browser.");
    const defaultLat = 51.505;
    const defaultLon = -0.09;
    // Optionally, add a marker at the default location
    L.marker([defaultLat, defaultLon]).addTo(map)
        .bindPopup('Default location.')
        .openPopup();
    spawnPokemon(defaultLat, defaultLon); // Spawn Pokemon near default location
}

// --- Pokemon Data and Spawning ---

const pokemonData = [
    { name: 'Pikachu', img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
    { name: 'Bulbasaur', img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png' },
    { name: 'Charmander', img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' },
    { name: 'Squirtle', img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png' }
];

function spawnPokemon(centerLat, centerLon) {
    const spawnRadius = 0.005; // Approx 500 meters
    const numPokemon = 5;

    for (let i = 0; i < numPokemon; i++) {
        const randomAngle = Math.random() * 2 * Math.PI;
        const randomRadius = Math.random() * spawnRadius;
        const lat = centerLat + randomRadius * Math.cos(randomAngle);
        const lon = centerLon + randomRadius * Math.sin(randomAngle) / Math.cos(centerLat * Math.PI / 180); // Adjust longitude based on latitude

        const randomPokemon = pokemonData[Math.floor(Math.random() * pokemonData.length)];

        const pokemonIcon = L.icon({
            iconUrl: randomPokemon.img,
            iconSize: [40, 40], // size of the icon
            iconAnchor: [20, 20], // point of the icon which will correspond to marker's location
            popupAnchor: [0, -20] // point from which the popup should open relative to the iconAnchor
        });

        L.marker([lat, lon], { icon: pokemonIcon }).addTo(map)
            .bindPopup(`A wild ${randomPokemon.name} appeared!`)
            .on('click', () => {
                // TODO: Implement catching logic
                alert(`You clicked on ${randomPokemon.name}! Catching logic not implemented yet.`);
            });
    }
    console.log(`Spawned ${numPokemon} Pokemon around [${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}]`);
}


// TODO: Add interaction logic (catching Pokemon) - Basic click added
