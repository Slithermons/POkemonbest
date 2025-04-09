// saveGame.js

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://gopmukllrferjfiqvzun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcG11a2xscmZlcmpmaXF2enVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NjMyMzAsImV4cCI6MjA1OTMzOTIzMH0.3VA2JlUqFDYZ-ajwRmnCqzWMXv0LHVxdboOSFw7IZHA';

let supabase = null;
// const LOCAL_STORAGE_KEY = 'mobfiGameState'; // No longer using a single fixed key

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

// --- Local Storage (Uses Player ID as Key) ---
function saveGameLocally(playerId, gameState) {
    if (!playerId) {
        console.error("Cannot save locally: Player ID is missing.");
        return;
    }
    try {
        const key = `mobfiGameState_${playerId}`; // Use player ID in the key
        localStorage.setItem(key, JSON.stringify(gameState));
        console.log(`Game state saved locally for player ${playerId}.`);
    } catch (error) {
        console.error(`Error saving game state locally for player ${playerId}:`, error);
        // Consider fallback or user notification
    }
}

function loadGameLocally(playerId) {
    if (!playerId) {
        console.error("Cannot load locally: Player ID is missing.");
        return null;
    }
    try {
        const key = `mobfiGameState_${playerId}`; // Use player ID in the key
        const savedState = localStorage.getItem(key);
        if (savedState) {
            console.log(`Game state loaded locally for player ${playerId}.`);
            return JSON.parse(savedState);
        }
        console.log(`No local save data found for player ${playerId}.`);
        return null; // Or return a default initial state
    } catch (error) {
        console.error(`Error loading game state locally for player ${playerId}:`, error);
        const key = `mobfiGameState_${playerId}`;
        localStorage.removeItem(key); // Clear corrupted data for this player
        return null; // Or return a default initial state
    }
}

// --- Supabase Sync ---

// Function to save/update user data
// Expects userData object containing id (wallet_address), username, alias, cash, hp
async function syncUserData(userData) {
    if (!supabase) {
        console.error('Supabase client not initialized for syncUserData.');
        return { error: 'Supabase not ready' };
    }

    // Extract the user ID (wallet address) from the passed object
    const userId = userData.id; // Assuming 'id' property holds the wallet address
    if (!userId) {
        console.error('User ID (wallet_address) not found in userData for sync.');
        return { error: 'User ID missing in sync data' };
    }

    // --- ADDED: Detailed log before upsert ---
    // Prepare user data object matching the 'users' table structure from schema
    const dataToUpsert = {
        wallet_address: userId, // Use correct primary key column name (extracted above)
        username: userData.username || null,
        alias: userData.alias || null,
        cash: userData.cash !== undefined ? userData.cash : 0, // Default if undefined
        hp: userData.hp !== undefined ? userData.hp : 100, // Default if undefined
        level: userData.level !== undefined ? userData.level : 1, // Add level, default if undefined
        power: userData.power !== undefined ? userData.power : 10 // Add power, default if undefined
        // updated_at is handled by the database default
    };
    console.log(`[syncUserData] Attempting upsert for user ${userId} with data:`, JSON.stringify(dataToUpsert, null, 2)); // Pretty print JSON
    // --- END ADDED ---

    const { data, error } = await supabase
        .from('users')
        .upsert(dataToUpsert, { // Use the prepared object
            onConflict: 'wallet_address' // Specify the correct conflict column
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

    // Determine the column to order by based on the type requested.
    let orderByColumn;
    switch (type) {
        case 'power':
            orderByColumn = 'power';
            break;
        case 'level': // Assuming you might want a level leaderboard later
            orderByColumn = 'level';
            break;
        case 'money':
        default:
            orderByColumn = 'cash'; // Use 'cash' column for 'money' type
            break;
    }

    // Select relevant columns, including the one we order by
    const selectColumns = 'username, alias, cash, hp, level, power'; // Select all relevant columns

    console.log(`Fetching ${type} leaderboard, ordering by ${orderByColumn}, selecting ${selectColumns}`); // Debug log

    const { data, error } = await supabase
        .from('users')
        .select(selectColumns) // Select the correct columns
        .order(orderByColumn, { ascending: false }) // Order by the determined column
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
    const userId = window.currentPlayerId; // Get current player ID (wallet address)
    // const isGuest = localStorage.getItem('isGuestSession') === 'true'; // REMOVED guest check

    if (!userId) {
        console.error("[saveGame] Cannot save: No currentPlayerId found.");
        return;
    }

    // 1. Save locally immediately using the player ID as the key
    saveGameLocally(userId, gameState);

    // 2. Attempt to sync relevant parts to Supabase (always attempt if userId exists)
    // if (!isGuest) { // REMOVED guest check wrapper
    if (gameState.player) {
        console.log(`[saveGame] Attempting to sync user data to Supabase for User ID: ${userId}`); // Log sync attempt
        // Prepare user data object matching the 'users' table structure, including the ID
            const userDataToSync = {
                id: userId, // Include the wallet address as 'id' for syncUserData
                username: gameState.player.username || null,
                alias: gameState.player.alias,
                cash: gameState.player.cash,
                hp: gameState.player.hp,
                level: gameState.player.level, // Include level
                power: gameState.player.power  // Include power
            };
        // --- FIXED: Call syncUserData once with the complete object ---
        const syncResult = await syncUserData(userDataToSync); // Pass the single object
        if (syncResult.error) {
            console.warn(`[saveGame] Supabase sync failed for user ${userId}. Data saved locally, but not to cloud. Error:`, syncResult.error); // Log the actual error object
            // Optionally: Implement retry logic or notify user
        } else {
            console.log(`[saveGame] Supabase sync successful for user ${userId}.`);
        }
        // --- END MODIFIED ---
        } else {
            console.warn("[saveGame] Cannot sync user data: gameState.player is missing.");
        }
    // } else { // REMOVED guest check else block
    //     console.log("[saveGame] Guest session detected. Skipping Supabase sync.");
    // }


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
    const userId = window.currentPlayerId; // Get current player ID (wallet address) set in initialization.js
    // const isGuest = localStorage.getItem('isGuestSession') === 'true'; // REMOVED guest check
    let gameState = null;
    let fetchedFromSupabase = false;

    if (!userId) {
        console.error("[loadGame] Cannot load: No currentPlayerId found. This shouldn't happen if auth check passed.");
        // Fallback to default, but this indicates an issue in the auth flow.
        gameState = getDefaultGameState();
        saveGameLocally(`guest_fallback_${Date.now()}`, gameState); // Save default under a fallback key
        return gameState;
    }

    // 1. Try loading from local storage using the player ID
    gameState = loadGameLocally(userId);

    // 2. If we have a Supabase client, attempt to load/sync from Supabase
    // if (!isGuest && supabase) { // REMOVED guest check
    if (supabase) {
        console.log(`[loadGame] Wallet user detected (${userId}). Checking Supabase for game state.`); // Added prefix
        try {
            console.log(`[loadGame] Fetching user data for wallet_address: ${userId}`); // Log before fetch
            const { data: supabaseUserData, error: fetchError } = await supabase
                .from('users') // Ensure this table name is correct
                .select('*') // Select all columns
                .eq('wallet_address', userId); // Use correct column name for filtering
                // REMOVED .single() modifier

            // Handle potential errors
            if (fetchError) {
                 console.error(`[loadGame] Error fetching user data from Supabase:`, fetchError); // Added prefix
            // Check if data is an array and has at least one element
            } else if (Array.isArray(supabaseUserData) && supabaseUserData.length > 0) {
                const userRecord = supabaseUserData[0]; // Get the first (and should be only) record
                console.log("[loadGame] User data fetched successfully from Supabase:", JSON.stringify(userRecord)); // Log fetched data
                const mappedState = mapSupabaseToGameState(userRecord); // Use the user record
                if (mappedState) {
                    console.log("[loadGame] Successfully mapped Supabase data to game state."); // Log mapping success
                    // --- FIX: Update global currentPlayerId --- - This seems redundant if loadGame is called after initialization sets it. Keeping for safety.
                    // Ensure gameWorld.js's global variable is updated
                    if (typeof window.currentPlayerId !== 'undefined') { // Access global scope
                         window.currentPlayerId = userId;
                         console.log(`Global currentPlayerId updated to: ${userId}`);
                    } else {
                         console.warn("Global variable 'currentPlayerId' not found in window scope during load.");
                    }
                    // --- End FIX ---

                    // Compare timestamps? If Supabase is newer or local doesn't exist, use Supabase data.
                    const localTimestamp = gameState?.lastSaved || 0; // Assuming gameState has a timestamp
                    // Use the 'last_updated' column from the schema
                    const supabaseTimestamp = new Date(userRecord.last_updated || 0).getTime();

                    if (supabaseTimestamp > localTimestamp) {
                        console.log("[loadGame] Supabase data is newer or local data missing. Using Supabase state."); // Added prefix
                        gameState = mappedState;
                        saveGameLocally(userId, gameState); // Update local storage with fetched data
                        fetchedFromSupabase = true;
                    } else {
                        console.log("[loadGame] Local data is newer or same age as Supabase. Keeping local state."); // Added prefix
                        // Keep the gameState loaded from local storage
                    }
                } else {
                    console.error("[loadGame] Failed to map Supabase data to game state."); // Added prefix
                    // Keep existing local gameState if mapping fails
                    // Keep existing local gameState if mapping fails, or fall through to default
                }
            } else { // Handle case where data is null, empty array, or not an array
                console.log(`[loadGame] User ${userId} not found in Supabase 'users' table or no data returned. Raw response data: ${JSON.stringify(supabaseUserData)}`); // Added prefix and raw data log
                // If local data exists, keep it. Otherwise, will fall through to default.
                if (gameState) {
                    console.log("[loadGame] Keeping locally loaded game state as Supabase returned no data."); // Added prefix
                }
            }
        } catch (error) {
            console.error("Exception during Supabase fetch in loadGame:", error);
            // Keep local gameState if fetch fails
        }
    // } else if (isGuest) { // REMOVED guest check else if
    //     console.log(`Guest session (${userId}). Using only local save data.`);
    } else if (!supabase) {
        console.warn("[loadGame] Supabase client not initialized. Cannot fetch cloud save.");
    }

    // 3. If still no game state (neither local nor fetched/kept), create a default one
    if (!gameState) {
        console.log(`No existing game state found for ${userId}. Creating default game state.`);
        gameState = getDefaultGameState();
        saveGameLocally(userId, gameState); // Save the default state under the player's ID
    }

    // Ensure the loaded/default state has the correct player ID structure if needed elsewhere
    if (gameState && gameState.player && !gameState.player.id) {
        gameState.player.id = userId; // Add the ID to the player object if missing
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
        playerState.id = supabaseUserData.wallet_address; // Store the wallet address as the ID
        playerState.username = supabaseUserData.username || playerState.username;
        playerState.alias = supabaseUserData.alias || playerState.alias;
        playerState.cash = supabaseUserData.cash !== null ? supabaseUserData.cash : playerState.cash;
        playerState.hp = supabaseUserData.hp !== null ? supabaseUserData.hp : playerState.hp;
        playerState.level = supabaseUserData.level !== null ? supabaseUserData.level : playerState.level; // Map level
        playerState.power = supabaseUserData.power !== null ? supabaseUserData.power : playerState.power; // Map power
        // playerState.maxHp = calculateMaxHp(playerState.level, playerState.stats.vitality); // Recalculate if needed

        // Removed mappings for fields not directly in the 'users' table:
        // inventory, equipment, organization, experience, stats (except base ones mapped above)

        // Note: Fields like inventory, equipment, detailed stats, maxHp, expNeeded
        // will retain their default values from getDefaultGameState() unless they are
        // derived or calculated elsewhere after loading.
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
