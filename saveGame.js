// saveGame.js

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://gopmukllrferjfiqvzun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcG11a2xscmZlcmpmaXF2enVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NjMyMzAsImV4cCI6MjA1OTMzOTIzMH0.3VA2JlUqFDYZ-ajwRmnCqzWMXv0LHVxdboOSFw7IZHA';

let supabase = null;
const LOCAL_STORAGE_KEY = 'mobfiGameState';

// --- Initialization ---
function initializeSupabase() {
    try {
        supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized.');
        // Optional: Add listener for auth changes if using Supabase Auth
        // supabase.auth.onAuthStateChange((event, session) => {
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

    const { data, error } = await supabase
        .from('users')
        .upsert({
            id: userId, // Primary key
            username: userData.username,
            level: userData.level,
            money: userData.money,
            power: userData.power,
            updated_at: new Date().toISOString() // Let trigger handle this ideally
        }, {
            onConflict: 'id' // Specify the conflict column
        })
        .select(); // Select the upserted data

    if (error) {
        console.error('Error syncing user data:', error);
    } else {
        console.log('User data synced successfully:', data);
    }
    return { data, error };
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
        .select('username, level, money, power') // Select relevant columns
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
async function saveGame(gameState) {
    // 1. Save locally immediately
    saveGameLocally(gameState);

    // 2. Attempt to sync relevant parts to Supabase
    //    Requires proper user identification (Auth)
    const currentUser = supabase?.auth?.user(); // Example: Get current user if using Auth
    const userId = currentUser?.id; // This needs to be correctly obtained

    if (userId && gameState.player) {
         // Prepare user data object matching the 'users' table structure
        const userDataToSync = {
            id: userId, // Make sure this ID matches the one in Supabase Auth
            username: gameState.player.username || null, // Or however username is stored
            level: gameState.player.level,
            money: gameState.player.cash, // Assuming cash maps to money
            power: gameState.player.power // Assuming power maps to power
        };
        await syncUserData(userDataToSync);
    } else if (!userId) {
         console.warn("Cannot sync user data: User not logged in or ID unavailable.");
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

    // 2. If local data exists, potentially check Supabase for fresher data (optional, complex)
    //    Or just use local as the primary source on load.

    // 3. If no local data, try fetching from Supabase (requires user ID)
    //    This part is tricky without auth. If using auth, fetch user data after login.
    //    Example (pseudo-code):
    //    if (!gameState && supabase && supabase.auth.user()) {
    //        const userId = supabase.auth.user().id;
    //        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    //        if (data) {
    //            // Map Supabase data to gameState structure
    //            gameState = mapSupabaseToGameState(data);
    //            saveGameLocally(gameState); // Save fetched data locally
    //        } else {
    //             // User exists in Auth but not in users table? Or first login?
    //             // Create default state
    //             gameState = getDefaultGameState();
    //        }
    //    }

    // 4. If still no game state, create a default one
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

// --- Helper: Map Supabase data to Game State (Example) ---
// function mapSupabaseToGameState(supabaseUserData) {
//     const defaultState = getDefaultGameState();
//     defaultState.player.username = supabaseUserData.username;
//     defaultState.player.level = supabaseUserData.level;
//     defaultState.player.cash = supabaseUserData.money;
//     defaultState.player.power = supabaseUserData.power;
//     // ... map other fields ...
//     // Need to fetch related data like inventory, equipment, protection status separately
//     return defaultState;
// }


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
