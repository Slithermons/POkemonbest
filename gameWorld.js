// --- Global Game State & Variables ---
let map = null; // Declare map globally
let currentUserLocation = null; // Variable to store user's current location { lat: number, lon: number }
let userMarker = null; // Variable to store the marker for the user's location (Leaflet Marker)

// Declare layer groups globally (initialize in initialization.js)
let baseLayer = null;
let businessLayer = null;
let enemyLayer = null;
let cashDropLayer = null;
let rivalLayer = null;

let fetchedBounds = null; // Keep track of areas where bases have been fetched (Leaflet LatLngBounds)
let basesCache = {}; // Cache found bases {id: baseInfo}
let displayedBaseIds = new Set(); // Keep track of displayed base IDs to avoid duplicates
let businessesCache = {}; // Cache found businesses {id: businessInfo}
let displayedBusinessIds = new Set(); // Keep track of displayed business IDs
let currentCash = 0; // Player's current cash amount
let currentUserOrganization = null; // Variable to store the user's current organization { name: string, abbreviation: string }
let currentOrganizationBaseLocation = null; // Store the LatLon of the joined org's base { lat: number, lon: number }


// --- Player State ---
let playerCurrentHp = 100; // Current health points
let playerMaxHp = 100;     // Maximum health points
let playerInventory = []; // Array to hold item/weapon objects possessed by the player [{ id: string, quantity?: number, ammo?: number }]
let playerUsername = ''; // Variable for username
let playerAlias = ''; // Variable for alias - May become secondary if wallet is primary ID

// --- Player ID Management ---
let currentPlayerId = null; // Start as null, will be set by wallet or SaveManager.loadGame

// --- Game State Object (Placeholder, state primarily managed via globals for now) ---
// The SaveManager.saveGame function will gather state from globals via gatherCurrentGameState()
let gameState = {}; // This will be populated by initialization.js using SaveManager.loadGame

// --- Daily Limits & Tracking ---
const MAX_DAILY_PROTECTION_REMOVALS = 2;
let protectionRemovalsToday = 0; // In-memory count for the current session
let lastProtectionRemovalDate = ''; // YYYY-MM-DD format

// Helper function to get current date as YYYY-MM-DD
function getCurrentDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Function to load daily removal limit data from localStorage
function loadDailyRemovalLimit() {
    const savedDate = localStorage.getItem('lastProtectionRemovalDate');
    const savedCount = localStorage.getItem('protectionRemovalsToday');
    const currentDate = getCurrentDateString();

    if (savedDate === currentDate) {
        lastProtectionRemovalDate = savedDate;
        protectionRemovalsToday = parseInt(savedCount || '0', 10);
    } else {
        // It's a new day or no data saved yet
        lastProtectionRemovalDate = currentDate; // Set to today
        protectionRemovalsToday = 0; // Reset count
        // Save the reset state immediately
        saveDailyRemovalLimit();
    }
    console.log(`Loaded daily removal limit: ${protectionRemovalsToday} removals on ${lastProtectionRemovalDate}`);
}

// Function to save daily removal limit data to localStorage
function saveDailyRemovalLimit() {
    try {
        localStorage.setItem('lastProtectionRemovalDate', lastProtectionRemovalDate);
        localStorage.setItem('protectionRemovalsToday', protectionRemovalsToday.toString());
        console.log(`Saved daily removal limit: ${protectionRemovalsToday} removals on ${lastProtectionRemovalDate}`);
    } catch (e) {
        console.error("Failed to save daily removal limit to localStorage:", e);
        // Optionally alert the user if localStorage is unavailable/full
        showCustomAlert("Warning: Could not save game progress (daily limits). Storage might be full or disabled.");
    }
}

// NOTE: loadDailyRemovalLimit() needs to be called during game initialization.

// --- Player State Persistence (REMOVED - Handled by SaveManager) ---
// Removed savePlayerState, loadPlayerState, getPlayerStateKey functions

// --- Gather Game State for Saving ---
// Helper function to collect current game state from global variables
function gatherCurrentGameState() {
    // --- Gather Protected Business IDs ---
    const protectedBusinessIds = [];
    for (const businessId in businessesCache) {
        const biz = businessesCache[businessId];
        if (biz.protectingUsers && biz.protectingUsers.some(user => user.userId === currentPlayerId)) {
            protectedBusinessIds.push(businessId);
        }
    }

    // --- Prepare Serializable Business Cache State ---
    const businessesToSave = {};
    for (const businessId in businessesCache) {
        const biz = businessesCache[businessId];
        if ((biz.protectingUsers && biz.protectingUsers.length > 0) || biz.lastCollected > 0) {
             businessesToSave[businessId] = {
                id: biz.id,
                lastCollected: biz.lastCollected,
                protectingOrganization: biz.protectingOrganization,
                protectionPower: biz.protectionPower,
                protectingUsers: biz.protectingUsers || []
            };
        }
    }

    // Construct the state object matching SaveManager's expectations
    const currentState = {
        player: {
            id: currentPlayerId, // Include player ID
            username: playerUsername,
            alias: playerAlias,
            level: playerLevel,
            cash: currentCash,
            power: playerPower, // Calculated power
            hp: playerCurrentHp,
            maxHp: playerMaxHp, // Calculated max HP
            inventory: playerInventory,
            equipment: playerEquipment,
            organization: currentUserOrganization,
            orgBaseLocation: currentOrganizationBaseLocation, // Added org base location
            experience: playerExperience,
            expNeeded: calculateExpNeeded(playerLevel), // Calculated EXP needed
            stats: playerStats, // Base stats
            characterStats: playerCharacterStats, // Derived stats
            location: currentUserLocation // Current location
        },
        businesses: businessesToSave, // Save relevant business state
        protectedBusinessIds: protectedBusinessIds, // IDs of businesses player protects
        settings: {
            soundOn: typeof isSoundEnabled !== 'undefined' ? isSoundEnabled : true // Get sound setting
        }
        // Add other global state parts if needed
    };
    // console.log("Gathered game state:", JSON.stringify(currentState, null, 2)); // Debug log
    return currentState;
}
// Make it globally accessible if needed elsewhere (e.g., for debugging)
window.gatherCurrentGameState = gatherCurrentGameState;


function initializeNewPlayerState(playerId) {
    console.log(`Initializing new player state for ID: ${playerId}`);
    currentPlayerId = playerId; // Set the ID
    playerLevel = 1;
    playerExperience = 0;
    playerStats = { influence: 10, strength: 10, agility: 10, vitality: 10, hitRate: 10 };
    playerInventory = [];
    playerEquipment = { Head: null, Mask: null, Body: null, Gloves: null, Pants: null, Boots: null, Accessory: null, Charm: null, Weapon: null };
    currentCash = 100; // Start with some cash
    currentUserOrganization = null;
    currentOrganizationBaseLocation = null;
    playerUsername = ''; // Clear username/alias for new profile
    playerAlias = '';

    // Calculate initial derived stats
    calculatePlayerPower();
    calculateCharacterStats(); // This calculates max HP and sets current HP
    playerCurrentHp = playerMaxHp; // Start with full HP

    console.log(`New player state initialized. HP: ${playerCurrentHp}/${playerMaxHp}, Cash: ${currentCash}`);

    // Save this initial state immediately using SaveManager
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    } else {
        console.error("SaveManager not available during new player initialization!");
    }
}

function resetLocalPlayerState() {
    console.log("Resetting local player state variables to defaults (simulating logout).");
    // Reset variables to initial defaults, similar to initializeNewPlayerState but without saving
    currentPlayerId = null; // Clear the ID
    playerLevel = 1;
    playerExperience = 0;
    playerStats = { influence: 10, strength: 10, agility: 10, vitality: 10, hitRate: 10 };
    playerInventory = [];
    playerEquipment = { Head: null, Mask: null, Body: null, Gloves: null, Pants: null, Boots: null, Accessory: null, Charm: null, Weapon: null };
    currentCash = 0; // Reset cash to 0 for logged-out state
    currentUserOrganization = null;
    currentOrganizationBaseLocation = null;
    playerUsername = '';
    playerAlias = '';

    // Recalculate derived stats for the default state
    calculatePlayerPower();
    calculateCharacterStats();
    playerCurrentHp = playerMaxHp; // Full HP for default state

    // Trigger UI updates to reflect the reset state
    triggerUIUpdates();
    // Do NOT save here, this is just resetting the local view
}


// --- Player Stats & Level ---
let playerLevel = 1; // Default value, will be overwritten by loadPlayerState
let playerExperience = 0; // Default value
let playerStats = { // Default value
    influence: 10,
    strength: 10,
    agility: 10,
    vitality: 10,
    hitRate: 10
};
let playerPower = 0; // Calculated from stats
let playerCharacterStats = { // Calculated from base stats and equipment - Default value
    defence: 0,
    evasionRate: 0,
    criticalRate: 0,
    maxHp: 100, // Will be recalculated
    damage: 0
};
// Updated playerEquipment structure - Default value
let playerEquipment = {
    Head: null, Mask: null, Body: null, Gloves: null, Pants: null,
    Boots: null, Accessory: null, Charm: null, Weapon: null
};

// --- Constants ---
const MANUAL_JOIN_DISTANCE = 2000; // Max distance in meters to MANUALLY join an organization by clicking
const AUTO_JOIN_SEARCH_RADIUS = 10000; // Initial search radius in meters for auto-joining
const TERRITORY_RADIUS = 2000; // 2km radius for territory control (used for profit collection)
const PROTECTION_ACTIVATION_RANGE = 2000; // 2km radius for activating protection
const MAX_PROTECTING_USERS = 10; // Max users *per org* protecting a business
const MAX_PLAYER_PROTECTED_BUSINESSES = 15; // Max businesses a single player can protect
const VISIBILITY_RADIUS_METERS = 2000; // 2km radius for showing markers
const CASH_COLLECTION_DISTANCE = 50; // Keep cash collection range short
const PROFIT_RATE_PER_MINUTE = 1.0; // $1 per minute base rate
const PROFIT_RATE_PER_MS = PROFIT_RATE_PER_MINUTE / (60 * 1000); // Dollars per millisecond
const MAX_ACCUMULATION_MINUTES = 60; // Max profit accumulation time (e.g., 1 hour)
const MAX_ACCUMULATION_MS = MAX_ACCUMULATION_MINUTES * 60 * 1000;
const ITEM_DROP_CHANCE = 0.2; // 20% chance for item from cash drop

// --- Cash Drop Data ---
const cashDropData = { name: 'Cash Drop', minAmount: 50, maxAmount: 500 };

// --- Rival Data ---
const rivalData = [
    { name: 'Tony "The Shark" Gambino' },
    { name: 'Vinnie "The Viper" Rossi' },
    { name: 'Silvio "The Ghost" Moretti' }
];

// --- Utility Functions ---

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

// --- Player Stat Calculations ---

// Function to calculate player power
function calculatePlayerPower() {
    playerPower = playerStats.influence +
                  playerStats.strength +
                  playerStats.agility +
                  playerStats.vitality +
                  playerStats.hitRate;
    // TODO: Update UI if power is displayed anywhere (This will be in uiManager.js)
    console.log("Calculated Player Power:", playerPower);
}

// Function to calculate Max HP based on Vitality
function calculateMaxHp() {
    // Base HP + Bonus from Vitality + Bonus from Equipment (if any)
    // Example: Base 100, +10 HP per Vitality point
    let equipmentHpBonus = 0;
    // Iterate through equipment to find any Max HP bonuses
    for (const slot in playerEquipment) {
        const itemId = playerEquipment[slot];
        if (itemId) {
            const item = getEquipmentById(itemId); // Assumes getEquipmentById is available
            if (item && item.stats && item.stats.maxHp) {
                equipmentHpBonus += item.stats.maxHp;
            }
        }
    }

    playerMaxHp = 100 + (playerStats.vitality * 10) + equipmentHpBonus;
    playerCharacterStats.maxHp = playerMaxHp; // Store in derived stats too

    // Ensure current HP doesn't exceed new max HP
    playerCurrentHp = Math.min(playerCurrentHp, playerMaxHp);

    console.log(`Calculated Max HP: ${playerMaxHp}, Current HP adjusted to: ${playerCurrentHp}`);
    // UI update will be handled separately
}


// Function to calculate derived character stats
function calculateCharacterStats() {
    // Calculate Max HP first as it might depend on base stats/equipment
    calculateMaxHp();

    // Reset derived stats before recalculating
    playerCharacterStats.defence = 0;
    playerCharacterStats.evasionRate = 0;
    playerCharacterStats.criticalRate = 0;
    playerCharacterStats.damage = 0; // Reset damage

    // Base stats contribution
    playerCharacterStats.damage += playerStats.strength; // Base damage from strength
    playerCharacterStats.defence += (playerStats.vitality * 2);
    playerCharacterStats.evasionRate += (playerStats.agility / 2);
    playerCharacterStats.criticalRate += playerStats.hitRate; // Base crit rate from hit rate

    // Get total stats from equipment
    let totalEquipmentDefence = 0;
    let totalEquipmentEvasion = 0;
    let totalEquipmentHitRateBonus = 0; // Bonus to base hit rate (which affects crit)
    let totalEquipmentCriticalRateBonus = 0; // Direct critical rate bonus
    let totalEquipmentAdditionalDamage = 0; // Damage bonus from equipment

    // Iterate through equipped item IDs using the updated keys
    for (const slot in playerEquipment) { // Iterates over 'Head', 'Mask', 'Body', etc.
        const itemId = playerEquipment[slot]; // Get the ID of the item in the slot
        if (itemId) {
            // Fetch the full equipment object from the database (assuming equipment.js is loaded)
            if (typeof getEquipmentById !== 'function') {
                console.error("getEquipmentById function not found! Make sure equipment.js is loaded before gameWorld.js");
                continue;
            }
            const equipmentItem = getEquipmentById(itemId);
            if (equipmentItem && equipmentItem.stats) {
                totalEquipmentDefence += equipmentItem.stats.defence || 0;
                totalEquipmentEvasion += equipmentItem.stats.evasionRate || 0;
                totalEquipmentHitRateBonus += equipmentItem.stats.hitRate || 0; // Accumulate hit rate bonus
                totalEquipmentCriticalRateBonus += equipmentItem.stats.criticalRate || 0; // Accumulate direct critical rate bonus
                totalEquipmentAdditionalDamage += equipmentItem.stats.additionalDamage || 0; // Accumulate damage bonus
            }
        }
    }

    // Add equipment bonuses to derived stats
    playerCharacterStats.defence += totalEquipmentDefence;
    playerCharacterStats.evasionRate += totalEquipmentEvasion;
    // Critical Rate = Base Hit Rate + Equipment Hit Rate Bonus + Equipment Direct Critical Rate Bonus
    playerCharacterStats.criticalRate += totalEquipmentHitRateBonus + totalEquipmentCriticalRateBonus;
    // Damage = Base Strength + Equipment Damage Bonus
    playerCharacterStats.damage += totalEquipmentAdditionalDamage;

    console.log("Calculated Character Stats:", playerCharacterStats);
    // Update relevant UI elements immediately after calculation
    updateHpUI(); // Update HP bar in case Max HP changed
    // REMOVED: updateStatsModalUI(); // DO NOT update stats modal from here - causes recursion
}

// --- Equipment Management ---

function equipItem(itemId) {
    // 1. Get Item Definition & Check Type
    const itemToEquip = getEquipmentById(itemId); // From equipment.js
    if (!itemToEquip || itemToEquip.itemType !== 'Equipment') {
        console.error(`Item ${itemId} is not valid equipment.`);
        showCustomAlert("This item cannot be equipped.");
        return;
    }

    // 2. Check if Player Has the Item in Inventory
    const inventoryIndex = playerInventory.findIndex(entry => entry.id === itemId);
    if (inventoryIndex === -1) {
        console.error(`Attempted to equip item ${itemId} not found in inventory.`);
        showCustomAlert("You don't have this item in your inventory.");
        return;
    }

    // 3. Check Requirements
    // Combine base stats and character stats for requirement checks if needed,
    // or just use base playerStats as defined in equipment.js meetsRequirements
    const combinedStatsForReqCheck = { ...playerStats, level: playerLevel }; // Add level for checks
    if (!itemToEquip.meetsRequirements(combinedStatsForReqCheck)) {
        console.log(`Player does not meet requirements for ${itemToEquip.name}.`);
        // Construct a more informative message
        let reqMessage = "Requirements not met:";
        for (const req in itemToEquip.requirements) {
            reqMessage += ` ${req} ${itemToEquip.requirements[req]} (You have: ${combinedStatsForReqCheck[req] || 0})`;
        }
        showCustomAlert(reqMessage);
        return;
    }

    // 4. Determine Slot & Handle Existing Item
    const slotType = itemToEquip.equipmentType; // e.g., EquipmentType.HEAD
    if (!playerEquipment.hasOwnProperty(slotType)) {
        console.error(`Invalid equipment slot type: ${slotType}`);
        return;
    }

    const currentlyEquippedItemId = playerEquipment[slotType];
    if (currentlyEquippedItemId) {
        // Unequip the item currently in the slot first
        unequipItem(slotType, false); // Pass false to prevent immediate UI update/recalculation yet
    }

    // 5. Move Item from Inventory to Equipment Slot
    // Remove one instance from inventory
    if (playerInventory[inventoryIndex].quantity > 1) {
        playerInventory[inventoryIndex].quantity -= 1;
    } else {
        playerInventory.splice(inventoryIndex, 1);
    }
    playerEquipment[slotType] = itemId; // Assign the new item ID to the slot

    // 6. Recalculate Stats & Update UI
    console.log(`Equipped ${itemToEquip.name} in ${slotType} slot.`);
    calculateCharacterStats(); // Recalculate derived stats
    updateInventoryUI(); // Update inventory modal
    updateEquipmentUI(); // Update equipment modal (defined in uiManager.js)
    showCustomAlert(`Equipped ${itemToEquip.name}.`);

    // Save game state after equipping
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    }
}

function unequipItem(slotType, triggerRecalculation = true) {
    if (!playerEquipment.hasOwnProperty(slotType)) {
        console.error(`Invalid equipment slot type: ${slotType}`);
        return;
    }

    const itemIdToUnequip = playerEquipment[slotType];
    if (!itemIdToUnequip) {
        console.log(`No item equipped in ${slotType} slot.`);
        return; // Nothing to unequip
    }

    // 1. Add Item Back to Inventory
    addItemToInventory(itemIdToUnequip, 1); // Adds back to inventory stack or creates new entry

    // 2. Clear Equipment Slot
    playerEquipment[slotType] = null;

    // 3. Recalculate Stats & Update UI (optional based on flag)
    const item = getEquipmentById(itemIdToUnequip);
    console.log(`Unequipped ${item ? item.name : itemIdToUnequip} from ${slotType} slot.`);
    if (triggerRecalculation) {
        calculateCharacterStats(); // Recalculate derived stats
        updateInventoryUI(); // Update inventory modal
        updateEquipmentUI(); // Update equipment modal
        showCustomAlert(`Unequipped ${item ? item.name : 'item'}.`);

        // Save game state after unequipping
        if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
            SaveManager.saveGame(gatherCurrentGameState());
        }
    }
}


// --- Experience & Leveling ---
function calculateExpNeeded(level) {
    return level * 100; // Simple formula: 100 EXP for level 1, 200 for level 2, etc.
}

function gainExperience(amount) {
    if (amount <= 0) return;

    playerExperience += amount;
    console.log(`Gained ${amount} EXP. Total: ${playerExperience}`);

    let expNeeded = calculateExpNeeded(playerLevel);
    let leveledUp = false;

    // Check for level up
    while (playerExperience >= expNeeded) {
        playerLevel++;
        playerExperience -= expNeeded; // Subtract EXP needed for the level just gained
        leveledUp = true;
        console.log(`Level Up! Reached Level ${playerLevel}. Remaining EXP: ${playerExperience}`);
        // TODO: Add stat point allocation or other level up benefits
        showCustomAlert(`Level Up! You reached Level ${playerLevel}!`); // Alert the player

        // Recalculate needed EXP for the *new* level
        expNeeded = calculateExpNeeded(playerLevel);
    }

    // Update UI (function to be added in uiManager.js)
    updateExperienceUI();

    // If leveled up, recalculate stats as they might depend on level (though not currently implemented)
    if (leveledUp) {
        calculateCharacterStats(); // Recalculate derived stats like Max HP
    }

    // Save game state after experience gain/level up
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    }
}


// --- HP Management ---
function healPlayer(amount) {
    if (amount <= 0) return;
    playerCurrentHp = Math.min(playerCurrentHp + amount, playerMaxHp);
    console.log(`Player healed by ${amount}. Current HP: ${playerCurrentHp}/${playerMaxHp}`);
    updateHpUI(); // Update UI immediately (function defined in uiManager.js)
    // Save game state after healing
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    }
}

function damagePlayer(amount) {
    if (amount <= 0) return;
    playerCurrentHp = Math.max(playerCurrentHp - amount, 0);
    console.log(`Player damaged by ${amount}. Current HP: ${playerCurrentHp}/${playerMaxHp}`);
    updateHpUI(); // Update UI immediately (function defined in uiManager.js)
    // TODO: Add logic for player death if HP reaches 0

    // Save game state after taking damage
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    }
}

// --- HP Regeneration ---
let hpRegenInterval = null;
const HP_REGEN_AMOUNT = 5;
const HP_REGEN_INTERVAL_MS = 60 * 1000; // 1 minute

function startHpRegeneration() {
    if (hpRegenInterval) {
        clearInterval(hpRegenInterval); // Clear existing interval if any
    }
    console.log(`Starting HP regeneration: ${HP_REGEN_AMOUNT} HP every ${HP_REGEN_INTERVAL_MS / 1000} seconds.`);
    hpRegenInterval = setInterval(() => {
        if (playerCurrentHp < playerMaxHp) {
            healPlayer(HP_REGEN_AMOUNT); // healPlayer now handles saving
        } else {
            // Optional: log that HP is full
            // console.log("HP is full, no regeneration needed.");
        }
    }, HP_REGEN_INTERVAL_MS);
}

function stopHpRegeneration() {
     if (hpRegenInterval) {
        clearInterval(hpRegenInterval);
        hpRegenInterval = null;
        console.log("Stopped HP regeneration.");
    }
}


// --- Inventory Management ---

// Function to add an item/weapon to inventory
function addItemToInventory(itemId, quantity = 1) {
    // Ensure itemsDatabase and equipmentDatabase are available (defined in items.js/equipment.js)
    if (typeof itemsDatabase === 'undefined' || typeof equipmentDatabase === 'undefined') {
        console.error("itemsDatabase or equipmentDatabase not found! Make sure items.js and equipment.js are loaded before gameWorld.js");
        return;
    }
    const itemDefinition = itemsDatabase.get(itemId) || equipmentDatabase.get(itemId); // Use the Maps

    if (!itemDefinition) {
        console.error(`Attempted to add unknown item: ${itemId}`);
        return;
    }

    // Find existing entry for stackable items (consumables or maybe ammo?)
    // Equipment is generally not stackable in inventory (each is unique)
    const isStackable = itemDefinition.stackable !== false; // Default to true if undefined
    const existingEntryIndex = playerInventory.findIndex(entry => entry.id === itemId && isStackable);

    if (existingEntryIndex > -1 && isStackable) {
        playerInventory[existingEntryIndex].quantity = (playerInventory[existingEntryIndex].quantity || 1) + quantity;
    } else {
        // Add new entry - quantity is 1 unless specified otherwise for a stackable item
        const newEntry = { id: itemId, quantity: (isStackable ? quantity : 1) };
        playerInventory.push(newEntry);
    }
    // Add detailed log to check the array state immediately after modification
    console.log('Player Inventory AFTER modification in addItemToInventory:', JSON.stringify(playerInventory));

    // Log added item, but UI update will be handled by the calling context (e.g., shop buy handler)
    console.log(`Added ${quantity}x ${itemDefinition.name} to inventory data.`);
    // updateInventoryUI(); // REMOVED: Let the calling function handle the UI update

    // Save game state after adding item (caller might also save, but this ensures it)
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    }
}

// Function to remove an item from inventory (by ID, removes one quantity)
function removeItemFromInventory(itemId, quantity = 1) {
    const itemIndex = playerInventory.findIndex(entry => entry.id === itemId);

    if (itemIndex > -1) {
        const itemDefinition = itemsDatabase.get(itemId) || equipmentDatabase.get(itemId);
        const isStackable = itemDefinition ? (itemDefinition.stackable !== false) : false; // Assume not stackable if definition missing
        let itemRemoved = false;

        if (isStackable && playerInventory[itemIndex].quantity > quantity) {
            playerInventory[itemIndex].quantity -= quantity;
            itemRemoved = true;
        } else if (isStackable && playerInventory[itemIndex].quantity <= quantity) {
             // Remove the whole entry if quantity drops to 0 or less
            playerInventory.splice(itemIndex, 1);
            itemRemoved = true;
        } else if (!isStackable) {
             // Remove the whole entry if not stackable
             playerInventory.splice(itemIndex, 1);
             itemRemoved = true;
        }


        if (itemRemoved) {
            console.log(`Removed ${quantity}x ${itemId} from inventory.`);
            updateInventoryUI(); // Update the inventory modal UI immediately

            // Save game state after removing item
            if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
                SaveManager.saveGame(gatherCurrentGameState());
            }
            return true; // Indicate success
        } else {
             console.warn(`Could not remove ${quantity}x ${itemId}. Quantity issue?`);
             return false;
        }

    } else {
        console.warn(`Attempted to remove item not found in inventory: ${itemId}`);
        return false; // Indicate failure
    }
}

// Function to handle using an item from inventory
function useItem(itemId) {
    const itemDefinition = getItemById(itemId); // getItemById is in items.js
    if (!itemDefinition) {
        // Check if it's equipment instead
        const equipDefinition = getEquipmentById(itemId); // from equipment.js
        if (equipDefinition && equipDefinition.itemType === 'Equipment') {
            // If it's equipment, try to equip it instead of using it
            equipItem(itemId); // Call the equip function (equipItem handles saving)
            return; // Stop further execution in useItem
        }
        // If not found in either database
        console.error(`Attempted to use unknown item: ${itemId}`);
        showCustomAlert("Unknown item!"); // Use custom alert (defined in uiManager.js)
        return;
    }

    // Check if player actually has the item
    const inventoryEntry = playerInventory.find(entry => entry.id === itemId);
    if (!inventoryEntry) {
        console.error(`Attempted to use item not in inventory: ${itemId}`);
        showCustomAlert("You don't have that item!");
        return;
    }

    console.log(`Attempting to use item: ${itemDefinition.name}`);

    // Handle Consumables
    if (itemDefinition.itemType === ItemType.CONSUMABLE) {
        let used = false;
        // Apply effect (e.g., healing)
        if (itemDefinition.effect && itemDefinition.effect.health) {
            if (playerCurrentHp < playerMaxHp) {
                healPlayer(itemDefinition.effect.health); // healPlayer handles saving
                showCustomAlert(`Used ${itemDefinition.name}. Restored ${itemDefinition.effect.health} HP.`);
                used = true;
            } else {
                showCustomAlert(`${itemDefinition.name} has no effect. HP is already full.`);
                return; // Don't consume if no effect
            }
        }
        // Add other consumable effects here (e.g., drugs, food)
        // else if (itemDefinition.effect && itemDefinition.effect.boost) { ... }

        // Remove item from inventory if used
        if (used) {
            removeItemFromInventory(itemId, 1); // removeItemFromInventory handles saving
            // removeItemFromInventory already calls updateInventoryUI
        }
    }
    // Handle Non-Consumables (Tools, Keys, etc.) - if needed
    else if (itemDefinition.itemType === ItemType.NON_CONSUMABLE) {
        // Example: Using a lockpick
        if (itemDefinition.subType === NonConsumableType.UTILITY && itemId === 'UTIL001') {
            showCustomAlert("Used Lockpick Set - Feature not implemented yet.");
            // Potentially add durability or chance-based usage later
        } else {
            showCustomAlert(`${itemDefinition.name} cannot be used like this.`);
        }
        }
    // Handle Equipment (should have been caught earlier, but as fallback)
    else if (itemDefinition.itemType === ItemType.EQUIPMENT) {
         showCustomAlert(`${itemDefinition.name} must be equipped, not used directly. Try equipping from the Equipment screen.`);
    }
    else {
        showCustomAlert(`Cannot use ${itemDefinition.name} right now.`);
    }
}


// --- Marker Visibility based on Distance ---
function updateMarkersVisibility(playerLat, playerLon) {
    if (!playerLat || !playerLon) {
        console.warn("Cannot update marker visibility without player location.");
        return;
    }
    // console.log(`Updating marker visibility within ${VISIBILITY_RADIUS_METERS}m of [${playerLat.toFixed(5)}, ${playerLon.toFixed(5)}]`);

    // Ensure enemies array is available (defined in enemy.js)
    if (typeof enemies === 'undefined') {
        console.error("Global 'enemies' array not found! Make sure enemy.js is loaded before gameWorld.js");
        // Optionally return or proceed without enemy visibility updates
    }

    const layersToFilter = [
        { layer: enemyLayer, name: "Enemies", cache: typeof enemies !== 'undefined' ? enemies : [], idField: 'id', markerField: 'marker', latField: 'lat', lonField: 'lon' },
        { layer: cashDropLayer, name: "Cash Drops" }, // No central cache array assumed, managed directly in layer
        { layer: rivalLayer, name: "Rivals" },       // No central cache array assumed, managed directly in layer
        { layer: baseLayer, name: "Bases", cache: Object.values(basesCache), idField: 'id', markerField: null, latField: 'lat', lonField: 'lon' }, // No direct marker ref in cache
        { layer: businessLayer, name: "Businesses", cache: Object.values(businessesCache), idField: 'id', markerField: 'marker', latField: 'lat', lonField: 'lon' }
    ];

    layersToFilter.forEach(({ layer, name, cache, idField, markerField, latField, lonField }) => {
        if (!map.hasLayer(layer)) {
             // If the layer itself isn't visible (e.g., if zoom toggling were re-added), skip
             // console.log(`${name} layer is not currently on the map, skipping visibility check.`);
             // return;
        }

        let addedCount = 0;
        let removedCount = 0;
        const currentLayerMarkers = layer.getLayers(); // Get markers currently on the layer

        // --- Removal Phase ---
        // Iterate over markers currently on the map layer
        currentLayerMarkers.forEach(marker => {
            const markerLatLng = marker.getLatLng();
            const distance = calculateDistance(playerLat, playerLon, markerLatLng.lat, markerLatLng.lng);

            if (distance > VISIBILITY_RADIUS_METERS) {
                layer.removeLayer(marker); // Remove directly from the layer
                removedCount++;
            }
        });

        // --- Addition Phase ---
        // Iterate through the source cache/array for this type of item
        if (cache && latField && lonField) {
            cache.forEach(itemInfo => {
                const itemLat = itemInfo[latField];
                const itemLon = itemInfo[lonField];
                const distance = calculateDistance(playerLat, playerLon, itemLat, itemLon);

                if (distance <= VISIBILITY_RADIUS_METERS) {
                    let markerInstance = null;
                    // Try to find the marker instance
                    if (markerField && itemInfo[markerField]) {
                        markerInstance = itemInfo[markerField];
                    } else if (layer === baseLayer && idField) {
                        // Special handling for bases: find marker by ID stored elsewhere or via popup content (less reliable)
                        // This assumes displayBases adds the marker and we need to find it if it was removed.
                        // A better way: store marker ref in basesCache if possible during displayBases.
                        // Fallback: Search the layer (less efficient if layer is large)
                         markerInstance = currentLayerMarkers.find(m => m.baseId === itemInfo[idField]); // Assumes baseId was added to marker
                         // If baseId wasn't added, this won't work well.
                    } else if (layer === enemyLayer && idField && itemInfo.marker) {
                         markerInstance = itemInfo.marker; // Enemies store their marker ref
                    } else if (layer === businessLayer && idField && itemInfo.marker) {
                         markerInstance = itemInfo.marker; // Businesses store their marker ref
                    }


                    // If a marker exists for this item but isn't on the layer, add it back
                    if (markerInstance && !layer.hasLayer(markerInstance)) {
                        layer.addLayer(markerInstance);
                        addedCount++;
                    }
                    // Note: This doesn't handle creating *new* markers here.
                    // It assumes markers are created elsewhere (e.g., displayBases, spawnEnemies)
                    // and this function only manages their visibility on the layer.
                }
            });
        } else if (!cache) {
             // For layers like cash drops/rivals where we don't have a central cache array,
             // the removal logic is sufficient. They only get added during spawn events.
        }


        // if (addedCount > 0 || removedCount > 0) {
        //     console.log(`${name}: Added ${addedCount}, Removed ${removedCount} markers based on distance.`);
        // }
    });
}


// --- Organization/Base Logic ---

// Function to generate organization name from church name
function generateOrganizationName(churchName) {
    if (!churchName || churchName.trim() === "") {
        return { fullName: "Unknown Organization", abbreviation: "UNO" };
    }
    const words = churchName.split(' ').filter(w => w.length > 0);
    const abbreviation = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    return {
        fullName: `${churchName} Organization`,
        abbreviation: abbreviation || "ORG"
    };
}

// Function to fetch bases within specific map bounds
async function fetchBasesInBounds(bounds) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
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
        showCustomAlert("Could not fetch nearby bases. The service might be busy."); // Use custom alert (defined in uiManager.js)
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

        const orgInfo = generateOrganizationName(name);
        const baseInfo = {
            id: element.id,
            name: name, // Church name
            lat: lat,
            lon: lon,
            organizationName: orgInfo.fullName,
            organizationAbbreviation: orgInfo.abbreviation
        };
        basesCache[baseInfo.id] = baseInfo; // Cache the base info
        bases.push(baseInfo);
    });
    return bases;
}

// Function to handle MANUALLY joining an organization via click
function joinOrganizationManually(orgName, orgAbbr, baseLat, baseLon) {
     if (!currentUserLocation) {
        showCustomAlert("Cannot determine your location."); // Use custom alert (defined in uiManager.js)
        return;
    }
    if (currentUserOrganization) {
        showCustomAlert(`You are already in the ${currentUserOrganization.name}.`); // Use custom alert (defined in uiManager.js)
        return;
    }

    const distance = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, baseLat, baseLon);
    console.log(`Attempting to manually join ${orgName}. Distance: ${distance.toFixed(1)} meters.`);

    if (distance <= MANUAL_JOIN_DISTANCE) {
        currentUserOrganization = { name: orgName, abbreviation: orgAbbr };
        currentOrganizationBaseLocation = { lat: baseLat, lon: baseLon }; // Store base location
        console.log("Manually joined organization. Updating UI and markers.");
        updateOrganizationUI(); // Call UI update (defined in uiManager.js)
        updateBusinessMarkers(); // Explicitly update business icons/popups (defined below)
        showCustomAlert(`You have joined the ${orgName}!`); // Use custom alert (defined in uiManager.js)

        // Save game state after joining org
        if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
            SaveManager.saveGame(gatherCurrentGameState());
        }
    } else {
         showCustomAlert(`You are too far away from this base to join ${orgName}! You need to be within ${MANUAL_JOIN_DISTANCE}m. (Distance: ${distance.toFixed(1)}m)`); // Use custom alert (defined in uiManager.js)
    }
}

// Function to automatically find and potentially join the closest organization if none are within manual range
async function findAndJoinInitialOrganization(userLat, userLon) {
     if (currentUserOrganization) return; // Already in an organization

    console.log("Searching for initial organization...");
    const nearbyBases = await fetchBasesAroundPoint(userLat, userLon, AUTO_JOIN_SEARCH_RADIUS);

    if (!nearbyBases || nearbyBases.length === 0) {
        console.log("No bases found within search radius.");
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

    // Display all found bases regardless (displayBases is in uiManager.js)
    displayBases(nearbyBases);

    if (!baseWithinManualRangeExists && closestBase) {
        console.log(`No bases within ${MANUAL_JOIN_DISTANCE}m. Automatically joining closest base: ${closestBase.organizationName} at ${minDistance.toFixed(1)}m.`);
        currentUserOrganization = { name: closestBase.organizationName, abbreviation: closestBase.organizationAbbreviation };
        currentOrganizationBaseLocation = { lat: closestBase.lat, lon: closestBase.lon }; // Store base location
        console.log("Automatically joined organization. Updating UI and markers.");
        updateOrganizationUI(); // Call UI update (defined in uiManager.js)
        updateBusinessMarkers(); // Explicitly update business icons/popups (defined below)
        showCustomAlert(`No organizations found within ${MANUAL_JOIN_DISTANCE}m. You have been automatically assigned to the closest one: ${closestBase.organizationName}.`); // Use custom alert (defined in uiManager.js)

        // Save game state after auto-joining org
        if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
            SaveManager.saveGame(gatherCurrentGameState());
        }
    } else if (baseWithinManualRangeExists) {
         console.log(`Bases found within ${MANUAL_JOIN_DISTANCE}m. User must join manually.`);
         updateOrganizationUI(); // Call UI update (defined in uiManager.js)
         updateBusinessMarkers(); // Still update markers
    } else {
        console.log("Could not find any bases to automatically join.");
        updateBusinessMarkers(); // Update markers
    }
}

// Function to handle leaving an organization
function leaveOrganization() {
    if (!currentUserOrganization) {
        showCustomAlert("You are not currently in an organization."); // Use custom alert (defined in uiManager.js)
        return;
    }
    const orgName = currentUserOrganization.name;
    currentUserOrganization = null;
    currentOrganizationBaseLocation = null; // Clear base location
    console.log("Left organization. Updating UI and markers.");
    updateOrganizationUI(); // Call UI update (defined in uiManager.js)
    updateBusinessMarkers(); // Update business icons/popups (defined below)
    showCustomAlert(`You have left the ${orgName}.`); // Use custom alert (defined in uiManager.js)

    // Save game state after leaving org
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    }
}

// --- Cash Drop Logic ---

function collectCash(cashMarker, cashLat, cashLon) {
    if (!currentUserLocation) {
        showCustomAlert("Cannot determine your location."); // Use custom alert (defined in uiManager.js)
        return;
    }

    const distance = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, cashLat, cashLon);
    console.log(`Attempting to collect cash. Distance: ${distance.toFixed(1)} meters.`);

    if (distance <= CASH_COLLECTION_DISTANCE) {
        // Remove the collected cash drop marker
        if (cashDropLayer.hasLayer(cashMarker)) {
            cashDropLayer.removeLayer(cashMarker);
        } else {
            console.warn("Tried to remove cash marker that wasn't on its layer.");
        }

        let stateChanged = false;
        // Chance to get an item instead of cash
        if (Math.random() < ITEM_DROP_CHANCE) {
            // Give a random item (e.g., medkit for now)
            const droppedItemId = 'MED001'; // Example: always drop Standard Medkit
            const itemDef = getItemById(droppedItemId); // Get item details
            addItemToInventory(droppedItemId); // addItemToInventory handles saving
            showCustomAlert(`You found a ${itemDef ? itemDef.name : droppedItemId}!`); // Use custom alert (defined in uiManager.js)
            stateChanged = true; // Inventory changed
        } else {
            // Collect cash
            const amount = Math.floor(Math.random() * (cashDropData.maxAmount - cashDropData.minAmount + 1)) + cashDropData.minAmount;
            currentCash += amount;
            updateCashUI(currentCash); // Update UI (function defined in uiManager.js)
            showCustomAlert(`You collected $${amount}!`); // Use custom alert (defined in uiManager.js)
            stateChanged = true; // Cash changed
        }

        // Save game state if cash/item was collected
        if (stateChanged && typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
             // Note: addItemToInventory already saves, so this might be redundant if item dropped
             // But it ensures cash changes are saved.
            SaveManager.saveGame(gatherCurrentGameState());
        }
    } else {
        // Too far away
        showCustomAlert(`You are too far away to collect this cash! (Distance: ${distance.toFixed(1)}m)`); // Use custom alert (defined in uiManager.js)
    }
}

// Spawning Cash Drops
function spawnCashDrops(centerLat, centerLon) {
    const spawnRadius = 0.005; // Approx 500 meters
    const numDrops = 5;

    // Define a cash drop icon (e.g., money bag) - Icon definition moved to uiManager.js
    if (typeof cashIcon === 'undefined') {
        console.error("cashIcon is not defined! Ensure uiManager.js defines it.");
        return;
    }

    for (let i = 0; i < numDrops; i++) {
        const randomAngle = Math.random() * 2 * Math.PI;
        const randomRadius = Math.random() * spawnRadius;
        const lat = centerLat + randomRadius * Math.cos(randomAngle);
        const lon = centerLon + randomRadius * Math.sin(randomAngle) / Math.cos(centerLat * Math.PI / 180); // Adjust longitude

        const cashLat = lat; // Store drop's specific lat
        const cashLon = lon; // Store drop's specific lon

        const marker = L.marker([cashLat, cashLon], { icon: cashIcon }).addTo(cashDropLayer)
            .bindPopup(`A ${cashDropData.name} is here!`)
            .on('click', () => {
                // Pass marker and its location to the collect function
                collectCash(marker, cashLat, cashLon);
            });
    }
    console.log(`Spawned ${numDrops} cash drops around [${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}]`);
}

// --- Rival Logic ---

function spawnRivals(centerLat, centerLon) {
    const spawnRadius = 0.008; // Slightly larger radius for rivals
    const numRivals = 3;

     // Define a rival icon - Icon definition moved to uiManager.js
     if (typeof rivalIcon === 'undefined') {
        console.error("rivalIcon is not defined! Ensure uiManager.js defines it.");
        return;
    }

    for (let i = 0; i < numRivals; i++) {
        const randomAngle = Math.random() * 2 * Math.PI;
        // Use a different radius range
        const randomRadius = spawnRadius * 0.5 + Math.random() * spawnRadius * 0.5;
        const lat = centerLat + randomRadius * Math.cos(randomAngle);
        const lon = centerLon + randomRadius * Math.sin(randomAngle) / Math.cos(centerLat * Math.PI / 180); // Adjust longitude

        const randomRival = rivalData[Math.floor(Math.random() * rivalData.length)];

        const marker = L.marker([lat, lon], { icon: rivalIcon }).addTo(rivalLayer)
            .bindPopup(`${randomRival.name} is nearby...`)
            .on('click', () => {
                // TODO: Implement rival interaction logic (e.g., fight, negotiate)
                showCustomAlert(`You encountered ${randomRival.name}! Interaction not implemented yet.`); // Use custom alert (defined in uiManager.js)
            });
    }
    console.log(`Spawned ${numRivals} rivals around [${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}]`);
}

// --- Business / Protection Money Logic ---

// Function to handle activating protection on a business
function activateProtection(businessId) {
    calculatePlayerPower(); // Ensure player power is up-to-date before using it

    const businessInfo = businessesCache[businessId];
    if (!businessInfo) {
        console.error(`Business not found in cache: ${businessId}`);
        return;
    }

    if (!currentUserLocation) {
        showCustomAlert("Cannot determine your location."); // Use custom alert (defined in uiManager.js)
        return;
    }
    if (!currentUserOrganization) {
        showCustomAlert("You must be in an organization to protect a business."); // Use custom alert (defined in uiManager.js)
        return;
    }

    // Check 1: Player distance to business
    const distanceToBusiness = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, businessInfo.lat, businessInfo.lon);
    if (distanceToBusiness > PROTECTION_ACTIVATION_RANGE) {
        showCustomAlert(`You are too far away from ${businessInfo.name} to activate protection. (Need to be within ${PROTECTION_ACTIVATION_RANGE}m, currently ${distanceToBusiness.toFixed(0)}m)`); // Use custom alert (defined in uiManager.js)
        return;
    }

    // Check 2: Is the business already protected by *another* organization?
    if (businessInfo.protectingOrganization && businessInfo.protectingOrganization.abbreviation !== currentUserOrganization.abbreviation) {
        showCustomAlert(`${businessInfo.name} is already protected by ${businessInfo.protectingOrganization.name}. Contesting not implemented yet.`); // Use custom alert (defined in uiManager.js)
        // TODO: Implement contesting logic here later
        return;
    }

    // Check 3: Is the current player already protecting this business?
    const alreadyProtecting = businessInfo.protectingUsers.some(user => user.userId === currentPlayerId);
    if (alreadyProtecting) {
        showCustomAlert(`You are already contributing protection to ${businessInfo.name}.`); // Use custom alert (defined in uiManager.js)
        return;
    }

    // Check 4: Is the user limit reached for the *current* organization?
    if (businessInfo.protectingOrganization && businessInfo.protectingOrganization.abbreviation === currentUserOrganization.abbreviation && businessInfo.protectingUsers.length >= MAX_PROTECTING_USERS) {
        showCustomAlert(`${businessInfo.name} already has the maximum number of protectors (${MAX_PROTECTING_USERS}) from your organization.`); // Use custom alert (defined in uiManager.js)
        return;
    }
     // Check 4b: If no org is protecting yet, ensure limit isn't reached (shouldn't happen if length is 0, but safe check)
     if (!businessInfo.protectingOrganization && businessInfo.protectingUsers.length >= MAX_PROTECTING_USERS) {
         showCustomAlert(`${businessInfo.name} already has the maximum number of protectors (${MAX_PROTECTING_USERS}).`); // Use custom alert (defined in uiManager.js)
         return;
     }

    // Check 5: Has the player reached their personal protection limit?
    let currentlyProtectingCount = 0;
    for (const id in businessesCache) {
        const biz = businessesCache[id];
        if (biz.protectingUsers && biz.protectingUsers.some(user => user.userId === currentPlayerId)) {
            currentlyProtectingCount++;
        }
    }
    if (currentlyProtectingCount >= MAX_PLAYER_PROTECTED_BUSINESSES) {
        showCustomAlert(`You have reached your personal limit of protecting ${MAX_PLAYER_PROTECTED_BUSINESSES} businesses.`);
        return;
    }


    // --- All checks passed, activate/add protection ---
    console.log(`Activating protection for ${businessInfo.name} by ${currentPlayerId} (Power: ${playerPower})`); // Use calculated playerPower

    // Set protecting organization if it's not already set to the current one
    if (!businessInfo.protectingOrganization || businessInfo.protectingOrganization.abbreviation !== currentUserOrganization.abbreviation) {
        businessInfo.protectingOrganization = { ...currentUserOrganization }; // Store a copy
        // If switching orgs (or first time), clear previous users (shouldn't happen due to check 2, but safe)
        businessInfo.protectingUsers = [];
        businessInfo.protectionPower = 0;
    }

    // Add current player to protectors
    businessInfo.protectingUsers.push({ userId: currentPlayerId, userPower: playerPower }); // Use calculated playerPower

    // Recalculate total protection power for this organization
    businessInfo.protectionPower = businessInfo.protectingUsers.reduce((sum, user) => sum + user.userPower, 0);

    showCustomAlert(`You are now helping protect ${businessInfo.name}! Total Protection Power: ${businessInfo.protectionPower}`); // Use custom alert (defined in uiManager.js)

    // Update the marker and protection book immediately
    updateSingleBusinessMarker(businessId); // Defined below
    updateProtectionBookUI(); // Refresh book list (defined in uiManager.js)

    // Save game state after activating protection
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    }
}

// Function to fetch nearby businesses based on the allowed list
async function fetchBusinessesInBounds(bounds) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    // Expanded query to fetch all potentially relevant types
    const query = `
        [out:json][timeout:30];
        (
          // Shops
          node["shop"~"^(clothes|shoes|books|toys|supermarket|department_store|electrical|hairdresser|barber|sports)$"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["shop"~"^(clothes|shoes|books|toys|supermarket|department_store|electrical|hairdresser|barber|sports)$"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          // Amenities
          node["amenity"~"^(fast_food|cafe|university|kindergarten|car_wash|fuel)$"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["amenity"~"^(fast_food|cafe|university|kindergarten|car_wash|fuel)$"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          // Tourism
          node["tourism"~"^(motel|bed_and_breakfast)$"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["tourism"~"^(motel|bed_and_breakfast)$"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          // Aeroway
          node["aeroway"~"^(aerodrome|terminal)$"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["aeroway"~"^(aerodrome|terminal)$"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          // Railway/Transport
          node["railway"="station"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["railway"="station"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          node["public_transport"="station"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["public_transport"="station"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          // Craft
          node["craft"="electrician"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["craft"="electrician"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          // Leisure
          node["leisure"="fitness_centre"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          way["leisure"="fitness_centre"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
        );
        out center;
    `;
    console.log("Querying Overpass API for specific business types in bounds:", bounds);
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

// Set of allowed business tag values based on the latest user request
const allowedBusinessTags = new Set([
    // shop=*
    'clothes', 'supermarket',
    // amenity=*
    'cafe', 'university', 'fuel',
    // railway=* / public_transport=*
    'station',
    // leisure=*
    'fitness_centre' // For Gym
]);

// Function to process raw Overpass business elements, filtering by allowed types
function processBusinessElements(elements) {
    const businesses = [];
    elements.forEach(element => {
        const tags = element.tags || {};
        let lat, lon;

        if (element.type === "node") {
            lat = element.lat;
            lon = element.lon;
        } else if (element.center) {
            lat = element.center.lat;
            lon = element.center.lon;
        } else {
            return; // Skip if no coordinates found
        }

        // --- Filtering Logic ---
        let matchedTagValue = null;
        let matchedTagKey = null;

        // Check relevant tags against the allowed set
        const relevantTags = ['shop', 'amenity', 'tourism', 'aeroway', 'railway', 'public_transport', 'craft', 'leisure'];
        for (const key of relevantTags) {
            const value = tags[key];
            if (value && allowedBusinessTags.has(value)) {
                matchedTagValue = value;
                matchedTagKey = key;
                break; // Found a match, stop checking
            }
        }

        // If no allowed tag was found, skip this element
        if (!matchedTagValue) {
            // console.log(`Skipping element ${element.id} - Type not in allowed list. Tags:`, tags);
            return;
        }
        // --- End Filtering Logic ---

        // Only add to cache if not already present (and it's an allowed type)
        if (!businessesCache[element.id]) {
            const name = tags.name || matchedTagValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Use name tag or formatted tag value
            const businessType = matchedTagValue; // Use the matched tag value as the type

            // Basic profit potential (can be refined based on type)
            let potential = 50; // Default
            if (businessType === 'supermarket' || businessType === 'department_store') potential = 100;
            else if (businessType === 'airport' || businessType === 'university') potential = 75;

            // Check if it's a shop (for the shop button) - refine this list
            const shopTypes = ['clothes', 'shoes', 'books', 'toys', 'supermarket', 'department_store', 'electrical', 'hairdresser', 'barber', 'sports'];
            const isActualShop = shopTypes.includes(businessType);

            const businessInfo = {
                id: element.id,
                name: name,
                isShop: isActualShop, // Flag for shop button
                lat: lat,
                lon: lon,
                type: businessType, // The specific allowed type (e.g., 'clothes', 'cafe')
                isAbandoned: false, // Removed abandoned logic
                isAdSpace: false, // Removed ad space logic
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
        }
    });
    console.log(`Processed ${elements.length} elements, added ${businesses.length} new allowed businesses to cache.`);
    return businesses; // Return only newly processed businesses for displayBusinesses
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
         updateProtectionBookUI(); // Defined in uiManager.js
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

     // Icon definitions moved to uiManager.js
     // Check for all required icons, including abandonedBuildingIcon and adsIcon
     if (typeof customBusinessIcon === 'undefined' || typeof shopIcon === 'undefined' || typeof abandonedBuildingIcon === 'undefined' || typeof adsIcon === 'undefined') {
        console.error("One or more business icons (customBusinessIcon, shopIcon, abandonedBuildingIcon, adsIcon) are not defined! Ensure uiManager.js defines them.");
        return false;
     }

     // Removed Ad Space and Abandoned Building specific logic

     // Determine the correct icon for businesses
     // Use shopIcon if isShop is true, otherwise use customBusinessIcon
     const currentIcon = businessInfo.isShop ? shopIcon : customBusinessIcon;
     // Format the type string for display (replace underscores, capitalize)
     const displayType = businessInfo.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
     let currentPopupContent = `<b>${businessInfo.name}</b><br>(${displayType})`;
     let isNowControlled = false; // For profit collection

     // --- Determine Profit Control Status (Only for non-abandoned) ---
     if (currentUserOrganization && currentOrganizationBaseLocation) {
         const distanceToBase = calculateDistance(
             businessInfo.lat, businessInfo.lon,
             currentOrganizationBaseLocation.lat, currentOrganizationBaseLocation.lon
         );
         if (distanceToBase <= TERRITORY_RADIUS) {
             isNowControlled = true; // Can collect profit
         } else {
             isNowControlled = false;
         }
     } else {
         isNowControlled = false;
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

         if (distanceToBusiness <= PROTECTION_ACTIVATION_RANGE &&
             !isAlreadyProtecting &&
             (!businessInfo.protectingOrganization ||
              (businessInfo.protectingOrganization.abbreviation === currentUserOrganization.abbreviation &&
               businessInfo.protectingUsers.length < MAX_PROTECTING_USERS))
            )
         {
             canActivate = true;
         }
     }

     if (canActivate) {
         // Button class defined in uiManager.js where handlePopupOpenForActions is
         currentPopupContent += `<br><button class="activate-protection-button btn btn-blue" data-business-id="${businessInfo.id}">Activate Protection</button>`;
     }

     // --- Add "Collect Profit" Button Logic (only if controlled for profit) ---
     if (isNowControlled) {
         const profit = calculatePotentialProfit(businessInfo); // Defined below
         currentPopupContent += `<br><hr>Potential Profit: $${profit}`;
         if (profit > 0 || (previousControlStatus !== isNowControlled)) {
              // Button class defined in uiManager.js where handlePopupOpenForActions is
              currentPopupContent += `<br><button class="collect-button btn btn-green" data-business-id="${businessInfo.id}">Collect Profit</button>`;
          }
      }

     // --- Add "Visit Shop" Button Logic ---
     if (businessInfo.isShop) {
         // Button class defined in uiManager.js where handlePopupOpenForActions is
         currentPopupContent += `<br><button class="visit-shop-button btn btn-purple" data-business-id="${businessInfo.id}">Visit Shop</button>`; // Added purple class for distinction
     }
     // Note: No buttons (Collect, Protect, Visit) are added for abandoned buildings due to the early return above.


      // --- Check if anything significant changed (for non-abandoned) ---
     const profitControlStatusChanged = previousControlStatus !== isNowControlled;
     const protectionStatusChanged = previousProtectionPower !== businessInfo.protectionPower ||
                                    (!businessInfo.protectingOrganization && previousProtectionPower > 0) ||
                                    (businessInfo.protectingOrganization && previousProtectionPower === 0);

     // Update cache and marker state
     businessInfo.isControlled = isNowControlled;

     // Reset collection time if profit control just started
     if (profitControlStatusChanged && isNowControlled) {
         businessInfo.lastCollected = Date.now();
         console.log(`Business ${businessInfo.id} (${businessInfo.name}) profit control started. Resetting lastCollected.`);
     } else if (profitControlStatusChanged && !isNowControlled) {
         console.log(`Business ${businessInfo.id} (${businessInfo.name}) profit control stopped.`);
     }

     // Update marker icon (always custom now)
     businessInfo.marker.setIcon(currentIcon);

     // Update popup content
     if (businessInfo.marker.getPopup().getContent() !== currentPopupContent) {
         businessInfo.marker.setPopupContent(currentPopupContent);
     }

     // --- Add/Remove CSS class for blue styling (Keep this if you want visual distinction for protected) ---
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

// Function to calculate potential profit
function calculatePotentialProfit(businessInfo) {
    if (!businessInfo || !businessInfo.isControlled) {
        return 0;
    }
    const now = Date.now();
    const lastCollectionTime = businessInfo.lastCollected || now;
    const timeSinceLastCollect = now - lastCollectionTime;

    if (timeSinceLastCollect < 0) return 0;

    const accumulationTimeMs = Math.min(timeSinceLastCollect, MAX_ACCUMULATION_MS);
    const profit = accumulationTimeMs * PROFIT_RATE_PER_MS;
    return Math.floor(profit);
}

// Function to handle collecting profit
function collectProfit(businessId) {
    const businessInfo = businessesCache[businessId];
    if (!businessInfo) return;

    if (!currentUserLocation) {
        showCustomAlert("Cannot determine your location."); // Use custom alert (defined in uiManager.js)
        return;
    }
    // Check if the business is protected by the player's organization
    if (!currentUserOrganization || !businessInfo.protectingOrganization || businessInfo.protectingOrganization.abbreviation !== currentUserOrganization.abbreviation) {
        showCustomAlert("This business is not protected by your organization."); // Updated message
        return;
    }

    const distanceToBusiness = calculateDistance(currentUserLocation.lat, currentUserLocation.lon, businessInfo.lat, businessInfo.lon);
    const PROFIT_COLLECTION_DISTANCE = 2000; // Can collect from 2km away

    if (distanceToBusiness <= PROFIT_COLLECTION_DISTANCE) {
        const profit = calculatePotentialProfit(businessInfo);
        if (profit > 0) {
            currentCash += profit;
            updateCashUI(currentCash); // Update UI (defined in uiManager.js)
            businessInfo.lastCollected = Date.now(); // Update last collected time
            showCustomAlert(`Collected $${profit} from ${businessInfo.name}.`); // Use custom alert (defined in uiManager.js)
            // Update popup immediately to show $0 potential and refresh book
             updateSingleBusinessMarker(businessId); // Update the specific marker
             updateProtectionBookUI(); // Refresh book list (defined in uiManager.js)

             // Save game state after collecting profit
             if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
                 SaveManager.saveGame(gatherCurrentGameState());
             }
        } else {
            showCustomAlert(`${businessInfo.name} has no profit to collect currently.`); // Use custom alert (defined in uiManager.js)
        }
    } else {
        showCustomAlert(`You are too far away to collect profit from ${businessInfo.name}. (Distance: ${distanceToBusiness.toFixed(1)}m)`); // Use custom alert (defined in uiManager.js)
    }
}

// Function to remove player's protection from a business
function removePlayerProtection(businessId) {
    // --- Daily Limit Check ---
    loadDailyRemovalLimit(); // Ensure count/date are current for this session/day

    if (protectionRemovalsToday >= MAX_DAILY_PROTECTION_REMOVALS) {
        showCustomAlert(`You have already removed protection ${MAX_DAILY_PROTECTION_REMOVALS} times today. Please try again tomorrow.`);
        return; // Stop execution if limit reached
    }
    // --- End Daily Limit Check ---

    const businessInfo = businessesCache[businessId];
    if (!businessInfo) {
        console.error(`Cannot remove protection: Business ${businessId} not found in cache.`);
        showCustomAlert("Error: Business data not found.");
        return;
    }

    if (!businessInfo.protectingUsers || businessInfo.protectingUsers.length === 0) {
        console.warn(`Attempted to remove protection from ${businessInfo.name} (ID: ${businessId}), but it has no protectors.`);
        // No need to alert user, just log it.
        return;
    }

    const playerIndex = businessInfo.protectingUsers.findIndex(user => user.userId === currentPlayerId);

    if (playerIndex === -1) {
        console.warn(`Attempted to remove protection from ${businessInfo.name} (ID: ${businessId}), but player ${currentPlayerId} is not listed as a protector.`);
        showCustomAlert("You are not currently protecting this business.");
        return;
    }

    // Remove the player
    const removedUser = businessInfo.protectingUsers.splice(playerIndex, 1)[0];
    console.log(`Removed player ${removedUser.userId} (Power: ${removedUser.userPower}) from protecting ${businessInfo.name}`);

    // --- Increment and Save Daily Limit ---
    protectionRemovalsToday++;
    lastProtectionRemovalDate = getCurrentDateString(); // Ensure date is current
    saveDailyRemovalLimit();
    console.log(`Protection removal count for today: ${protectionRemovalsToday}/${MAX_DAILY_PROTECTION_REMOVALS}`);
    // --- End Increment and Save ---

    // Recalculate protection power
    businessInfo.protectionPower = businessInfo.protectingUsers.reduce((sum, user) => sum + user.userPower, 0);

    // If no users are left, clear the organization
    if (businessInfo.protectingUsers.length === 0) {
        console.log(`No protectors left for ${businessInfo.name}. Clearing protecting organization.`);
        businessInfo.protectingOrganization = null;
        businessInfo.protectionPower = 0; // Ensure power is zero
    }

    showCustomAlert(`You have stopped protecting ${businessInfo.name}.`);

    // Update UI
    updateSingleBusinessMarker(businessId); // Update the marker popup
    updateProtectionBookUI(); // Refresh the protection book list

    // Save game state after removing protection
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame) {
        SaveManager.saveGame(gatherCurrentGameState());
    }
}


// --- Enemy Removal Function ---
// Needs access to `enemies` array (from enemy.js) and `enemyLayer`
function removeEnemyFromMap(enemyId) {
    // Ensure findEnemyById is available (defined in enemy.js)
    if (typeof findEnemyById !== 'function') {
        console.error("findEnemyById function not found! Make sure enemy.js is loaded before gameWorld.js");
        return;
    }
    const enemy = findEnemyById(enemyId); // Find the enemy object
    if (!enemy || !enemy.marker) {
        console.warn(`Cannot remove enemy: Enemy or marker not found for ID ${enemyId}`);
        return;
    }

    const markerElement = enemy.marker.getElement(); // Get the marker's HTML element

    if (markerElement) {
        markerElement.classList.add('marker-fade-out'); // Add fade-out class (CSS defined in style.css)

        // Remove after the transition duration (500ms from CSS)
        setTimeout(() => {
            if (enemyLayer && enemy.marker && enemyLayer.hasLayer(enemy.marker)) {
                enemyLayer.removeLayer(enemy.marker); // Remove from map layer
            }
            // Remove from the global enemies array (defined in enemy.js)
            if (typeof enemies !== 'undefined') {
                const index = enemies.findIndex(e => e.id === enemyId);
                if (index > -1) {
                    enemies.splice(index, 1);
                    console.log(`Enemy ${enemyId} removed from map and array.`);
                } else {
                     console.warn(`Enemy ${enemyId} marker removed, but not found in enemies array.`);
                }
            } else {
                 console.error("Global 'enemies' array not found during removal! Make sure enemy.js is loaded.");
            }
             // Optionally update visibility check if needed, though removing should handle it
             // if (currentUserLocation) { updateMarkersVisibility(currentUserLocation.lat, currentUserLocation.lon); }
        }, 500); // Match CSS transition duration
    } else {
        // Fallback if element not found (shouldn't happen often)
        console.warn(`Marker element not found for enemy ${enemyId}. Removing directly.`);
        if (enemyLayer && enemy.marker && enemyLayer.hasLayer(enemy.marker)) {
            enemyLayer.removeLayer(enemy.marker);
        }
         if (typeof enemies !== 'undefined') {
            const index = enemies.findIndex(e => e.id === enemyId);
            if (index > -1) {
                enemies.splice(index, 1);
            }
        }
    }
    // Note: Saving state after enemy removal might happen in the battle logic that calls this.
}

// Helper function to trigger all necessary UI updates after state changes
function triggerUIUpdates() {
    console.log("Triggering full UI update based on current game state.");
    if (typeof updateCashUI === 'function') updateCashUI(currentCash);
    if (typeof updateHpUI === 'function') updateHpUI(); // Uses global HP vars
    if (typeof updateExperienceUI === 'function') updateExperienceUI(); // Uses global level/exp vars
    if (typeof updateInventoryUI === 'function') updateInventoryUI(); // Uses global inventory
    if (typeof updateEquipmentUI === 'function') updateEquipmentUI(); // Uses global equipment
    if (typeof updateOrganizationUI === 'function') updateOrganizationUI(); // Uses global org vars
    if (typeof updateProtectionBookUI === 'function') updateProtectionBookUI(); // Uses global caches/player ID
    // Add other UI update calls as needed (e.g., stats modal if open)
}

// --- Function to Load and Merge Business Cache State ---
// NOTE: This is called *during* DOMContentLoaded, but the actual merging might
// happen *after* initial businesses are fetched asynchronously.
let loadedBusinessState = null; // Temporary storage for loaded state

function loadBusinessCacheState() {
    console.log("Attempting to load saved business cache state...");
    // Use SaveManager.loadGame() which handles loading from localStorage
    // The loaded state is applied in initialization.js now.
    // This function might still be useful if we need to load *only* business state separately later.
    // For now, we rely on the full state load.
    // const savedBusinessDataString = localStorage.getItem('businessesCache_save');
    // if (!savedBusinessDataString) {
    //     console.log("No saved business cache state found.");
    //     loadedBusinessState = {}; // Ensure it's an empty object if nothing is loaded
    //     return;
    // }
    // try {
    //     loadedBusinessState = JSON.parse(savedBusinessDataString);
    //     console.log(`Loaded ${Object.keys(loadedBusinessState).length} businesses' state into temporary storage.`);
    // } catch (error) {
    //     console.error("Error loading or parsing saved business cache state:", error);
    //     loadedBusinessState = {}; // Reset on error
    // }
    console.log("Business state loading is now handled by SaveManager.loadGame in initialization.js");
}

// Function to apply the loaded business state to the runtime cache
// This should be called *after* initial businesses are fetched/displayed.
function applyLoadedBusinessState() {
    // This function is called from initialization.js after initial business fetch/display
    // It merges the business state loaded by SaveManager.loadGame into the runtime businessesCache

    // The loaded state is now expected to be part of the global `gameState` object
    const loadedBusinesses = (typeof gameState !== 'undefined' && gameState.businesses) ? gameState.businesses : null;

    if (!loadedBusinesses || Object.keys(loadedBusinesses).length === 0) {
        console.log("No loaded business state to apply from global gameState.");
        return;
    }

    console.log("Applying loaded business state from global gameState to runtime cache...");
    let mergeCount = 0;
    let updatedIds = new Set(); // Keep track of updated businesses

    for (const businessId in loadedBusinesses) {
        const savedBizData = loadedBusinesses[businessId];
        // Check if this business exists in the current runtime cache
        const runtimeBiz = businessesCache[businessId];

        if (runtimeBiz) {
            // --- FILTER CHECK: Only merge if the type is allowed ---
            if (typeof allowedBusinessTags === 'undefined' || !allowedBusinessTags.has(runtimeBiz.type)) {
                console.log(`Skipping merge for saved business ${businessId} (${runtimeBiz.name}) - Type '${runtimeBiz.type}' not allowed.`);
                // Optionally remove marker if it exists
                if (runtimeBiz.marker && businessLayer.hasLayer(runtimeBiz.marker)) {
                    businessLayer.removeLayer(runtimeBiz.marker);
                }
                // Remove from cache to prevent further processing
                delete businessesCache[businessId];
                displayedBusinessIds.delete(businessId);
                continue; // Skip to the next saved business
            }
            // --- End Filter Check ---

            // Merge saved state into the existing cache entry (only if allowed type)
            runtimeBiz.lastCollected = savedBizData.lastCollected || runtimeBiz.lastCollected || 0;
            runtimeBiz.protectingOrganization = savedBizData.protectingOrganization || runtimeBiz.protectingOrganization || null;
            runtimeBiz.protectionPower = savedBizData.protectionPower || runtimeBiz.protectionPower || 0;
            runtimeBiz.protectingUsers = savedBizData.protectingUsers || runtimeBiz.protectingUsers || [];
            updatedIds.add(businessId); // Mark as updated
            mergeCount++;
        } else {
             // Log if a saved business isn't in the current runtime cache after initial load
             // This might happen if the Overpass query changed and the business is no longer fetched.
             // console.warn(`Saved business ${businessId} not found in current runtime cache during apply. State not merged.`);
        }
    }
    console.log(`Applied saved state for ${mergeCount} businesses.`);

    // Update markers for only the businesses whose state was merged
    console.log(`Updating markers for ${updatedIds.size} businesses with loaded state...`);
    updatedIds.forEach(id => {
        if (displayedBusinessIds.has(id)) { // Only update if marker is potentially visible
             updateSingleBusinessMarker(id);
        }
    });
     // Update the protection book UI if any relevant business state changed
     if (updatedIds.size > 0) {
         updateProtectionBookUI();
     }
}
// Make applyLoadedBusinessState globally accessible for initialization.js
window.applyLoadedBusinessState = applyLoadedBusinessState;


// --- SUI Wallet Event Handlers (Removed) ---

// Add listeners for the custom events from suiIntegration.js (Removed)

// Initial Load Logic (REMOVED - Handled by initialization.js and SaveManager)
document.addEventListener('DOMContentLoaded', () => {
    console.log("gameWorld.js DOMContentLoaded: Loading daily limits and business cache state (if any)...");
    loadDailyRemovalLimit(); // Load daily limits early
    // loadBusinessCacheState(); // REMOVED - Loading handled by SaveManager in initialization.js

    // Player state loading, ID management, and initial UI updates are now handled in initialization.js
    // after SaveManager.loadGame() is called.

    // Auto-save is also removed from here.
});

// --- Auto-Save and Save-on-Exit (REMOVED) ---
// Removed startAutoSave, stopAutoSave, and beforeunload listener
