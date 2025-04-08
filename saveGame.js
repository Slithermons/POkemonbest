// saveGame.js

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://gopmukllrferjfiqvzun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcG11a2xscmZlcmpmaXF2enVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NjMyMzAsImV4cCI6MjA1OTMzOTIzMH0.3VA2JlUqFDYZ-ajwRmnCqzWMXv0LHVxdboOSFw7IZHA';

let supabase = null;
const LOCAL_STORAGE_KEY = 'mobfiGameState';

// --- Initialization ---
function initializeSupabase() {
    try {
        // Access createClient from the global scope (window.supabase)
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized.');
            // Optional: Add listener for auth changes if using Supabase Auth
            // supabase.auth.onAuthStateChange((event, session) => {
        } else {
            console.error('Supabase library not found or createClient is not a function.');
            // Handle the case where the library didn't load correctly
            supabase = null; // Ensure supabase is null if initialization fails
        }
        //     console.log('Auth state changed:', event, session);
        //     // Handle user login/logout, potentially trigger load/sync
        // });
    } catch (error) {
        console.error("Error initializing Supabase client:", error);
        // Handle initialization error (e.g., show message to user)
    }
}

// --- Local Storage ---
function saveGameLocally(gameState) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
        console.log('Game state saved locally.');
    } catch (error) {
        console.error('Error saving game state locally:', error);
        // Consider fallback or user notification
    }
}

function loadGameLocally() {
    try {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            console.log('Game state loaded locally.');
            return JSON.parse(savedState);
        }
        console.log('No local save data found.');
        return null; // Or return a default initial state
    } catch (error) {
        console.error('Error loading game state locally:', error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
        return null; // Or return a default initial state
    }
}

// --- Supabase Sync ---

// Function to save/update user data (requires Supabase Auth or a way to identify the user)
async function syncUserData(userData) {
    if (!supabase) {
        console.error('Supabase client not initialized for syncUserData.');
        return { error: 'Supabase not ready' };
    }

    // Assuming userData contains id, username, level, money, power
    // We need the user's Supabase Auth ID (usually from supabase.auth.getUser())
    // For now, let's assume we have a userId. This needs proper integration with auth.
    const userId = userData.id; // Placeholder - GET THIS FROM AUTH
    if (!userId) {
        console.error('User ID not available for sync.');
        return { error: 'User not authenticated or ID missing' };
    }

    // --- ADDED: Detailed log before upsert ---
    console.log(`[syncUserData] Attempting upsert for user ${userId} with data:`, JSON.stringify({
        id: userId,
        username: userData.username,
        level: userData.level,
        money: userData.money,
        power: userData.power,
        inventory: userData.inventory, // Log inventory being sent
        equipment: userData.equipment, // Log equipment being sent
        alias: userData.alias,
        current_hp: userData.hp,
        updated_at: new Date().toISOString()
    }, null, 2)); // Pretty print JSON
    // --- END ADDED ---

    const { data, error } = await supabase
        .from('users')
        .upsert({
            id: userId, // Primary key
            username: userData.username,
            level: userData.level,
            money: userData.money,
            power: userData.power,
            inventory: userData.inventory, // Add inventory to upsert
            equipment: userData.equipment, // Add equipment to upsert
            // Add other fields from gameState.player if they exist in the table
            alias: userData.alias,
            current_hp: userData.hp,
            // organization: userData.organization, // Assuming organization is handled separately or needs mapping
            updated_at: new Date().toISOString() // Let trigger handle this ideally
        }, {
            onConflict: 'id' // Specify the conflict column
        })
        .select(); // Select the upserted data

    if (error) {
        console.error(`[syncUserData] Error syncing user data for ${userId}:`, error); // Add user ID to error log
    } else {
        console.log(`[syncUserData] User data synced successfully for ${userId}:`, data); // Add user ID to success log
    }
    return { data, error }; // Return the result
}

// Function to sync business protection data
// Needs businessId and the protectorUserId (from Auth)
async function syncBusinessProtection(businessId, protectorUserId, isProtecting) {
     if (!supabase) {
        console.error('Supabase client not initialized for syncBusinessProtection.');
        return { error: 'Supabase not ready' };
    }
     if (!protectorUserId) {
        console.error('Protector User ID not available for sync.');
        return { error: 'User not authenticated or ID missing' };
    }

    let data = null, error = null;

    if (isProtecting) {
        // Add or update protection record
        ({ data, error } = await supabase
            .from('business_protection')
            .upsert({
                business_id: businessId, // Unique constraint handles conflict
                protector_user_id: protectorUserId,
                protection_start_time: new Date().toISOString()
            }, {
                onConflict: 'business_id' // If business already protected, update protector/time
            })
            .select());
    } else {
        // Remove protection record
        ({ data, error } = await supabase
            .from('business_protection')
            .delete()
            .match({ business_id: businessId, protector_user_id: protectorUserId })); // Ensure user only deletes their own
    }

    if (error) {
        console.error('Error syncing business protection:', error);
    } else {
        console.log('Business protection synced successfully:', data);
    }
    return { data, error };
}

// --- Leaderboard ---
async function fetchLeaderboard(type = 'money', limit = 10) {
    if (!supabase) {
        console.error('Supabase client not initialized for fetchLeaderboard.');
        return { error: 'Supabase not ready', data: [] };
    }

    const orderByColumn = type === 'power' ? 'power' : 'money';

    const { data, error } = await supabase
        .from('users')
        .select('username, alias, level, money, power') // Select relevant columns including alias
        .order(orderByColumn, { ascending: false })
        .limit(limit);

    if (error) {
        console.error(`Error fetching ${type} leaderboard:`, error);
        return { error, data: [] };
    }

    console.log(`${type} leaderboard fetched successfully:`, data);
    return { data, error: null };
}


// --- Combined Save Function ---
// This function should be called whenever the game state changes significantly
async function saveGame(gameState) { // Ensure function is async
    // 1. Save locally immediately
    saveGameLocally(gameState);

    // 2. Attempt to sync relevant parts to Supabase
    //    Use the global currentPlayerId set during initialization from Cardano wallet
    const userId = window.currentPlayerId; // Access global ID (Cardano stake address)

    if (userId && gameState.player) {
         console.log(`Attempting to sync user data for Cardano User ID: ${userId}`); // Log sync attempt
         // Prepare user data object matching the 'users' table structure
        const userDataToSync = {
            id: userId, // Make sure this ID matches the one in Supabase Auth
            username: gameState.player.username || null, // Or however username is stored
            level: gameState.player.level,
            money: gameState.player.cash, // Assuming cash maps to money
            power: gameState.player.power, // Assuming power maps to power
            inventory: gameState.player.inventory || [], // Add inventory
            equipment: gameState.player.equipment || {},  // Add equipment
            // --- ADDED: Include other fields needed by syncUserData ---
            alias: gameState.player.alias,
            hp: gameState.player.hp
            // --- END ADDED ---
        };
        // --- MODIFIED: Check sync result ---
        const syncResult = await syncUserData(userDataToSync);
        if (syncResult.error) {
             console.warn(`[saveGame] Sync failed for user ${userId}. Data saved locally, but not to cloud. Error:`, syncResult.error.message);
        } else {
             console.log(`[saveGame] Sync successful for user ${userId}.`);
        }
        // --- END MODIFIED ---
    } else if (!userId) {
         console.warn("[saveGame] Cannot sync user data: User not logged in or ID unavailable.");
    }


    // Sync business protection status (example - needs actual game state structure)
    // This needs to iterate through businesses the player is protecting
    // Example:
    // if (userId && gameState.businesses) {
    //     for (const business of gameState.businesses) {
    //         if (business.isProtectedByPlayer) { // Check if current player protects this
    //             await syncBusinessProtection(business.id, userId, true);
    //         } else {
    //             // Optional: If player *stopped* protecting, send false
    //             // await syncBusinessProtection(business.id, userId, false);
    //             // Need careful logic here to only remove *this user's* protection
    //         }
    //     }
    // }

    // Add sync logic for other relevant data (e.g., business ownership if applicable)
}

// --- Combined Load Function ---
// This function should be called on game initialization
async function loadGame() {
    // 1. Try loading from local storage first
    let gameState = loadGameLocally();

    // 2. Attempt to load from Supabase using the global currentPlayerId (Cardano stake address)
    const userId = window.currentPlayerId; // Access global ID set during initialization
    let fetchedFromSupabase = false;

    if (userId) { // Only try fetching if we have a valid ID from the wallet
        console.log(`User authenticated via Cardano: ${userId}. Checking Supabase for game state.`);
        try { // <<< Corrected try block start
            const { data: supabaseUserData, error: fetchError } = await supabase
                .from('users')
                .select('*') // Select all columns
                .eq('id', userId)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // Ignore 'No rows found' error
                console.error(`Error fetching user data from Supabase:`, fetchError);
            } else if (supabaseUserData) {
                console.log("User data fetched from Supabase:", supabaseUserData);
                const mappedState = mapSupabaseToGameState(supabaseUserData); // Use the helper
                if (mappedState) {
                    // --- FIX: Update global currentPlayerId ---
                    // Ensure gameWorld.js's global variable is updated
                    if (typeof window.currentPlayerId !== 'undefined') { // Access global scope
                         window.currentPlayerId = userId;
                         console.log(`Global currentPlayerId updated to: ${userId}`);
                    } else {
                         console.warn("Global variable 'currentPlayerId' not found in window scope during load.");
                    }
                    // --- End FIX ---

                    // Optional: Compare timestamps if local data exists? For now, overwrite local if fetched.
                    gameState = mappedState;
                    saveGameLocally(gameState); // Update local storage with fetched data
                    fetchedFromSupabase = true;
                    console.log("Game state loaded from Supabase and saved locally.");
                } else {
                    console.error("Failed to map Supabase data to game state.");
                    // Keep existing local gameState if mapping fails, or fall through to default
                }
            } else {
                console.log("User found via Cardano ID, but no data in 'users' table yet.");
                // User exists (has wallet ID) but not in users table (e.g., first login after signup)
                // Keep local gameState if it exists, otherwise fall through to default
            }
        } catch (error) { // <<< Corrected catch block placement
             // Catch potential errors during the fetch itself
             console.error("Exception during Supabase fetch in loadGame:", error);
        } // <<< Corrected try...catch block end
    } else {
        console.log("No Cardano User ID found, skipping Supabase load attempt.");
    }

    // 3. If still no game state (neither local nor fetched from Supabase), create a default one
    if (!gameState) {
        console.log("Creating default game state.");
        gameState = getDefaultGameState(); // Define this function based on your game's needs
        saveGameLocally(gameState); // Save the default state
    }

    return gameState;
}

// --- Helper: Default Game State ---
function getDefaultGameState() {
    // Define the initial state for a new player
    return {
        player: {
            username: null,
            alias: 'Newbie',
            level: 1,
            cash: 100,
            power: 10,
            hp: 100,
            maxHp: 100,
            // ... other player stats (influence, strength, etc.)
            inventory: [],
            equipment: {},
            organization: null,
            experience: 0,
            expNeeded: 100, // Example
            stats: { // Mirroring stats modal structure
                influence: 0,
                strength: 0,
                agility: 0,
                vitality: 0,
                hitRate: 50, // Example
                defence: 0,
                evasionRate: 5, // Example
                criticalRate: 5, // Example
                damage: 10 // Example base damage
            }
        },
        businesses: [], // Array of business objects the player interacts with/protects
        mapMarkers: {}, // State related to map markers if needed
        settings: {
            soundOn: true
        }
        // ... other global game state
    };
}

// --- Helper: Map Supabase data to Game State ---
function mapSupabaseToGameState(supabaseUserData) {
    if (!supabaseUserData) return null;

    try {
        const defaultState = getDefaultGameState(); // Start with default structure for safety

        // Map basic player fields, falling back to default if null/undefined in DB
        const playerState = defaultState.player;
        playerState.username = supabaseUserData.username || playerState.username;
        playerState.alias = supabaseUserData.alias || playerState.alias;
        playerState.level = supabaseUserData.level !== null ? supabaseUserData.level : playerState.level;
        playerState.cash = supabaseUserData.money !== null ? supabaseUserData.money : playerState.cash; // Map money back to cash
        playerState.power = supabaseUserData.power !== null ? supabaseUserData.power : playerState.power;
        playerState.hp = supabaseUserData.current_hp !== null ? supabaseUserData.current_hp : playerState.hp;
        // playerState.maxHp = calculateMaxHp(playerState.level, playerState.stats.vitality); // Recalculate if needed

        // Map JSONB fields (inventory, equipment) - crucial part
        // Ensure they are parsed correctly if stored as strings, though jsonb should handle objects
        playerState.inventory = Array.isArray(supabaseUserData.inventory) ? supabaseUserData.inventory : [];
        playerState.equipment = typeof supabaseUserData.equipment === 'object' && supabaseUserData.equipment !== null ? supabaseUserData.equipment : {};
        playerState.organization = typeof supabaseUserData.organization === 'object' ? supabaseUserData.organization : null;

        // Map other fields if they exist in Supabase data
        // playerState.experience = supabaseUserData.experience !== null ? supabaseUserData.experience : playerState.experience;
        // playerState.expNeeded = calculateExpNeeded(playerState.level); // Recalculate
        // if (typeof supabaseUserData.stats === 'object' && supabaseUserData.stats !== null) {
        //     playerState.stats = { ...playerState.stats, ...supabaseUserData.stats };
        // }

        console.log("Mapped game state from Supabase data:", defaultState);
        return defaultState;
    } catch (error) {
        console.error("Error mapping Supabase data to game state:", error, "Data:", supabaseUserData);
        return null; // Return null if mapping fails
    }
}


// Export functions needed by other modules
// Using a global object pattern for simplicity in browser environment without modules
window.SaveManager = {
    initializeSupabase,
    saveGame,
    loadGame,
    fetchLeaderboard,
    // Expose sync functions directly if needed elsewhere, but prefer using saveGame
    // syncUserData,
    // syncBusinessProtection
};
