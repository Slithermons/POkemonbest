// uiManager.js with Shop Modal Logic (Corrected Element References)

// --- UI Element References (Keep non-modal elements here) ---
const cashAmountElement = document.getElementById('cash-amount');
const userOrganizationElement = document.getElementById('user-organization');
const leaveOrganizationButton = document.getElementById('leave-organization-button');
const protectionBookElement = document.getElementById('protection-book');
const controlledBusinessesListElement = document.getElementById('controlled-businesses-list');
const usernameInput = document.getElementById('username-input');
const aliasInput = document.getElementById('alias-input');
const saveUserInfoBtn = document.getElementById('save-user-info-btn');
const customAlertDiv = document.getElementById('custom-alert');
const customAlertMessage = document.getElementById('custom-alert-message');
const customAlertCloseBtn = document.getElementById('custom-alert-close');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const centerMapBtn = document.getElementById('center-map-btn');
const playerAliasBar = document.getElementById('player-alias-bar'); // New bottom bar element
const playerLevelBar = document.getElementById('player-level-bar'); // New bottom bar element
// Shop Modal Elements - Moved inside DOMContentLoaded


// --- Icon Definitions ---
// Define a base icon using custom image
const baseIcon = L.icon({
    iconUrl: 'img/org.png', // Path to the custom organization image
    iconSize: [40, 40], // Adjust size as needed
    iconAnchor: [20, 40], // Point at the bottom center (adjust if needed)
    popupAnchor: [0, -40] // Popup above the anchor
    // className: 'map-icon-darktheme' // Optional: Keep if filter is desired
});

// Define custom business icon using local image
const customBusinessIcon = L.icon({
    iconUrl: 'img/business.png', // Path to the custom image
    iconSize: [35, 35], // Adjust size as needed
    iconAnchor: [17, 35], // Point bottom center
    popupAnchor: [0, -35] // Popup above the anchor
    // className: 'map-icon-darktheme' // Optional: Keep if filter is desired
});

// Define custom shop icon
const shopIcon = L.icon({
    iconUrl: 'img/shop.png', // Path to the shop image
    iconSize: [35, 35], // Adjust size as needed
    iconAnchor: [17, 35], // Point bottom center
    popupAnchor: [0, -35] // Popup above the anchor
});

// Define a cash drop icon (e.g., money bag)
const cashIcon = L.icon({
    iconUrl: 'https://img.icons8.com/external-flatart-icons-flat-flatarticons/64/000000/external-money-bag-valentines-day-flatart-icons-flat-flatarticons.png', // Example money bag icon
    iconSize: [40, 40], // Adjusted size
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: 'map-icon-darktheme' // Class for CSS filter
});

// Define abandoned building icon
const abandonedBuildingIcon = L.icon({
    iconUrl: 'img/build.png', // Path to the building image
    iconSize: [35, 35], // Adjust size as needed
    iconAnchor: [17, 35], // Point bottom center
    popupAnchor: [0, -35] // Popup above the anchor
});

// Define ads icon
const adsIcon = L.icon({
    iconUrl: 'img/ads.png', // Path to the ads image
    iconSize: [35, 35], // Adjust size as needed
    iconAnchor: [17, 35], // Point bottom center
    popupAnchor: [0, -35] // Popup above the anchor
});

// Define a rival icon (e.g., silhouette or fedora)
const rivalIcon = L.icon({
    iconUrl: 'https://img.icons8.com/ios-filled/50/000000/user-secret.png', // Example secret user icon
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
    className: 'map-icon-darktheme' // Class for CSS filter
});


// --- UI Update Functions ---

// Function to update the UI based on organization status
function updateOrganizationUI() {
    if (!userOrganizationElement || !leaveOrganizationButton || !protectionBookElement || !controlledBusinessesListElement) {
        console.error("One or more dashboard/protection UI elements not found!");
        return;
    }
    if (currentUserOrganization) { // Variable from gameWorld.js
        userOrganizationElement.textContent = `${currentUserOrganization.name} (${currentUserOrganization.abbreviation})`;
        leaveOrganizationButton.style.display = 'block';
        updateProtectionBookUI(); // Update and potentially show the book
    } else {
        userOrganizationElement.textContent = 'None';
        leaveOrganizationButton.style.display = 'none';
        protectionBookElement.style.display = 'none'; // Hide protection book
        controlledBusinessesListElement.innerHTML = ''; // Clear book content
    }
}

// Function to update the HP display (bar and text)
function updateHpUI() {
    const hpBarElement = document.getElementById('player-hp-bar');
    const currentHpElement = document.getElementById('player-current-hp');
    const maxHpElement = document.getElementById('player-max-hp');

    if (!hpBarElement || !currentHpElement || !maxHpElement) {
        console.error("HP UI elements not found!");
        return;
    }

    // Ensure maxHp is not zero to avoid division by zero
    const maxHp = playerMaxHp > 0 ? playerMaxHp : 1; // Use global var from gameWorld.js
    const currentHp = playerCurrentHp; // Use global var from gameWorld.js

    const hpPercentage = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

    hpBarElement.style.width = `${hpPercentage}%`;
    currentHpElement.textContent = Math.round(currentHp); // Display rounded HP
    maxHpElement.textContent = Math.round(maxHp); // Display rounded Max HP

    // Optional: Change bar color based on HP percentage
    if (hpPercentage < 25) {
        hpBarElement.style.background = 'linear-gradient(to right, #c62828, #ef5350)'; // Red gradient
    } else if (hpPercentage < 50) {
        hpBarElement.style.background = 'linear-gradient(to right, #ff9800, #ffb74d)'; // Orange gradient
    } else {
        hpBarElement.style.background = 'linear-gradient(to right, #4caf50, #81c784)'; // Green gradient (default)
    }
}

// Function to update the Experience display (in Stats Modal)
function updateExperienceUI() {
    const levelSpan = document.getElementById('stats-level');
    const experienceSpan = document.getElementById('stats-experience');
    const expNeededSpan = document.getElementById('stats-exp-needed');

    if (levelSpan) levelSpan.textContent = playerLevel;
    if (experienceSpan) experienceSpan.textContent = playerExperience;
    if (expNeededSpan) expNeededSpan.textContent = calculateExpNeeded(playerLevel);

    // Update bottom bar level display
    if (playerLevelBar) playerLevelBar.textContent = `Level: ${playerLevel}`;
}


// Function to update the cash display
function updateCashUI(amount) {
    if (cashAmountElement) {
        cashAmountElement.textContent = amount;
    } else {
        console.error("Cash amount element not found!");
    }
}

// Function to update the inventory UI (targets grid inside the modal)
function updateInventoryUI() {
    console.log('updateInventoryUI called. Current playerInventory:', JSON.stringify(playerInventory)); // playerInventory from gameWorld.js

    const gridElement = document.getElementById('inventory-grid');
    if (!gridElement) {
        // Don't error here, modal might not be open or element might not exist yet
        return;
    }

    gridElement.innerHTML = ''; // Clear current grid content
    const totalSlots = 24; // Based on the image provided
    let filledSlotsCount = 0;

    // Ensure databases are available
    if (typeof itemsDatabase === 'undefined' || typeof equipmentDatabase === 'undefined') {
        console.error("itemsDatabase or equipmentDatabase not found!");
        gridElement.innerHTML = '<div class="inventory-slot empty">Error loading item data!</div>'; // Show error in a slot
        return;
    }
     // Ensure Rarity is available (defined in equipment.js)
    if (typeof Rarity === 'undefined') {
        console.error("Rarity object not found! Make sure equipment.js is loaded before uiManager.js");
        // Continue without rarity styling if needed
    }

    // Group items by ID for display (e.g., Medkit x2)
    const groupedInventory = playerInventory.reduce((acc, itemEntry) => {
        acc[itemEntry.id] = (acc[itemEntry.id] || 0) + (itemEntry.quantity || 1);
        return acc;
    }, {});

    // Populate slots with actual items
    for (const itemId in groupedInventory) {
        if (filledSlotsCount >= totalSlots) break; // Stop if grid is full

        const itemDefinition = itemsDatabase.get(itemId) || equipmentDatabase.get(itemId); // Use the Maps
        const quantity = groupedInventory[itemId];

        if (itemDefinition) {
            console.log(`updateInventoryUI - Rendering item: ${itemId}, Name: ${itemDefinition.name}, Quantity: ${quantity}`);
            const slotDiv = document.createElement('div');
            slotDiv.classList.add('inventory-slot');
            slotDiv.dataset.itemId = itemId; // Store item ID for potential click actions
            slotDiv.title = `${itemDefinition.name}${quantity > 1 ? ` (x${quantity})` : ''}\n${itemDefinition.description || ''}`; // Tooltip

            // Add item icon if available in definition
            if (itemDefinition.icon) {
                const img = document.createElement('img');
                img.src = itemDefinition.icon;
                img.alt = itemDefinition.name;
                slotDiv.appendChild(img);
            } else {
                // Fallback text if no icon
                slotDiv.textContent = itemDefinition.name.substring(0, 3); // Show first 3 letters?
                slotDiv.style.fontSize = '0.7em'; // Make text small
                slotDiv.style.textAlign = 'center';
                slotDiv.style.lineHeight = '1';
            }

            // Add quantity indicator if more than 1
            if (quantity > 1) {
                const countSpan = document.createElement('span');
                countSpan.classList.add('item-count');
                countSpan.textContent = quantity;
                slotDiv.appendChild(countSpan);
            }

             // Apply rarity styling (e.g., border color) - Optional enhancement
            if (itemDefinition.itemType === 'Equipment' && itemDefinition.rarity && typeof Rarity !== 'undefined') {
                const rarityInfo = typeof itemDefinition.rarity === 'object' ? itemDefinition.rarity : Rarity[itemDefinition.rarity.toUpperCase().replace('-', '_')];
                if (rarityInfo && rarityInfo.color) {
                    slotDiv.style.borderColor = rarityInfo.color;
                    slotDiv.style.boxShadow = `0 0 5px ${rarityInfo.color}`; // Add a glow effect
                    slotDiv.title += ` (${rarityInfo.name})`; // Add rarity name to tooltip
                }
            }

            gridElement.appendChild(slotDiv);
            filledSlotsCount++;
        } else {
            console.warn(`Definition not found for item ID: ${itemId}`);
            // Optionally display an error slot
            // const errorSlot = document.createElement('div');
            // errorSlot.classList.add('inventory-slot', 'empty');
            // errorSlot.textContent = 'ERR';
            // errorSlot.style.color = 'red';
            // gridElement.appendChild(errorSlot);
            // filledSlotsCount++;
        }
    }

    // Fill remaining slots with empty placeholders
    for (let i = filledSlotsCount; i < totalSlots; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.classList.add('inventory-slot', 'empty');
        gridElement.appendChild(emptySlot);
    }

    console.log(`updateInventoryUI finished. Filled ${filledSlotsCount} slots, Total ${totalSlots}. Grid HTML:`, gridElement.innerHTML.substring(0, 200) + '...'); // Log start of HTML
}

// Function to update the Protection Book UI - Now shows businesses *protected by the player*
function updateProtectionBookUI() {
    if (!protectionBookElement || !controlledBusinessesListElement) {
        console.error("Protection book elements not found!");
        return;
    }

    // The book is now relevant even without an organization, as it shows player's protections
    // if (!currentUserOrganization) {
    //     protectionBookElement.style.display = 'none';
    //     controlledBusinessesListElement.innerHTML = '';
    //     return;
    // }

    controlledBusinessesListElement.innerHTML = ''; // Clear existing list
    let playerProtectedCount = 0;

    // Iterate through *all* cached businesses to find ones protected by the player
    for (const id in businessesCache) { // businessesCache from gameWorld.js
        const businessInfo = businessesCache[id];
        // Check if the business exists and the current player is in its protectingUsers array
        const isPlayerProtecting = businessInfo.protectingUsers && businessInfo.protectingUsers.some(user => user.userId === currentPlayerId); // currentPlayerId from gameWorld.js

        if (isPlayerProtecting) {
            playerProtectedCount++;
            const listItem = document.createElement('li');
            listItem.classList.add('controlled-business-item'); // Keep class for styling consistency

            // Find the player's contribution to this business's power
            const playerProtectorInfo = businessInfo.protectingUsers.find(user => user.userId === currentPlayerId);
            const playerContribution = playerProtectorInfo ? playerProtectorInfo.userPower : 0;

            // Add data attribute for identification
            listItem.dataset.businessId = businessInfo.id;

            // Display business name and player's contribution
            listItem.innerHTML = `
                <div> <!-- Wrapper for text content -->
                    <span class="business-name">${businessInfo.name}</span>
                    <span class="business-protection">(Your Power: ${playerContribution})</span>
                </div>
                <button class="remove-protection-btn btn btn-red" data-business-id="${businessInfo.id}" style="display: none; margin-left: 10px;">Remove</button>
            `;
            // Optional: Add total power of the business if desired
            // listItem.innerHTML += `<span class="business-total-power"> (Total: ${businessInfo.protectionPower})</span>`;

            controlledBusinessesListElement.appendChild(listItem);
        }
    }

    // Add a summary line showing player's protection count vs limit
    const summaryItem = document.createElement('li');
    summaryItem.classList.add('protection-summary'); // Keep class for potential styling
    summaryItem.innerHTML = `<b>Protecting: ${playerProtectedCount} / ${MAX_PLAYER_PROTECTED_BUSINESSES} Businesses</b>`; // MAX_PLAYER_PROTECTED_BUSINESSES from gameWorld.js
    controlledBusinessesListElement.appendChild(summaryItem); // Add to the end

    // Show the book if it's not minimized (it's always relevant now)
    if (!protectionBookElement.classList.contains('minimized')) {
        protectionBookElement.style.display = 'block';
    }

    // Add a message if the player isn't protecting any businesses yet
    if (playerProtectedCount === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = 'You are not currently protecting any businesses.';
        emptyMessage.style.fontStyle = 'italic';
        emptyMessage.style.color = '#888';
        // Insert before the summary item
        controlledBusinessesListElement.insertBefore(emptyMessage, summaryItem);
    }
}

// Function to update the Stats Info modal UI
function updateStatsModalUI() {
    // Stats should be calculated *before* calling this function
    // calculatePlayerPower(); // REMOVED - Called when needed elsewhere
    // calculateCharacterStats(); // REMOVED - Called when needed elsewhere (e.g., equip/unequip, level up)

    // Get all the span elements
    const usernameSpan = document.getElementById('stats-username');
    const aliasSpan = document.getElementById('stats-alias');
    const levelSpan = document.getElementById('stats-level');
    const experienceSpan = document.getElementById('stats-experience');
    const expNeededSpan = document.getElementById('stats-exp-needed'); // TODO: Implement EXP needed calculation
    const powerSpan = document.getElementById('stats-power');
    const influenceSpan = document.getElementById('stats-influence');
    const strengthSpan = document.getElementById('stats-strength');
    const agilitySpan = document.getElementById('stats-agility');
    const vitalitySpan = document.getElementById('stats-vitality');
    const hitRateSpan = document.getElementById('stats-hitRate');
    const defenceSpan = document.getElementById('stats-defence');
    const evasionRateSpan = document.getElementById('stats-evasionRate');
    const criticalRateSpan = document.getElementById('stats-criticalRate');
    const damageSpan = document.getElementById('stats-damage'); // Get the new damage span

    // Update the content if elements exist
    // Uses global player variables from gameWorld.js
    if (usernameSpan) usernameSpan.textContent = playerUsername || 'N/A';
    if (aliasSpan) aliasSpan.textContent = playerAlias || 'N/A';
    if (levelSpan) levelSpan.textContent = playerLevel;
    if (experienceSpan) experienceSpan.textContent = playerExperience;
    if (expNeededSpan) expNeededSpan.textContent = '100'; // Placeholder for EXP needed
    if (powerSpan) powerSpan.textContent = playerPower;
    if (influenceSpan) influenceSpan.textContent = playerStats.influence;
    if (strengthSpan) strengthSpan.textContent = playerStats.strength;
    if (agilitySpan) agilitySpan.textContent = playerStats.agility;
    if (vitalitySpan) vitalitySpan.textContent = playerStats.vitality;
    if (hitRateSpan) hitRateSpan.textContent = playerStats.hitRate;
    if (defenceSpan) defenceSpan.textContent = playerCharacterStats.defence;
    if (evasionRateSpan) evasionRateSpan.textContent = playerCharacterStats.evasionRate.toFixed(1); // Show one decimal place
    if (criticalRateSpan) criticalRateSpan.textContent = playerCharacterStats.criticalRate.toFixed(1); // Show one decimal place
    if (damageSpan) damageSpan.textContent = playerCharacterStats.damage; // Update damage display

    console.log("Stats modal UI updated.");
}

// Function to update the Equipment modal UI
function updateEquipmentUI() {
    const equipmentSlotsContainer = document.querySelector('#equipment-modal .equipment-slots');
    if (!equipmentSlotsContainer) {
        console.error("Equipment slots container not found!");
        return;
    }

    // Iterate through all defined equipment slots in the HTML
    equipmentSlotsContainer.querySelectorAll('.equipment-slot').forEach(slotDiv => {
        const slotType = slotDiv.dataset.slotType; // Get 'Head', 'Body', etc. from data attribute
        const itemDiv = slotDiv.querySelector('.slot-item');
        if (!itemDiv) return; // Skip if structure is wrong

        const equippedItemId = playerEquipment[slotType]; // Get ID from gameWorld.js

        if (equippedItemId) {
            const item = getEquipmentById(equippedItemId); // Get full item details
            if (item) {
                itemDiv.textContent = item.name; // Display item name
                itemDiv.title = `${item.name}\n${item.description || ''}\nClick to unequip`; // Tooltip
                // Apply rarity styling
                itemDiv.style.color = item.rarity.color || '#e0e0e0';
                itemDiv.style.borderColor = item.rarity.color || '#555';
                itemDiv.style.borderStyle = 'solid';
                if (item.rarity.name === Rarity.GOD_TIER.name) {
                    itemDiv.style.color = '#FFFFFF';
                    itemDiv.style.textShadow = '0 0 3px #000, 0 0 3px #000, 0 0 3px #000';
                } else {
                    itemDiv.style.textShadow = 'none';
                }
            } else {
                // Item ID exists but definition not found (error state)
                itemDiv.textContent = `ERR! (${equippedItemId})`;
                itemDiv.title = 'Error: Item definition not found';
                itemDiv.style.color = 'red';
                itemDiv.style.borderColor = '#444';
                itemDiv.style.borderStyle = 'dashed';
                itemDiv.style.textShadow = 'none';
            }
        } else {
            // Slot is empty
            itemDiv.textContent = ''; // Clear text
            itemDiv.title = `${slotType} Slot (Empty)`;
            itemDiv.style.color = '#666'; // Reset styling
            itemDiv.style.borderColor = '#444';
            itemDiv.style.borderStyle = 'dashed';
            itemDiv.style.textShadow = 'none';
        }
    });
    console.log("Equipment UI updated.");
}


// --- Custom Alert Functionality ---
function showCustomAlert(message) {
    if (customAlertDiv && customAlertMessage) {
        customAlertMessage.textContent = message;
        customAlertDiv.classList.remove('custom-alert-hidden');
    } else {
        console.error("Custom alert elements not found!");
        // Fallback to standard alert if custom elements are missing
        alert(message);
    }
}

if (customAlertCloseBtn && customAlertDiv) {
    customAlertCloseBtn.addEventListener('click', () => {
        customAlertDiv.classList.add('custom-alert-hidden');
    });
} else {
    console.error("Custom alert close button or container not found!");
}

// --- User Info Management ---

function saveUserInfo() {
    if (!usernameInput || !aliasInput) {
        console.error("Username or Alias input not found!");
        return;
    }
    // Update global vars in gameWorld.js
    playerUsername = usernameInput.value.trim();
    playerAlias = aliasInput.value.trim();
    localStorage.setItem('playerUsername', playerUsername);
    localStorage.setItem('playerAlias', playerAlias);
    showCustomAlert('User info saved!');

    // Lock the username input if a username was entered
    if (playerUsername && usernameInput) {
        usernameInput.readOnly = true;
        console.log("Username input locked.");
    }

    // Re-render protection book in case alias changed
    updateProtectionBookUI();
    // Update bottom bar alias display
    if (playerAliasBar) playerAliasBar.textContent = playerAlias || 'Alias';
}

function loadUserInfo() {
    const savedUsername = localStorage.getItem('playerUsername');
    const savedAlias = localStorage.getItem('playerAlias');
    if (savedUsername && usernameInput) { // Check if input exists too
        playerUsername = savedUsername; // Update global var
        usernameInput.value = playerUsername;
        usernameInput.readOnly = true; // Lock the input if loaded from storage
        console.log("Username loaded from storage and input locked.");
    }
    if (savedAlias && aliasInput) {
        playerAlias = savedAlias;
        aliasInput.value = playerAlias;
    }
    // Update bottom bar alias display on load
    if (playerAliasBar) playerAliasBar.textContent = playerAlias || 'Alias';
    console.log(`Loaded User Info - Username: ${playerUsername}, Alias: ${playerAlias}`);
}

// --- Marker Display Functions ---

// Function to display base markers on the map
function displayBases(bases) {
    bases.forEach(baseInfo => {
        // Avoid adding duplicate markers if already displayed
        if (displayedBaseIds.has(baseInfo.id)) { // displayedBaseIds from gameWorld.js
            return;
        }

        const marker = L.marker([baseInfo.lat, baseInfo.lon], { icon: baseIcon })
            .addTo(baseLayer) // baseLayer from gameWorld.js
             // Updated popup content and button attributes
            .bindPopup(`<b>${baseInfo.organizationName}</b><br>(${baseInfo.name})<br><button class="join-button btn btn-green" data-org-name="${baseInfo.organizationName}" data-org-abbr="${baseInfo.organizationAbbreviation}" data-base-lat="${baseInfo.lat}" data-base-lon="${baseInfo.lon}">Join Organization</button>`); // Added button classes

        // Add a custom property to the marker for easier identification if needed later
        marker.baseId = baseInfo.id;

        displayedBaseIds.add(baseInfo.id); // Mark as displayed
    });

    // Popup listener is attached once via handlePopupOpenForActions
}

// Function to display business markers, checking territory
function displayBusinesses(businesses) {
     businesses.forEach(businessInfo => {
        // This function now primarily adds *new* markers. Updates are handled by updateBusinessMarkers.
        if (displayedBusinessIds.has(businessInfo.id)) { // displayedBusinessIds from gameWorld.js
             return;
         }

         // Use the correct icon from the start based on the isShop flag
         let icon = businessInfo.isShop ? shopIcon : customBusinessIcon;
         let popupContent = `<b>${businessInfo.name}</b><br>(${businessInfo.type})`;
         let isControlled = false; // Assume not controlled initially

        // Initial control check (will be re-checked by updateBusinessMarkers in gameWorld.js)
        if (currentUserOrganization && currentOrganizationBaseLocation) { // Variables from gameWorld.js
            const distanceToBase = calculateDistance( // Function from gameWorld.js
                businessInfo.lat, businessInfo.lon,
                currentOrganizationBaseLocation.lat, currentOrganizationBaseLocation.lon
            );
            if (distanceToBase <= TERRITORY_RADIUS) { // Constant from gameWorld.js
                isControlled = true;
            }
        }

        const marker = L.marker([businessInfo.lat, businessInfo.lon], { icon: icon })
            .addTo(businessLayer) // businessLayer from gameWorld.js
            .bindPopup(popupContent);

        // Store marker reference and initial control status in cache (businessesCache from gameWorld.js)
        businessesCache[businessInfo.id].marker = marker;
        businessesCache[businessInfo.id].isControlled = isControlled;

        displayedBusinessIds.add(businessInfo.id); // Mark as displayed
     });

     // Add ONE listener for collect/join buttons using delegation (if not already added)
     // This listener is attached below in the Event Listeners section
}

// --- Shop Modal Functions ---

function openShopModal(businessId) {
    // Get modal elements *inside* the function to ensure they exist
    const shopModalElement = document.getElementById('shop-modal');
    const shopNameElement = document.getElementById('shop-name');

    if (!shopModalElement || !gameShop) { // gameShop from initialization.js
        console.error("Shop modal or gameShop instance not found!");
        showCustomAlert("Cannot open shop interface.");
        return;
    }

    // Optional: Get specific shop details if shops vary, for now use global gameShop
    const businessInfo = businessesCache[businessId]; // from gameWorld.js
    if (!businessInfo || !businessInfo.isShop) {
        console.error(`Business ${businessId} is not a shop or not found.`);
        showCustomAlert("This is not a shop.");
        return;
    }

    console.log(`Opening shop for: ${businessInfo.name}`);
    if (shopNameElement) shopNameElement.textContent = businessInfo.name; // Update shop name display

    populateShopUI(); // Populate buy/sell lists

    shopModalElement.classList.remove('modal-hidden');
    hideShopMessage(); // Clear any previous messages
}

function closeShopModal() {
    const shopModalElement = document.getElementById('shop-modal');
    if (shopModalElement) {
        shopModalElement.classList.add('modal-hidden');
        console.log("Shop modal closed.");
    }
}

function showShopMessage(message, isError = false) {
    const shopMessageElement = document.getElementById('shop-message');
    if (shopMessageElement) {
        shopMessageElement.textContent = message;
        shopMessageElement.className = 'shop-message'; // Reset classes
        shopMessageElement.classList.add(isError ? 'error' : 'success');
        shopMessageElement.style.display = 'block';

        // Optional: Hide message after a few seconds
        setTimeout(hideShopMessage, 3000);
    }
}

function hideShopMessage() {
     const shopMessageElement = document.getElementById('shop-message');
     if (shopMessageElement) {
        shopMessageElement.style.display = 'none';
        shopMessageElement.textContent = '';
        shopMessageElement.className = 'shop-message'; // Reset classes
    }
}

// Function to populate the shop UI (Buy and Sell lists)
function populateShopUI() {
    // Get list elements *inside* the function
    const shopBuyListElement = document.getElementById('shop-buy-list');
    const shopSellListElement = document.getElementById('shop-sell-list');

    if (!shopBuyListElement || !shopSellListElement || !gameShop) {
        console.error("Shop list elements or gameShop not found for population.");
        return;
    }

    // --- Populate Buy List ---
    shopBuyListElement.innerHTML = ''; // Clear existing items
    const buyableItems = gameShop.getBuyableItems(); // Method from Shop class

    if (buyableItems.length === 0) {
        shopBuyListElement.innerHTML = '<li>(No items for sale)</li>';
    } else {
        buyableItems.forEach(item => {
            const listItem = document.createElement('li');
            listItem.dataset.itemId = item.id;

            // Determine display name and rarity color
            let displayName = item.name;
            let rarityColor = '';
            let rarityName = '';
            if (item.rarity && typeof Rarity !== 'undefined') { // Rarity from equipment.js
                // Handle rarity being an object (from equipment.js) or string (potentially from items.js if adapted)
                const rarityInfo = typeof item.rarity === 'object' && item.rarity !== null ? item.rarity : Rarity[item.rarity?.toUpperCase()?.replace('-', '_')];
                if (rarityInfo) {
                    rarityColor = rarityInfo.color || '';
                    rarityName = ` (${rarityInfo.name})`;
                    if (rarityInfo.name === Rarity.GOD_TIER.name) {
                         listItem.style.color = '#FFFFFF';
                         listItem.style.textShadow = '0 0 3px #000, 0 0 3px #000, 0 0 3px #000';
                    } else {
                        listItem.style.color = rarityColor;
                        listItem.style.textShadow = 'none';
                    }
                }
            } else {
                 listItem.style.color = ''; // Reset color if no rarity
                 listItem.style.textShadow = 'none';
            }

            listItem.innerHTML = `
                <span class="shop-item-name" title="${item.description || ''}${rarityName}">${displayName}</span>
                <span class="shop-item-price">$${item.price || 'N/A'}</span>
                <button class="shop-buy-button btn btn-green" data-item-id="${item.id}">Buy</button>
            `;
            // Ensure price has '$'
            const priceSpan = listItem.querySelector('.shop-item-price');
            if (priceSpan && !priceSpan.textContent.startsWith('$')) {
                priceSpan.textContent = `$${priceSpan.textContent}`;
            }
            shopBuyListElement.appendChild(listItem);
        });
    }

    // --- Populate Sell List ---
    shopSellListElement.innerHTML = ''; // Clear existing items
    if (playerInventory.length === 0) { // playerInventory from gameWorld.js
        shopSellListElement.innerHTML = '<li>(Inventory empty)</li>';
    } else {
        // Group player inventory for display
        const groupedPlayerInventory = playerInventory.reduce((acc, itemEntry) => {
            if (!acc[itemEntry.id]) {
                // Fetch definition to get full item details (name, rarity, etc.)
                 const itemDef = itemsDatabase.get(itemEntry.id) || equipmentDatabase.get(itemEntry.id); // From items/equipment.js
                 if (itemDef) {
                    // Ensure rarity is stored as a string name for consistency
                    let itemRarityName = 'Common'; // Default
                    if (itemDef.rarity) {
                         itemRarityName = (typeof itemDef.rarity === 'object' && itemDef.rarity !== null) ? itemDef.rarity.name : itemDef.rarity;
                    }
                    acc[itemEntry.id] = { ...itemDef, quantity: 0, rarity: itemRarityName }; // Store rarity name string
                 } else {
                     acc[itemEntry.id] = { id: itemEntry.id, name: `Unknown (${itemEntry.id})`, quantity: 0, rarity: 'Common' }; // Fallback
                 }
            }
            acc[itemEntry.id].quantity += (itemEntry.quantity || 1);
            return acc;
        }, {});


        Object.values(groupedPlayerInventory).forEach(item => {
            const listItem = document.createElement('li');
            listItem.dataset.itemId = item.id;

            // Calculate sell price using the NEW formula (1 * multiplier)
            const rarityKey = (item.rarity || 'Common').toLowerCase().replace('-', '_');
            const multiplier = rarityMultipliers[rarityKey] || 1; // rarityMultipliers from shop.js
            const sellPrice = 1 * multiplier; // Use the updated base price

            // Determine display name and rarity color
            let displayName = item.name;
            let rarityColor = '';
            let rarityName = '';
             if (item.rarity && typeof Rarity !== 'undefined') {
                const rarityInfo = Rarity[item.rarity.toUpperCase().replace('-', '_')]; // Lookup using the string key
                 if (rarityInfo) {
                    rarityColor = rarityInfo.color || '';
                    rarityName = ` (${rarityInfo.name})`;
                     if (rarityInfo.name === Rarity.GOD_TIER.name) {
                         listItem.style.color = '#FFFFFF';
                         listItem.style.textShadow = '0 0 3px #000, 0 0 3px #000, 0 0 3px #000';
                    } else {
                        listItem.style.color = rarityColor;
                        listItem.style.textShadow = 'none';
                    }
                }
            } else {
                 listItem.style.color = ''; // Reset color if no rarity
                 listItem.style.textShadow = 'none';
            }

            listItem.innerHTML = `
                <span class="shop-item-name" title="${item.description || ''}${rarityName}">${displayName} (x${item.quantity})</span>
                <span class="shop-item-value">$${sellPrice}</span>
                <button class="shop-sell-button btn btn-orange" data-item-id="${item.id}">Sell</button>
            `;
             // Ensure sell value has '$'
            const valueSpan = listItem.querySelector('.shop-item-value');
             if (valueSpan && !valueSpan.textContent.startsWith('$')) {
                valueSpan.textContent = `$${valueSpan.textContent}`;
            }
            shopSellListElement.appendChild(listItem);
        });
    }
}

// --- Shop Action Handlers (Event Delegation) ---

function handleShopBuyClick(event) {
    if (event.target.classList.contains('shop-buy-button')) {
        const button = event.target;
        const itemId = button.dataset.itemId;
        if (!itemId || !gameShop) return;

        console.log(`Attempting to buy item: ${itemId}`);
        // Define player object structure expected by shop.js buyItem
        // Ensure playerInventory is correctly passed and modified
        const playerForShop = {
            name: playerAlias || playerUsername || "Player", // from gameWorld.js
            money: currentCash, // from gameWorld.js
            inventory: playerInventory, // from gameWorld.js (pass reference)
            // Pass references to the actual inventory modification functions
            addItemToInventory: addItemToInventory, // from gameWorld.js
            removeItemFromInventory: null // Not needed for buying
        };

        const result = gameShop.buyItem(itemId, playerForShop);

        // Update game state based on result
        if (result.success) {
            currentCash = playerForShop.money; // Update global cash from the modified object
            updateCashUI(currentCash); // Update cash UI
            // Inventory was modified directly by addItemToInventory

            // Log inventory state *just before* updating the UI from the handler
            console.log('Inventory state before updateInventoryUI call in handleShopBuyClick:', JSON.stringify(playerInventory));

            updateInventoryUI(); // Explicitly update the main inventory modal UI
            populateShopUI(); // Re-populate shop's sell list
            showShopMessage(result.message);
        } else {
            showShopMessage(result.message, true); // Show error message
        }
    }
}

function handleShopSellClick(event) {
    if (event.target.classList.contains('shop-sell-button')) {
        const button = event.target;
        const itemId = button.dataset.itemId;
         if (!itemId || !gameShop) return;

        console.log(`Attempting to sell item: ${itemId}`);

        // Find the correct index in the actual playerInventory array
        // This is crucial because sellItem needs the index to remove the item correctly.
        const itemIndex = playerInventory.findIndex(invItem => invItem.id === itemId);
        if (itemIndex === -1) {
            console.error(`Item ${itemId} not found in playerInventory for selling.`);
            showShopMessage("Error: Item not found in your inventory.", true);
            return;
        }

        // Define player object structure expected by shop.js sellItem
        const playerForShop = {
            name: playerAlias || playerUsername || "Player",
            money: currentCash,
            inventory: playerInventory, // Pass the actual inventory reference
            addItemToInventory: null, // Not needed for selling
            // Provide a function that removes item by INDEX from the *actual* playerInventory
            removeItemFromInventory: (indexToRemove) => {
                 const item = playerInventory[indexToRemove];
                 if (!item) return; // Safety check

                 if (item.quantity > 1) {
                    item.quantity -= 1; // Decrement quantity
                 } else {
                    playerInventory.splice(indexToRemove, 1); // Remove item completely
                 }
                 updateInventoryUI(); // Update main inventory modal UI
            }
        };

        // Call sellItem with the ITEM ID. The shop's sellItem method will
        // find the item again and then call our provided removeItemFromInventory
        // with the correct index from *its* perspective (which matches ours here).
        const result = gameShop.sellItem(itemId, playerForShop);

        // Update game state based on result
        if (result.success) {
            // *** IMPORTANT FIX: Update the *global* currentCash directly ***
            currentCash = playerForShop.money;
            updateCashUI(currentCash); // Update cash UI with the correct global value
            // Inventory was modified directly by removeItemFromInventory via callback

            populateShopUI(); // Re-populate sell list to reflect changes
            showShopMessage(result.message);
        } else {
            showShopMessage(result.message, true); // Show error message
        }
    }
}


// --- How to Play Modal Functions ---

function openHowToPlayModal() {
    const modal = document.getElementById('how-to-play-modal');
    if (modal) {
        modal.classList.remove('modal-hidden');
        console.log("How to Play modal opened.");
    } else {
        console.error("How to Play modal element not found!");
    }
}

function closeHowToPlayModal() {
    const modal = document.getElementById('how-to-play-modal');
    if (modal) {
        modal.classList.add('modal-hidden');
        console.log("How to Play modal closed.");
    }
}

// --- Event Listeners ---

// Combined handler for popup open to attach button listeners
function handlePopupOpenForActions(e) {
    const popupNode = e.popup._contentNode; // Get the container element of the popup

    // Handle Collect Button
    const collectButton = popupNode.querySelector('.collect-button');
    if (collectButton) {
        const collectHandler = function() {
            const businessId = this.getAttribute('data-business-id');
            collectProfit(businessId); // Function from gameWorld.js
            map.closePopup(); // Close popup after action
        };
        collectButton.onclick = collectHandler; // Assign the handler
    }

    // Handle Join Button
    const joinButton = popupNode.querySelector('.join-button');
    if (joinButton) {
        const joinHandler = function() {
            const orgName = this.getAttribute('data-org-name');
            const orgAbbr = this.getAttribute('data-org-abbr');
            const baseLat = parseFloat(this.getAttribute('data-base-lat'));
            const baseLon = parseFloat(this.getAttribute('data-base-lon'));
            joinOrganizationManually(orgName, orgAbbr, baseLat, baseLon); // Function from gameWorld.js
            map.closePopup();
        };
        joinButton.onclick = joinHandler;
    }

    // Handle Activate Protection Button
    const activateButton = popupNode.querySelector('.activate-protection-button');
    if (activateButton) {
        const activateHandler = function() {
            const businessId = this.getAttribute('data-business-id');
            activateProtection(businessId); // Function from gameWorld.js
            // Don't close popup immediately, let activateProtection handle alerts/updates
        };
        activateButton.onclick = activateHandler;
    }

    // Handle Visit Shop Button
    const visitShopButton = popupNode.querySelector('.visit-shop-button');
    if (visitShopButton) {
        const visitHandler = function() {
            const businessId = this.getAttribute('data-business-id');
            openShopModal(businessId); // Function defined in uiManager.js
            map.closePopup(); // Close map popup when opening modal
        };
        visitShopButton.onclick = visitHandler;
    }


    // Handle Interact Enemy Button
    const interactEnemyButton = popupNode.querySelector('.interact-enemy-button');
    if (interactEnemyButton) {
        const interactHandler = function() {
            const enemyId = this.getAttribute('data-enemy-id');
            if (typeof findEnemyById !== 'function') {
                console.error("findEnemyById function not found! Make sure enemy.js is loaded.");
                map.closePopup();
                return;
            }
            const enemy = findEnemyById(enemyId);

            if (enemy) {
                calculateCharacterStats(); // Recalculate derived stats (Function from gameWorld.js)
                const currentPlayerBattleStats = {
                    name: playerAlias || playerUsername || "Player", // Use global vars from gameWorld.js
                    health: playerCurrentHp, // Use updated global var from gameWorld.js
                    attack: playerStats.strength, // Use global var from gameWorld.js
                    defense: playerCharacterStats.defence // Use global var from gameWorld.js
                };

                console.log("Player Stats for Battle:", currentPlayerBattleStats);
                console.log("Enemy Stats for Battle:", { name: enemy.name, health: enemy.health, attack: enemy.attack, defense: enemy.defense });

                if (typeof initiateBattle === 'function') {
                    // Pass null for the first argument as initiateBattle now uses global player stats
                    initiateBattle(null, enemy); // Function from battle.js
                } else {
                    console.error("initiateBattle function not found! Make sure battle.js is loaded.");
                    showCustomAlert("Battle system error. Cannot start fight.");
                }

            } else {
                console.error(`Enemy with ID ${enemyId} not found for interaction.`);
                showCustomAlert("Error: Could not find enemy data.");
            }
            map.closePopup(); // Close popup after initiating interaction/battle
        };
        interactEnemyButton.onclick = interactHandler;
    }
}
// map.on('popupopen', handlePopupOpenForActions); // MOVED to initialization.js


// --- UI Minimize/Show Logic ---
function setupMinimizeToggle(containerId, showButtonId) {
    const containerDiv = document.getElementById(containerId);
    const minimizeBtn = containerDiv ? containerDiv.querySelector('.minimize-btn') : null;
    const showBtn = document.getElementById(showButtonId);

    if (containerDiv && minimizeBtn && showBtn) {
        // Minimize Action
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            containerDiv.classList.add('minimized'); // Add class to remember state
            showBtn.style.display = 'block';
            containerDiv.style.display = 'none';
        });

        // Show Action
        showBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Check specific conditions before showing
            if (containerId === 'protection-book' && !currentUserOrganization) { // currentUserOrganization from gameWorld.js
                 console.log("Cannot show Protection Book: Not in an organization.");
                 // showCustomAlert("Join an organization to view the Protection Book.");
                 return; // Don't show the book if not in an org
            }

            containerDiv.classList.remove('minimized'); // Remove class
            containerDiv.style.display = 'block';
            showBtn.style.display = 'none';
        });

         // Initially hide the show button and ensure container is visible unless explicitly minimized
         showBtn.style.display = 'none';
         if (!containerDiv.classList.contains('minimized')) {
             containerDiv.style.display = 'block';
         } else {
             containerDiv.style.display = 'none'; // Hide if saved state is minimized
             showBtn.style.display = 'block';
         }

    } else {
        console.error(`Could not find all elements for minimize/show functionality: ${containerId}, ${showButtonId}`);
        if (!containerDiv) console.error(`Container not found: #${containerId}`);
        if (containerDiv && !minimizeBtn) console.error(`Minimize button not found inside #${containerId}`);
        if (!showBtn) console.error(`Show button not found: #${showButtonId}`);
    }
}

// Setup for Dashboard and Protection Book
setupMinimizeToggle('dashboard', 'show-dashboard-btn');
setupMinimizeToggle('protection-book', 'show-book-btn');


// --- Map Control Button Listeners ---
if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => map.zoomIn());
}
if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => map.zoomOut());
}
if (centerMapBtn) {
    centerMapBtn.addEventListener('click', () => {
        if (currentUserLocation) { // Variable from gameWorld.js
            map.setView([currentUserLocation.lat, currentUserLocation.lon], map.getZoom()); // Keep current zoom level
        } else {
            showCustomAlert("Current location not available yet.");
        }
    });
}

// --- Other Event Listeners ---
// Attach listener to leave button
if (leaveOrganizationButton) {
    leaveOrganizationButton.addEventListener('click', leaveOrganization); // Function from gameWorld.js
} else {
    console.error("Leave Organization button not found!");
}

// Attach listener to save user info button
if (saveUserInfoBtn) {
    saveUserInfoBtn.addEventListener('click', saveUserInfo); // Function defined above
} else {
    console.error("Save User Info button not found!");
}

// --- Modal Logic & Other Listeners (Wrapped in DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    // Attach listener to leave button *after* DOM is ready and gameWorld.js is likely parsed
    if (leaveOrganizationButton) {
        leaveOrganizationButton.addEventListener('click', leaveOrganization); // Function from gameWorld.js
    } else {
        console.error("Leave Organization button not found inside DOMContentLoaded!");
    }

    // Get references to elements needed immediately or frequently
    const inventoryListElement = document.querySelector('#inventory-modal #inventory-list'); // Needed for item usage listener
    const battleModal = document.getElementById('battle-modal'); // Needed for close button listener
    const battleCloseBtn = document.getElementById('battle-close-btn'); // Needed for close button listener
    const equipmentSlotsContainer = document.querySelector('#equipment-modal .equipment-slots'); // For unequip listener

    // Get references to new bottom bar action buttons
    const actionUserInfoBtn = document.getElementById('action-userinfo-btn');
    const actionStatsBtn = document.getElementById('action-stats-btn');
    const actionEquipmentBtn = document.getElementById('action-equipment-btn');
    const actionInventoryBtn = document.getElementById('action-inventory-btn');
    const dashboardElement = document.getElementById('dashboard'); // Need dashboard element ref

    // Get Shop Modal elements here
    const shopModalElement = document.getElementById('shop-modal');
    const closeShopBtnElement = document.getElementById('close-shop-btn');
    const shopBuyListElement = document.getElementById('shop-buy-list');
    const shopSellListElement = document.getElementById('shop-sell-list');

    // --- Leaderboard Modal Elements ---
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
    const actionLeaderboardBtn = document.getElementById('action-leaderboard-btn');
    const moneyTabBtn = document.getElementById('leaderboard-money-tab');
    const powerTabBtn = document.getElementById('leaderboard-power-tab');
    const moneyContent = document.getElementById('leaderboard-money-content');
    const powerContent = document.getElementById('leaderboard-power-content');
    const moneyList = document.getElementById('leaderboard-money-list');
    const powerList = document.getElementById('leaderboard-power-list');


    // --- Stats Info Modal Listeners (Get elements inside listener) ---
    const openStatsBtn = document.getElementById('open-stats-btn'); // Old button ID, might be null now
    const closeStatsBtn = document.getElementById('close-stats-btn');
    const statsModal = document.getElementById('stats-modal'); // Get modal ref for background click

    // Listener for the *old* dashboard button (if it still exists)
    if (openStatsBtn) {
        openStatsBtn.addEventListener('click', () => {
            const statsModal = document.getElementById('stats-modal'); // Get modal fresh
            if (statsModal) {
                updateStatsModalUI();
                statsModal.classList.remove('modal-hidden');
                console.log("Stats modal opened (old button).");
            } else { console.error("Stats modal not found on open click (old button)."); }
        });
    }
    // Listener for the close button
    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', () => {
            const statsModal = document.getElementById('stats-modal'); // Get modal fresh
            if (statsModal) statsModal.classList.add('modal-hidden');
            console.log("Stats modal closed (button).");
        });
    }
    // Listener for background click
    if (statsModal) {
        statsModal.addEventListener('click', (event) => {
            if (event.target === statsModal) {
                statsModal.classList.add('modal-hidden');
                console.log("Stats modal closed (background).");
            }
        });
    }

    // --- Equipment Modal Listeners (Get elements inside listener) ---
    const openEquipmentBtn = document.getElementById('open-equipment-btn'); // Old button ID
    const closeEquipmentBtn = document.getElementById('close-equipment-btn');
    const equipmentModal = document.getElementById('equipment-modal'); // Get modal ref for background click

    // Listener for the *old* dashboard button
    if (openEquipmentBtn) {
        openEquipmentBtn.addEventListener('click', () => {
            const equipmentModal = document.getElementById('equipment-modal'); // Get modal fresh
            if (equipmentModal) {
                updateEquipmentUI(); // Update UI when opening
                equipmentModal.classList.remove('modal-hidden');
                console.log("Equipment modal opened (old button).");
            } else { console.error("Equipment modal not found on open click (old button)."); }
        });
    }
    // Listener for the close button
    if (closeEquipmentBtn) {
        closeEquipmentBtn.addEventListener('click', () => {
            const equipmentModal = document.getElementById('equipment-modal'); // Get modal fresh
            if (equipmentModal) equipmentModal.classList.add('modal-hidden');
            console.log("Equipment modal closed (button).");
        });
    }
    // Listener for background click
    if (equipmentModal) {
        equipmentModal.addEventListener('click', (event) => {
            // Close only if clicking the background, not the content/slots
            if (event.target === equipmentModal) {
                equipmentModal.classList.add('modal-hidden');
                console.log("Equipment modal closed (background).");
            }
        });
    }
    // Listener for clicking on equipment slots (for unequipping)
    if (equipmentSlotsContainer) {
        equipmentSlotsContainer.addEventListener('click', (event) => {
            const slotItemDiv = event.target.closest('.slot-item');
            if (slotItemDiv) { // Check if a slot item was clicked
                const slotDiv = slotItemDiv.closest('.equipment-slot');
                if (slotDiv && slotDiv.dataset.slotType) {
                    const slotType = slotDiv.dataset.slotType;
                    console.log(`Clicked on equipment slot: ${slotType}`);
                    unequipItem(slotType); // Call unequip function from gameWorld.js
                }
            }
        });
    } else {
        console.error("Equipment slots container not found for unequip listener.");
    }


    // --- Inventory Modal Listeners (Get elements inside listener) ---
    const openInventoryBtn = document.getElementById('open-inventory-btn'); // Old button ID
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    const inventoryModal = document.getElementById('inventory-modal'); // Get modal ref for background click

    // Listener for the *old* dashboard button
    if (openInventoryBtn) {
        openInventoryBtn.addEventListener('click', () => {
            const inventoryModal = document.getElementById('inventory-modal'); // Get modal fresh
            if (inventoryModal) {
                updateInventoryUI();
                inventoryModal.classList.remove('modal-hidden');
                console.log("Inventory modal opened (old button).");
            } else { console.error("Inventory modal not found on open click (old button)."); }
        });
    }
    // Listener for the close button
    if (closeInventoryBtn) {
        closeInventoryBtn.addEventListener('click', () => {
            const inventoryModal = document.getElementById('inventory-modal'); // Get modal fresh
            if (inventoryModal) inventoryModal.classList.add('modal-hidden');
            console.log("Inventory modal closed (button).");
        });
    }
    // Listener for background click
    if (inventoryModal) {
        inventoryModal.addEventListener('click', (event) => {
            if (event.target === inventoryModal) {
                inventoryModal.classList.add('modal-hidden');
                console.log("Inventory modal closed (background).");
            }
        });
    }

    // Item usage/equip listener (targets the grid now)
    const inventoryGridElement = document.getElementById('inventory-grid');
    if (inventoryGridElement) {
        inventoryGridElement.addEventListener('click', (event) => {
            const clickedSlot = event.target.closest('.inventory-slot'); // Find the slot element
            // Ensure a slot was clicked and it's not an empty slot (check for itemId dataset)
            if (clickedSlot && clickedSlot.dataset.itemId) {
                const itemId = clickedSlot.dataset.itemId;
                console.log(`Clicked on inventory item slot: ${itemId}`);
                // Call useItem, which handles equipping/using consumables
                useItem(itemId); // Function from gameWorld.js
            } else if (clickedSlot) {
                console.log("Clicked on an empty inventory slot.");
            }
        });
    } else {
        console.error("Inventory grid element not found for item usage listener.");
    }

    // --- Battle Modal Close Button ---
    if (battleModal && battleCloseBtn) {
         battleCloseBtn.addEventListener('click', () => {
            battleModal.classList.add('modal-hidden');
            console.log("Battle modal closed.");
            // Maybe reset battle state here if needed
        });
    } else {
        console.error("Battle modal or close button not found!");
    }

    // --- Shop Modal Listeners ---
    if (shopModalElement && closeShopBtnElement) { // Use the variables defined inside DOMContentLoaded
        closeShopBtnElement.addEventListener('click', closeShopModal);
        shopModalElement.addEventListener('click', (event) => {
            if (event.target === shopModalElement) {
                closeShopModal();
            }
        });
    } else {
        // This error should no longer trigger if IDs are correct in HTML
        console.error("Could not find shop modal elements for close listeners.");
    }

    // Add listeners for buy/sell buttons within the shop lists (using event delegation)
    if (shopBuyListElement) { // Use the variable defined inside DOMContentLoaded
        shopBuyListElement.addEventListener('click', handleShopBuyClick);
    }
    if (shopSellListElement) { // Use the variable defined inside DOMContentLoaded
        shopSellListElement.addEventListener('click', handleShopSellClick);
    }


    // --- New Bottom Bar Action Button Listeners ---
    if (actionUserInfoBtn && dashboardElement) {
        actionUserInfoBtn.addEventListener('click', () => {
            // Toggle dashboard visibility
            const isMinimized = dashboardElement.classList.contains('minimized');
            const showBtn = document.getElementById('show-dashboard-btn'); // Get the corresponding show button
            if (isMinimized) {
                dashboardElement.classList.remove('minimized');
                dashboardElement.style.display = 'block';
                if (showBtn) showBtn.style.display = 'none';
                console.log("Dashboard shown via bottom bar button.");
            } else {
                dashboardElement.classList.add('minimized');
                dashboardElement.style.display = 'none';
                if (showBtn) showBtn.style.display = 'block';
                console.log("Dashboard hidden via bottom bar button.");
            }
        });
    } else {
        console.error("Could not find User Info action button or dashboard element:", { btn: !!actionUserInfoBtn, dashboard: !!dashboardElement });
    }

    // Listener for the NEW Stats button
    if (actionStatsBtn) {
        actionStatsBtn.addEventListener('click', () => {
            const statsModal = document.getElementById('stats-modal'); // Get modal fresh
            if (statsModal) {
                // Calculate latest stats *before* updating the UI
                calculatePlayerPower(); // From gameWorld.js
                calculateCharacterStats(); // From gameWorld.js
                updateStatsModalUI(); // Now update the UI with fresh stats
                statsModal.classList.remove('modal-hidden');
                console.log("Stats modal opened via bottom bar button.");
            } else { console.error("Stats modal not found on open click (bottom bar)."); }
        });
    } else {
        console.error("Could not find Stats action button.");
    }

    // Listener for the NEW Equipment button
    if (actionEquipmentBtn) {
        actionEquipmentBtn.addEventListener('click', () => {
            const equipmentModal = document.getElementById('equipment-modal'); // Get modal fresh
            if (equipmentModal) {
                updateEquipmentUI(); // Update UI when opening
                equipmentModal.classList.remove('modal-hidden');
                console.log("Equipment modal opened via bottom bar button.");
            } else { console.error("Equipment modal not found on open click (bottom bar)."); }
        });
    } else {
        console.error("Could not find Equipment action button.");
    }

    // Listener for the NEW Inventory button
    if (actionInventoryBtn) {
        actionInventoryBtn.addEventListener('click', () => {
            const inventoryModal = document.getElementById('inventory-modal'); // Get modal fresh
            if (inventoryModal) {
                updateInventoryUI();
                inventoryModal.classList.remove('modal-hidden');
                console.log("Inventory modal opened via bottom bar button.");
            } else { console.error("Inventory modal not found on open click (bottom bar)."); }
        });
    } else {
        console.error("Could not find Inventory action button.");
    }


    // --- Initial UI Setup ---
    loadUserInfo(); // Load username/alias first (this now also updates bottom bar alias)
    updateOrganizationUI(); // Update based on initial state (likely 'None')
    updateCashUI(currentCash); // Show initial cash (0)
    calculateCharacterStats(); // Calculate initial stats including Max HP (from gameWorld.js)
    updateHpUI(); // Show initial HP
    updateExperienceUI(); // Show initial EXP/Level

    // --- Protection Book Interactivity ---
    if (controlledBusinessesListElement) {
        controlledBusinessesListElement.addEventListener('click', (event) => {
            console.log("Click detected inside protection book list."); // Log: Listener fired
            const target = event.target;
            const listItem = target.closest('.controlled-business-item');
            console.log("Clicked target:", target); // Log: Click target

            if (!listItem) {
                console.log("Click was outside a list item."); // Log: Click outside item
                // Hide all buttons if clicking outside any item
                controlledBusinessesListElement.querySelectorAll('.remove-protection-btn').forEach(btn => {
                    btn.style.display = 'none';
                });
                return;
            }

            console.log("Clicked list item:", listItem); // Log: Found list item
            const businessId = listItem.dataset.businessId;
            const removeButton = listItem.querySelector('.remove-protection-btn');
            console.log("Found remove button:", removeButton); // Log: Found button element

            if (target.classList.contains('remove-protection-btn')) {
                // Clicked the "Remove" button itself
                console.log(`Remove button clicked for business ID: ${businessId}`); // Log: Button click
                if (typeof removePlayerProtection === 'function') {
                    removePlayerProtection(businessId); // Call function in gameWorld.js
                } else {
                    console.error("removePlayerProtection function not found in gameWorld.js");
                    showCustomAlert("Error: Cannot remove protection.");
                }
            } else if (removeButton) {
                // Clicked the list item (or its children), but NOT the remove button
                console.log(`List item clicked (not button) for business ID: ${businessId}`); // Log: Item click

                // Determine if the button for *this* item was already visible
                const wasThisButtonVisible = removeButton.style.display !== 'none';

                // First, hide ALL remove buttons unconditionally
                controlledBusinessesListElement.querySelectorAll('.remove-protection-btn').forEach(btn => {
                    btn.style.display = 'none';
                });

                // If this item's button was NOT visible before, show it now.
                if (!wasThisButtonVisible) {
                    removeButton.style.display = 'inline-block'; // Use inline-block for button
                    console.log(`Showing remove button for ${businessId}`); // Log: Showing button
                } else {
                    console.log(`Hiding remove button for ${businessId} (was already visible)`); // Log: Hiding button (because it was clicked again or background was clicked)
                }
            } else {
                 console.log("Clicked list item, but no remove button found within it."); // Log: Button missing?
            }
        });
    } else {
        console.error("Controlled businesses list element not found for interaction listener.");
    }

    // --- How to Play Modal Listeners ---
    const howToPlayModal = document.getElementById('how-to-play-modal');
    const closeHowToPlayBtn = document.getElementById('close-how-to-play-btn');

    if (closeHowToPlayBtn) {
        closeHowToPlayBtn.addEventListener('click', closeHowToPlayModal);
    } else {
        console.error("Close button for How to Play modal not found!");
    }

    if (howToPlayModal) {
        howToPlayModal.addEventListener('click', (event) => {
            // Close only if clicking the background, not the content
            if (event.target === howToPlayModal) {
                closeHowToPlayModal();
            }
        });
    } else {
        console.error("How to Play modal element not found for background click listener.");
    }

    // --- Leaderboard Modal Functions ---
    function openLeaderboardModal() {
        if (leaderboardModal) {
            // TODO: Fetch actual leaderboard data here when backend is ready
            // For now, just show loading state or dummy data
            updateLeaderboardUI([], 'money'); // Clear/show loading
            updateLeaderboardUI([], 'power'); // Clear/show loading
            switchLeaderboardTab('money'); // Default to money tab
            leaderboardModal.classList.remove('modal-hidden');
            console.log("Leaderboard modal opened.");
        } else {
            console.error("Leaderboard modal element not found!");
            showCustomAlert("Error: Leaderboard unavailable.");
        }
    }

    function closeLeaderboardModal() {
        if (leaderboardModal) {
            leaderboardModal.classList.add('modal-hidden');
            console.log("Leaderboard modal closed.");
        }
    }

    function switchLeaderboardTab(tabType) {
        if (!moneyTabBtn || !powerTabBtn || !moneyContent || !powerContent) return;

        if (tabType === 'money') {
            moneyTabBtn.classList.add('active-tab');
            powerTabBtn.classList.remove('active-tab');
            moneyContent.classList.add('active-content');
            powerContent.classList.remove('active-content');
        } else if (tabType === 'power') {
            powerTabBtn.classList.add('active-tab');
            moneyTabBtn.classList.remove('active-tab');
            powerContent.classList.add('active-content');
            moneyContent.classList.remove('active-content');
        }
        // TODO: Potentially fetch data specific to the selected tab here
    }

    // Placeholder function to update leaderboard list
    function updateLeaderboardUI(data, type) {
        const listElement = type === 'money' ? moneyList : powerList;
        if (!listElement) return;

        listElement.innerHTML = ''; // Clear previous entries

        if (!data || data.length === 0) {
            listElement.innerHTML = '<li>Loading...</li>'; // Or 'No data available'
            return;
        }

        // Example: Assuming data is an array of { name: 'PlayerAlias', score: 1000 }
        data.forEach((entry, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${index + 1}. <span class="player-name">${entry.name}</span></span>
                <span class="player-score">${type === 'money' ? '$' : ''}${entry.score.toLocaleString()}</span>
            `;
            listElement.appendChild(listItem);
        });
    }

    // --- Leaderboard Modal Listeners ---
    if (actionLeaderboardBtn) {
        actionLeaderboardBtn.addEventListener('click', openLeaderboardModal);
    } else {
        console.error("Leaderboard action button not found.");
    }

    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener('click', closeLeaderboardModal);
    } else {
        console.error("Leaderboard close button not found.");
    }

    if (leaderboardModal) {
        leaderboardModal.addEventListener('click', (event) => {
            if (event.target === leaderboardModal) {
                closeLeaderboardModal();
            }
        });
    } else {
        console.error("Leaderboard modal element not found for background click listener.");
    }

    if (moneyTabBtn) {
        moneyTabBtn.addEventListener('click', () => switchLeaderboardTab('money'));
    } else {
        console.error("Leaderboard money tab button not found.");
    }

    if (powerTabBtn) {
        powerTabBtn.addEventListener('click', () => switchLeaderboardTab('power'));
    } else {
    console.error("Leaderboard power tab button not found.");
    }

    // --- SUI Wallet Integration Listeners ---
    document.addEventListener('suiWalletConnected', (event) => {
        console.log('uiManager received suiWalletConnected:', event.detail);
        if (event.detail && event.detail.address) {
            updatePlayerIdentityUI(event.detail);
        }
    });

    document.addEventListener('suiWalletDisconnected', () => {
        console.log('uiManager received suiWalletDisconnected');
        clearPlayerIdentityUI();
    });

    // Initial check in case wallet connected before this script ran (e.g., autoConnect)
    if (window.suiWallet && window.suiWallet.connected && window.suiWallet.address) {
         console.log('uiManager performing initial identity update for already connected wallet.');
         updatePlayerIdentityUI(window.suiWallet);
    }


}); // Close DOMContentLoaded listener


// --- SUI Wallet UI Update Functions ---

function updatePlayerIdentityUI(walletInfo) {
    if (!walletInfo || !walletInfo.address) return;

    const truncatedAddress = `${walletInfo.address.substring(0, 6)}...${walletInfo.address.substring(walletInfo.address.length - 4)}`;

    // Update bottom bar alias
    if (playerAliasBar) {
        playerAliasBar.textContent = `Wallet: ${truncatedAddress}`;
        playerAliasBar.title = `Connected SUI Wallet: ${walletInfo.address}`; // Tooltip with full address
    }

    // Disable manual inputs
    if (usernameInput) {
        usernameInput.disabled = true;
        usernameInput.placeholder = 'Wallet Connected';
        // Optionally clear the input value if desired
        // usernameInput.value = '';
    }
    if (aliasInput) {
        aliasInput.disabled = true;
        aliasInput.placeholder = 'Wallet Connected';
         // Optionally clear the input value if desired
        // aliasInput.value = '';
    }
    if (saveUserInfoBtn) {
        saveUserInfoBtn.disabled = true;
        saveUserInfoBtn.title = 'User info managed by connected wallet';
    }

    // Potentially update other UI elements or trigger game logic updates
    console.log(`Player identity updated to SUI Wallet: ${walletInfo.address}`);

    // TODO: Consider updating currentPlayerId in gameWorld.js or fetching player data based on wallet address
}

function clearPlayerIdentityUI() {
    // Restore bottom bar alias (use stored alias or default)
    if (playerAliasBar) {
        playerAliasBar.textContent = playerAlias || 'Alias'; // Use global playerAlias from gameWorld.js
        playerAliasBar.title = ''; // Clear wallet tooltip
    }

    // Re-enable manual inputs, respecting the username lock state
    if (usernameInput) {
        // Only re-enable if it wasn't previously locked by saving a username
        const wasLockedBySave = usernameInput.readOnly;
        usernameInput.disabled = wasLockedBySave; // Keep disabled if it was readOnly
        usernameInput.placeholder = 'Enter username';
        // Restore value if needed, or rely on loadUserInfo
        // usernameInput.value = playerUsername || '';
    }
    if (aliasInput) {
        aliasInput.disabled = false;
        aliasInput.placeholder = 'Enter alias';
         // Restore value if needed, or rely on loadUserInfo
        // aliasInput.value = playerAlias || '';
    }
    if (saveUserInfoBtn) {
        saveUserInfoBtn.disabled = false;
        saveUserInfoBtn.title = '';
    }

    console.log("Player identity UI cleared (wallet disconnected).");

    // TODO: Consider resetting currentPlayerId or loading default player data
}
