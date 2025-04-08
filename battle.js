// battle.js - Handles battle simulation logic within a modal

// --- Battle State Variables ---
let currentBattle = {
    player: null,
    enemy: null,
    playerCurrentHp: 0,
    enemyCurrentHp: 0,
    isPlayerTurn: true,
    gameOver: false,
    isAutoAttackActive: false, // Added for auto-attack
    autoAttackTimeoutId: null, // Added for auto-attack delay management
    battleSpeedMultiplier: 1 // Added for battle speed control (1x, 2x, 4x)
};

// --- Battle Simulation Image Paths ---
const battleImagePaths = [
    'img/fight1.jpg',
    'img/fight2.jpg',
    'img/fight3.jpg'
];

// --- Utility Functions ---

function showBattleModal() {
    const battleModal = document.getElementById('battle-modal');
    if (battleModal) {
        battleModal.classList.remove('modal-hidden');
    } else {
        console.error("Battle modal element not found in showBattleModal!");
    }
}

function hideBattleModal() {
    const battleModal = document.getElementById('battle-modal');
    // Stop auto-attack and ensure image is hidden when modal closes
    stopAutoAttack();
    hideBattleImage();
    if (battleModal) {
        battleModal.classList.add('modal-hidden');
    } else {
         console.error("Battle modal element not found in hideBattleModal!");
    }
    // Restart background music when modal closes
    if (typeof playBgm === 'function') {
        playBgm();
    } else {
        console.warn("playBgm function not found when hiding battle modal.");
    }
}

function addLogEntry(message, type = 'info') {
    const battleLogDiv = document.getElementById('battle-log');
    if (!battleLogDiv) {
        // Don't log an error here as it might spam during initialization
        // console.error("Battle log element not found!");
        return;
    }
    const entry = document.createElement('p');
    entry.classList.add('log-entry');
    // Add specific class based on type for styling
    if (type === 'player') entry.classList.add('player-action');
    else if (type === 'enemy') entry.classList.add('enemy-action');
    else if (type === 'result') entry.classList.add('result-message');
    else if (type === 'flee') entry.classList.add('info-message'); // Style flee attempts
    else entry.classList.add('info-message'); // Default info

    entry.textContent = message;
    // Append the new entry to the end of the log container
    battleLogDiv.appendChild(entry);

    // Scroll to the bottom of the log to show the latest entry
    battleLogDiv.scrollTop = battleLogDiv.scrollHeight;
}

function updateHealthUI() {
    if (!currentBattle.player || !currentBattle.enemy) return;

    // Get elements needed for this update
    const battlePlayerHp = document.getElementById('battle-player-hp');
    const battlePlayerHealthBar = document.getElementById('battle-player-health-bar');
    const battleEnemyHp = document.getElementById('battle-enemy-hp');
    const battleEnemyHealthBar = document.getElementById('battle-enemy-health-bar');

    // Player HP
    const playerHpPercent = Math.max(0, (currentBattle.playerCurrentHp / currentBattle.player.health) * 100);
    if (battlePlayerHp) battlePlayerHp.textContent = Math.max(0, Math.round(currentBattle.playerCurrentHp)); // Round HP
    if (battlePlayerHealthBar) battlePlayerHealthBar.style.width = `${playerHpPercent}%`;

    // Enemy HP
    const enemyHpPercent = Math.max(0, (currentBattle.enemyCurrentHp / currentBattle.enemy.health) * 100);
    if (battleEnemyHp) battleEnemyHp.textContent = Math.max(0, Math.round(currentBattle.enemyCurrentHp)); // Round HP
    if (battleEnemyHealthBar) battleEnemyHealthBar.style.width = `${enemyHpPercent}%`;
}

function disableActions(disableAll = false) {
    const battleActionsDiv = document.getElementById('battle-actions');
    const battleAttackBtn = document.getElementById('battle-attack-btn');
    const battleAutoAttackBtn = document.getElementById('battle-auto-attack-btn');
    const battleFleeBtn = document.getElementById('battle-flee-btn');

    if (disableAll && battleActionsDiv) {
         battleActionsDiv.style.display = 'none'; // Hide all actions (e.g., battle end)
    } else {
        // Disable specific buttons during turns/auto-attack
        if (battleAttackBtn) battleAttackBtn.disabled = true;
        if (battleFleeBtn) battleFleeBtn.disabled = true;
        // Keep auto-attack button enabled so it can be toggled off
        if (battleAutoAttackBtn) battleAutoAttackBtn.disabled = false;
    }
}

function enableActions() {
     const battleActionsDiv = document.getElementById('battle-actions');
     const battleAttackBtn = document.getElementById('battle-attack-btn');
     const battleAutoAttackBtn = document.getElementById('battle-auto-attack-btn');
     const battleFleeBtn = document.getElementById('battle-flee-btn');

     if (battleActionsDiv) {
        battleActionsDiv.style.display = 'flex'; // Show action buttons
    }
     // Enable manual attack only if auto-attack is off
     if (battleAttackBtn) battleAttackBtn.disabled = currentBattle.isAutoAttackActive;
     if (battleFleeBtn) battleFleeBtn.disabled = false; // Always enable flee at start of player turn
     if (battleAutoAttackBtn) battleAutoAttackBtn.disabled = false;
}

// --- Battle Speed Control ---
function setBattleSpeed(speed) {
    const validSpeeds = [1, 2, 4];
    if (validSpeeds.includes(speed)) {
        currentBattle.battleSpeedMultiplier = speed;
        console.log(`Battle speed set to ${speed}x`);
        // Update UI button states
        document.querySelectorAll('.battle-speed-btn').forEach(btn => {
            btn.classList.remove('btn-active'); // Assuming a general class for active state
        });
        const activeBtn = document.getElementById(`battle-speed-${speed}x`);
        if (activeBtn) {
            activeBtn.classList.add('btn-active');
        }
    } else {
        console.warn(`Invalid battle speed requested: ${speed}`);
    }
}


// --- Shootout Visual ---
function showShootoutVisual() {
    const visualElement = document.getElementById('shootout-visual');
    if (visualElement) {
        visualElement.style.display = 'block';
        // Remove the element after animation finishes (match CSS duration) - Speed affects this too
        setTimeout(() => {
            visualElement.style.display = 'none';
        }, 500 / currentBattle.battleSpeedMultiplier); // 0.5s animation duration, adjusted by speed
    }
}

// --- Battle Image Display ---
let battleImageTimeoutId = null; // Timeout to hide the image

function showRandomBattleImage() {
    const imgElement = document.getElementById('battle-simulation-image');
    if (!imgElement || battleImagePaths.length === 0) return;

    // Clear any existing timeout to hide the image
    if (battleImageTimeoutId) {
        clearTimeout(battleImageTimeoutId);
        battleImageTimeoutId = null;
    }

    // Pick a random image
    const randomIndex = Math.floor(Math.random() * battleImagePaths.length);
    imgElement.src = battleImagePaths[randomIndex];
    imgElement.style.display = 'block'; // Make it visible

    // Set a timeout to hide the image after a short duration (e.g., 1 second), adjusted by speed
    battleImageTimeoutId = setTimeout(hideBattleImage, 1000 / currentBattle.battleSpeedMultiplier);
}

function hideBattleImage() {
     // Clear any pending timeout
     if (battleImageTimeoutId) {
        clearTimeout(battleImageTimeoutId);
        battleImageTimeoutId = null;
    }
    // Hide the image element
    const imgElement = document.getElementById('battle-simulation-image');
    if (imgElement) {
        imgElement.style.display = 'none';
        imgElement.src = ""; // Clear src
    }
}


// --- Core Battle Logic ---

// Function to initiate a battle (called from uiManager.js or elsewhere)
// Expects playerCharacterStats (implicitly via globals) and the full enemy object instance
function initiateBattle(playerBattleStats_IGNORED, enemyData) { // playerBattleStats_IGNORED is no longer needed, we use globals
    // --- Get Modal Element References ---
    const battleModal = document.getElementById('battle-modal');
    const battlePlayerName = document.getElementById('battle-player-name');
    const battlePlayerHp = document.getElementById('battle-player-hp');
    const battlePlayerMaxHp = document.getElementById('battle-player-max-hp');
    const battleEnemyName = document.getElementById('battle-enemy-name');
    const battleEnemyHp = document.getElementById('battle-enemy-hp');
    const battleEnemyMaxHp = document.getElementById('battle-enemy-max-hp');
    const battleLogDiv = document.getElementById('battle-log');
    const battleResultDiv = document.getElementById('battle-result');
    const battleAutoAttackBtn = document.getElementById('battle-auto-attack-btn');

    // Check if essential elements exist before proceeding
    // Note: We now use global playerCharacterStats and playerCurrentHp
    if (!battleModal || !enemyData || !battlePlayerName || !battleEnemyName || !battleLogDiv || !battleResultDiv || !battleAutoAttackBtn) {
        console.error("Cannot initiate battle: Missing required modal elements or enemy data.");
        return;
    }

     // Ensure playerCharacterStats is calculated before battle starts
     // This should ideally be done *before* calling initiateBattle, e.g., in the click handler
     calculateCharacterStats(); // Recalculate just in case

    // Reset battle state using calculated stats from gameWorld.js
    currentBattle = {
        player: { // Structure player battle data using calculated stats
            name: playerAlias || playerUsername || "Player", // Use global alias/username
            health: playerCharacterStats.maxHp, // Use calculated max HP
            damage: playerCharacterStats.damage, // Use calculated damage
            defence: playerCharacterStats.defence, // Use calculated defence
            evasionRate: playerCharacterStats.evasionRate, // Use calculated evasion
            criticalRate: playerCharacterStats.criticalRate // Use calculated crit rate
        },
        enemy: enemyData, // Store the actual Enemy object instance directly
        playerCurrentHp: playerCurrentHp, // Use the current global player HP
        enemyCurrentHp: enemyData.health, // Enemy starts at full health
        isPlayerTurn: true,
        gameOver: false,
        isAutoAttackActive: false, // Reset auto-attack
        autoAttackTimeoutId: null,
        battleSpeedMultiplier: 1 // Reset speed to 1x on new battle
    };

    // Reset speed buttons UI
    setBattleSpeed(1); // Set default speed and update UI

    // Reset auto-attack button state
    battleAutoAttackBtn.textContent = "Auto Attack";
    battleAutoAttackBtn.dataset.active = "false";
    battleAutoAttackBtn.classList.remove('btn-green');
    battleAutoAttackBtn.classList.add('btn-blue');


    // --- Initialize Modal UI ---
    battlePlayerName.textContent = currentBattle.player.name;
    battleEnemyName.textContent = currentBattle.enemy.name;
    if (battlePlayerMaxHp) battlePlayerMaxHp.textContent = Math.round(currentBattle.player.health); // Use player's max health
    if (battleEnemyMaxHp) battleEnemyMaxHp.textContent = Math.round(currentBattle.enemy.health); // Use enemy's max health
    updateHealthUI(); // Update bars based on current HP
    const logTitle = battleLogDiv.querySelector('p');
    battleLogDiv.innerHTML = '';
    if (logTitle) battleLogDiv.appendChild(logTitle);
    battleResultDiv.style.display = 'none';
    enableActions(); // Enable buttons for the start
    hideBattleImage(); // Ensure image is hidden when battle initializes

    addLogEntry(`Battle started: ${currentBattle.player.name} vs ${currentBattle.enemy.name}!`, 'info');
    addLogEntry(`${currentBattle.player.name}'s turn...`, 'info'); // Indicate player starts

    // Stop background music
    if (typeof stopBgm === 'function') {
        stopBgm();
    } else {
        console.warn("stopBgm function not found when initiating battle.");
    }

    showBattleModal();
    // REMOVED: startBattleImageCycle(); // Image is now shown only on hit
}

// Function to calculate base damage dealt (before critical)
// Now uses .damage/.attack and .defence/.defense properties depending on player/enemy
function calculateDamage(attacker, defender) {
    // Use .damage for player, .attack for the enemy instance
    const attackerDamageStat = attacker === currentBattle.player ? attacker.damage : attacker.attack;
    // Use .defence for player, .defense for the enemy instance
    const defenderDefenceStat = defender === currentBattle.player ? defender.defence : defender.defense;

    // Simple formula: Damage = Attacker's Damage Stat - Defender's Defence Stat * ReductionFactor
    // Ensure damage is at least 1. Add some randomness.
    const defenceReduction = defenderDefenceStat * 0.5; // Example: Defence reduces damage by 50% of its value
    let baseDamage = Math.max(1, attackerDamageStat - defenceReduction);

    // Add randomness (+/- 25%)
    const randomMultiplier = 0.75 + Math.random() * 0.5; // Range: 0.75 to 1.25
    let finalDamage = Math.round(baseDamage * randomMultiplier);

    finalDamage = Math.max(1, finalDamage); // Ensure minimum damage of 1
    // console.log(`${attacker.name} base damage calc: DmgStat=${attackerDamageStat}, DefStat=${defenderDefenceStat}, Reduced=${defenceReduction}, Base=${baseDamage.toFixed(1)}, Final=${finalDamage}`);
    return finalDamage;
}

// --- Turn Execution ---

function playerTurn() {
    if (currentBattle.gameOver || !currentBattle.isPlayerTurn) return;

    // Clear any pending auto-attack timeout if player attacked manually
    if (currentBattle.autoAttackTimeoutId) {
        clearTimeout(currentBattle.autoAttackTimeoutId);
        currentBattle.autoAttackTimeoutId = null;
    }

    showShootoutVisual(); // Show visual effect
    // Play battle sound
    if (typeof playRandomBattleSound === 'function') {
        playRandomBattleSound();
    }

    // --- Evasion Check ---
    const enemyEvasionRate = currentBattle.enemy.evasionRate || 0;
    if (Math.random() * 100 < enemyEvasionRate) {
        addLogEntry(`${currentBattle.enemy.name} evaded ${currentBattle.player.name}'s attack!`, 'enemy');
        hideBattleImage(); // Hide image on miss
    } else {
        // --- Attack Hits ---
        showRandomBattleImage(); // Show image on hit
        // --- Critical Hit Check ---
        const playerCriticalRate = currentBattle.player.criticalRate || 0;
        const isCritical = Math.random() * 100 < playerCriticalRate;
        const critMultiplier = 1.5; // Example: 1.5x damage on crit

        let damageDealt = calculateDamage(currentBattle.player, currentBattle.enemy);

        if (isCritical) {
            damageDealt = Math.round(damageDealt * critMultiplier);
            addLogEntry(`Critical Hit! ${currentBattle.player.name} attacks ${currentBattle.enemy.name} for ${damageDealt} damage.`, 'player');
        } else {
            addLogEntry(`${currentBattle.player.name} attacks ${currentBattle.enemy.name} for ${damageDealt} damage.`, 'player');
        }

        currentBattle.enemyCurrentHp -= damageDealt;
        updateHealthUI();
    }

    // --- Check for Enemy Defeat ---
    if (currentBattle.enemyCurrentHp <= 0) {
        endBattle(true); // Player wins
    } else {
        currentBattle.isPlayerTurn = false;
        disableActions(); // Disable player actions during enemy turn
        addLogEntry(`${currentBattle.enemy.name}'s turn...`, 'info');
        // Enemy attacks after a delay, adjusted by speed
        setTimeout(enemyTurn, 1200 / currentBattle.battleSpeedMultiplier);
    }
}

function enemyTurn() {
    if (currentBattle.gameOver || currentBattle.isPlayerTurn) return;

    showShootoutVisual(); // Show visual effect
    // Play battle sound
    if (typeof playRandomBattleSound === 'function') {
        playRandomBattleSound();
    }

    // --- Evasion Check ---
    const playerEvasionRate = currentBattle.player.evasionRate || 0;
    if (Math.random() * 100 < playerEvasionRate) {
        addLogEntry(`${currentBattle.player.name} evaded ${currentBattle.enemy.name}'s attack!`, 'player');
        hideBattleImage(); // Hide image on miss
    } else {
        // --- Attack Hits ---
        showRandomBattleImage(); // Show image on hit
        // --- Critical Hit Check ---
        const enemyCriticalRate = currentBattle.enemy.criticalRate || 0;
        const isCritical = Math.random() * 100 < enemyCriticalRate;
        const critMultiplier = 1.5;

        let damageDealt = calculateDamage(currentBattle.enemy, currentBattle.player);

        if (isCritical) {
            damageDealt = Math.round(damageDealt * critMultiplier);
            addLogEntry(`Critical Hit! ${currentBattle.enemy.name} attacks ${currentBattle.player.name} for ${damageDealt} damage.`, 'enemy');
        } else {
            addLogEntry(`${currentBattle.enemy.name} attacks ${currentBattle.player.name} for ${damageDealt} damage.`, 'enemy');
        }

        currentBattle.playerCurrentHp -= damageDealt;
        updateHealthUI();
    }

     // --- Check for Player Defeat ---
    if (currentBattle.playerCurrentHp <= 0) {
        endBattle(false); // Player loses
    } else {
        currentBattle.isPlayerTurn = true;
        addLogEntry(`${currentBattle.player.name}'s turn...`, 'info');

        // Check for auto-attack
        // Check for auto-attack
        if (currentBattle.isAutoAttackActive) {
            disableActions(); // Keep actions disabled
            // Schedule next auto-attack, adjusted by speed
            currentBattle.autoAttackTimeoutId = setTimeout(playerTurn, 1000 / currentBattle.battleSpeedMultiplier);
        } else {
            enableActions(); // Re-enable player actions for manual turn
        }
    }
}

// --- Flee Action ---
function attemptFlee() {
    if (currentBattle.gameOver || !currentBattle.isPlayerTurn) return;

    disableActions(); // Disable actions while attempting to flee
    stopAutoAttack(); // Stop auto-attack if fleeing

    const fleeChance = 0.5; // 50% chance to flee (adjust as needed)
    addLogEntry(`${currentBattle.player.name} attempts to flee...`, 'flee');

    // Add a small delay for the attempt message, adjusted by speed
    setTimeout(() => {
        if (Math.random() < fleeChance) {
            // Flee successful
            addLogEntry("Successfully fled from battle!", 'result');
            currentBattle.gameOver = true; // End battle state
            // Don't call endBattle() as it implies win/loss
            // Restart BGM and hide image on successful flee
            hideBattleImage(); // Hide image
            if (typeof playBgm === 'function') {
                playBgm();
            } else {
                console.warn("playBgm function not found after fleeing.");
            }
            // Close modal after a delay, adjusted by speed
            setTimeout(hideBattleModal, 1500 / currentBattle.battleSpeedMultiplier);
        } else {
            // Flee failed
            addLogEntry("Failed to flee!", 'flee');
            currentBattle.isPlayerTurn = false; // Player loses their turn
            addLogEntry(`${currentBattle.enemy.name}'s turn...`, 'info');
            // Enemy attacks after flee failure, adjusted by speed
            setTimeout(enemyTurn, 1200 / currentBattle.battleSpeedMultiplier);
        }
    }, 800 / currentBattle.battleSpeedMultiplier); // Delay for flee attempt message, adjusted by speed
}

// --- Auto Attack Toggle ---
function toggleAutoAttack() {
    if (currentBattle.gameOver) return;

    const autoAttackBtn = document.getElementById('battle-auto-attack-btn');
    const attackBtn = document.getElementById('battle-attack-btn');
    currentBattle.isAutoAttackActive = !currentBattle.isAutoAttackActive;

    if (currentBattle.isAutoAttackActive) {
        autoAttackBtn.textContent = "Auto ON";
        autoAttackBtn.dataset.active = "true";
        autoAttackBtn.classList.remove('btn-blue');
        autoAttackBtn.classList.add('btn-green');
        if (attackBtn) attackBtn.disabled = true; // Disable manual attack

        // If it's the player's turn, start the auto-attack sequence
        if (currentBattle.isPlayerTurn) {
            addLogEntry("Auto-attack enabled.", 'info');
            disableActions(); // Disable buttons immediately
             // Clear any existing timeout before starting a new one
            if (currentBattle.autoAttackTimeoutId) {
                clearTimeout(currentBattle.autoAttackTimeoutId);
            }
            // Start first auto-attack quickly, adjusted by speed
            currentBattle.autoAttackTimeoutId = setTimeout(playerTurn, 500 / currentBattle.battleSpeedMultiplier);
        }
    } else {
        stopAutoAttack(); // Call the function to handle stopping logic
    }
}

function stopAutoAttack() {
     const autoAttackBtn = document.getElementById('battle-auto-attack-btn');
     const attackBtn = document.getElementById('battle-attack-btn');
     currentBattle.isAutoAttackActive = false;
     if (currentBattle.autoAttackTimeoutId) {
        clearTimeout(currentBattle.autoAttackTimeoutId);
        currentBattle.autoAttackTimeoutId = null;
     }
     if (autoAttackBtn) {
        autoAttackBtn.textContent = "Auto Attack";
        autoAttackBtn.dataset.active = "false";
        autoAttackBtn.classList.remove('btn-green');
        autoAttackBtn.classList.add('btn-blue');
     }
     // Re-enable manual attack ONLY if it's the player's turn and battle isn't over
     if (attackBtn && currentBattle.isPlayerTurn && !currentBattle.gameOver) {
        attackBtn.disabled = false;
     }
     addLogEntry("Auto-attack disabled.", 'info');
}


// --- Battle End ---

function endBattle(playerWon) {
    currentBattle.gameOver = true;
    stopAutoAttack(); // Ensure auto-attack is stopped
    hideBattleImage(); // Ensure image is hidden on battle end
    disableActions(true); // Disable all actions

    // Get result elements
    const battleResultDiv = document.getElementById('battle-result');
    const battleResultMessage = document.getElementById('battle-result-message');

    let message = "";
    let messageClass = "";

    if (playerWon) {
        message = `${currentBattle.enemy.name} defeated! You are victorious!`;
        messageClass = "victory";
        addLogEntry(message, 'result');
        if (typeof removeEnemyFromMap === 'function') {
            removeEnemyFromMap(currentBattle.enemy.id);
        } else {
            console.error("removeEnemyFromMap function is not available!");
        }

        // --- Grant Loot & Experience ---
        let lootMessage = ""; // String to build for the result message
        if (typeof currentBattle.enemy.getLoot === 'function') {
            const lootDrops = currentBattle.enemy.getLoot(); // Get array of { itemId, quantity }
            if (lootDrops && lootDrops.length > 0) {
                addLogEntry("--- Loot Obtained ---", 'result'); // Clearer separator
                lootMessage += "<br>Loot: ";
                let lootItems = [];
                lootDrops.forEach(drop => {
                    if (drop.itemId === 'MONEY') {
                        // Handle money drop
                        if (typeof currentCash !== 'undefined' && typeof updateCashUI === 'function') {
                            currentCash += drop.quantity;
                            updateCashUI(currentCash); // Use the UI update function
                            addLogEntry(`- $${drop.quantity}`, 'result');
                            lootItems.push(`$${drop.quantity}`);
                            console.log(`Added $${drop.quantity} cash.`);
                        } else {
                            console.warn("Cannot add money loot: currentCash or updateCashUI not found.");
                        }
                    } else {
                        // Handle item drop
                        if (typeof addItemToInventory === 'function' && typeof getItemById === 'function') {
                            const itemInfo = getItemById(drop.itemId); // Get item details for logging
                            const itemName = itemInfo ? itemInfo.name : drop.itemId;
                            addItemToInventory(drop.itemId, drop.quantity); // Add to inventory (function from gameWorld.js)
                            addLogEntry(`- ${itemName} x${drop.quantity}`, 'result');
                            lootItems.push(`${itemName} x${drop.quantity}`);
                        } else {
                            console.warn(`Cannot add item loot ${drop.itemId}: addItemToInventory or getItemById function not found.`);
                        }
                    }
                });
                lootMessage += lootItems.join(', ');
            } else {
                addLogEntry("No loot dropped.", 'result');
            }
        } else {
            console.warn("Enemy does not have a getLoot method.");
        }

        // --- Grant Experience ---
        let expGained = 0;
        if (currentBattle.enemy.experienceRate && typeof gainExperience === 'function') {
            expGained = currentBattle.enemy.experienceRate; // Use the rate defined in enemy.js
            gainExperience(expGained); // Function from gameWorld.js
            addLogEntry(`Gained ${expGained} EXP!`, 'result');
            lootMessage += `<br>EXP: ${expGained}`; // Add EXP to the loot message string
        } else {
            console.warn("Cannot grant EXP: Enemy experienceRate or gainExperience function not found.");
        }

        // Append loot and EXP message to the main victory message
        message += lootMessage;

    } else {
        message = `${currentBattle.player.name} defeated! Game Over?`;
        messageClass = "defeat";
        addLogEntry(message, 'result');
        // TODO: Handle player defeat
    }

    // Update global player health state using the correct variable
    if (typeof playerCurrentHp !== 'undefined' && typeof updateHpUI === 'function') {
         // Directly update the global variable
         playerCurrentHp = Math.max(0, currentBattle.playerCurrentHp);
         console.log(`Player health updated to: ${playerCurrentHp}`);
         updateHpUI(); // Update the dashboard UI as well
    } else {
        console.warn("Global playerCurrentHp variable or updateHpUI function not found to update after battle.");
    }

    // Show result message (now potentially including loot) and close button
    if (battleResultMessage) {
        battleResultMessage.innerHTML = message; // Use innerHTML to render the <br> tag
        battleResultMessage.className = ''; // Reset class
        battleResultMessage.classList.add(messageClass);
    }
    if (battleResultDiv) battleResultDiv.style.display = 'block';

    // --- Save Game State After Battle ---
    if (typeof SaveManager !== 'undefined' && SaveManager.saveGame && typeof gatherCurrentGameState === 'function') {
        console.log("Saving game state after battle conclusion.");
        SaveManager.saveGame(gatherCurrentGameState()).catch(err => {
            // Silently ignore expected AuthSessionMissingError, log others
            if (!(err instanceof Error && (err.message === 'Auth session missing!' || err.name === 'AuthSessionMissingError'))) {
                 console.error("Unexpected save error after battle:", err); // Log unexpected errors
            }
             // Do nothing if it's the expected error
        });
    } else {
        console.error("Could not save game after battle: SaveManager or gatherCurrentGameState not found.");
    }
}

// --- Event Listeners (Attached after DOM is loaded) ---

document.addEventListener('DOMContentLoaded', function() {
    const battleAttackBtn = document.getElementById('battle-attack-btn');
    if (battleAttackBtn) {
        battleAttackBtn.addEventListener('click', () => {
            if (currentBattle.isPlayerTurn && !currentBattle.gameOver && !currentBattle.isAutoAttackActive) {
                disableActions();
                playerTurn();
            }
        });
    } else {
        console.error("Battle attack button not found after DOM loaded!");
    }

    const battleAutoAttackBtn = document.getElementById('battle-auto-attack-btn');
    if (battleAutoAttackBtn) {
        battleAutoAttackBtn.addEventListener('click', toggleAutoAttack);
    } else {
         console.error("Battle auto-attack button not found after DOM loaded!");
    }

    const battleFleeBtn = document.getElementById('battle-flee-btn');
    if (battleFleeBtn) {
        battleFleeBtn.addEventListener('click', () => {
             if (currentBattle.isPlayerTurn && !currentBattle.gameOver) {
                attemptFlee();
            }
        });
    } else {
         console.error("Battle flee button not found after DOM loaded!");
    }


    const battleCloseBtn = document.getElementById('battle-close-btn');
    if (battleCloseBtn) {
        battleCloseBtn.addEventListener('click', hideBattleModal);
    } else {
        console.error("Battle close button not found after DOM loaded!");
    }
});


// --- Further Development Ideas ---
// - Implement different attack types (melee, ranged, special abilities)
// - Add accuracy/evasion mechanics
// - Incorporate items/equipment effects
// - Handle status effects (poison, stun, etc.)
// - Allow player actions (defend, use item)
// - Add visual feedback (screen shake, hit effects)
// - Update player health on the main dashboard after battle.
