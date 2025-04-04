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

// Function to update the cash display
function updateCashUI(amount) {
    if (cashAmountElement) {
        cashAmountElement.textContent = amount;
    } else {
        console.error("Cash amount element not found!");
    }
}

// Function to update the inventory UI (targets list inside the modal)
function updateInventoryUI() {
    // Get the list element each time, as it might not exist when this function is first defined
    const listElement = document.querySelector('#inventory-modal #inventory-list');
    if (!listElement) {
        // Don't error here, modal might not be open yet
        // console.error("Inventory list element inside modal not found!");
        return;
    }

    listElement.innerHTML = ''; // Clear current list

    if (playerInventory.length === 0) { // Variable from gameWorld.js
        listElement.innerHTML = '<li>(Empty)</li>'; // Use specific text for empty
        return;
    }

    // Group items by ID for display (e.g., Medkit x2)
    const groupedInventory = playerInventory.reduce((acc, itemEntry) => {
        acc[itemEntry.id] = (acc[itemEntry.id] || 0) + (itemEntry.quantity || 1);
        return acc;
    }, {});

    // Ensure itemsDatabase and equipmentDatabase are available (defined in items.js/equipment.js)
    if (typeof itemsDatabase === 'undefined' || typeof equipmentDatabase === 'undefined') {
        console.error("itemsDatabase or equipmentDatabase not found! Make sure items.js and equipment.js are loaded before uiManager.js");
        listElement.innerHTML = '<li>Error loading item data!</li>';
        return;
    }
    // Ensure Rarity is available (defined in equipment.js)
    if (typeof Rarity === 'undefined') {
        console.error("Rarity object not found! Make sure equipment.js is loaded before uiManager.js");
        // Continue without rarity styling if needed
    }


    for (const itemId in groupedInventory) {
        // Check items and equipment databases
        const itemDefinition = itemsDatabase.get(itemId) || equipmentDatabase.get(itemId); // Use the Maps

        if (itemDefinition) {
            const quantity = groupedInventory[itemId];
            const listItem = document.createElement('li');
            listItem.textContent = `${itemDefinition.name}${quantity > 1 ? ` x${quantity}` : ''}`;
            listItem.title = itemDefinition.description || ''; // Add tooltip
            listItem.dataset.itemId = itemId; // Store item ID for potential click actions

            // Apply rarity color if it's equipment with rarity defined
            if (itemDefinition.itemType === 'Equipment' && itemDefinition.rarity && itemDefinition.rarity.color && typeof Rarity !== 'undefined') {
                 if (itemDefinition.rarity.name === Rarity.GOD_TIER.name) {
                     // Style for God-Tier (e.g., white text with black outline)
                     listItem.style.color = '#FFFFFF';
                     listItem.style.textShadow = '0 0 3px #000, 0 0 3px #000, 0 0 3px #000'; // Thicker outline
                 } else {
                    listItem.style.color = itemDefinition.rarity.color;
                    listItem.style.textShadow = 'none'; // Ensure no shadow for other rarities
                 }
                 listItem.title += ` (${itemDefinition.rarity.name})`; // Add rarity name to tooltip
            } else {
                // Reset color and shadow for non-equipment or items without rarity
                listItem.style.color = ''; // Use default text color
                listItem.style.textShadow = 'none';
            }

            listElement.appendChild(listItem);
        } else {
            console.warn(`Definition not found for item ID: ${itemId}`);
            const listItem = document.createElement('li');
            listItem.textContent = `Unknown Item (${itemId}) x${groupedInventory[itemId]}`;
            listItem.style.color = 'red'; // Indicate an error
            listElement.appendChild(listItem);
        }
    }
}

// Function to update the Protection Book UI
function updateProtectionBookUI() {
    if (!protectionBookElement || !controlledBusinessesListElement) {
        console.error("Protection book elements not found!");
        return;
    }
    if (!currentUserOrganization) { // Variable from gameWorld.js
        protectionBookElement.style.display = 'none';
        controlledBusinessesListElement.innerHTML = '';
        return;
    }

    controlledBusinessesListElement.innerHTML = ''; // Clear existing list
    let controlledCount = 0;
    let totalProtectionPower = 0; // Track total power of controlled businesses

    // Iterate through cached businesses that are currently displayed
    displayedBusinessIds.forEach(id => { // Variable from gameWorld.js
        const businessInfo = businessesCache[id]; // Variable from gameWorld.js
        // Check if the business exists and is controlled *for profit* by the current org
        if (businessInfo && businessInfo.isControlled) { // isControlled checks territory radius
            controlledCount++;
            const profit = calculatePotentialProfit(businessInfo); // Function from gameWorld.js
            const listItem = document.createElement('li');
            listItem.classList.add('controlled-business-item');

            let protectionInfo = '(Unprotected)';
            let protectorAlias = ''; // Variable to hold the alias
            // Check if it's protected by *this* organization
            if (businessInfo.protectingOrganization && businessInfo.protectingOrganization.abbreviation === currentUserOrganization.abbreviation) {
                protectionInfo = `(Power: ${businessInfo.protectionPower})`;
                totalProtectionPower += businessInfo.protectionPower; // Add to total
                // If protected by current org, display the saved alias
                if (playerAlias) { // Variable from gameWorld.js
                    protectorAlias = ` <span class="protector-alias">(${playerAlias})</span>`;
                }
            } else if (businessInfo.protectingOrganization) {
                 protectionInfo = `(Protected by ${businessInfo.protectingOrganization.abbreviation})`; // Show if protected by others
            }


            // Display name, alias (if applicable), profit, and protection status
            listItem.innerHTML = `
                <span class="business-name">${businessInfo.name}${protectorAlias}</span>
                <span class="business-profit">$${profit}</span>
                <span class="business-protection">${protectionInfo}</span>
            `;
            controlledBusinessesListElement.appendChild(listItem);
        }
    });

    // Add a summary line for total protection power?
    if (controlledCount > 0) {
        const summaryItem = document.createElement('li');
        summaryItem.classList.add('protection-summary');
        summaryItem.innerHTML = `<b>Total Protection Power: ${totalProtectionPower}</b>`;
        controlledBusinessesListElement.appendChild(summaryItem); // Add to the end
        // Only show if not minimized
        if (!protectionBookElement.classList.contains('minimized')) {
             protectionBookElement.style.display = 'block';
        }
    } else {
         controlledBusinessesListElement.innerHTML = '<li>No businesses currently controlled.</li>';
         // Keep book visible but show empty message (if not minimized)
         if (!protectionBookElement.classList.contains('minimized')) {
             protectionBookElement.style.display = 'block';
         }
    }
}

// Function to update the Stats Info modal UI
function updateStatsModalUI() {
    // Ensure stats are up-to-date before displaying
    calculatePlayerPower(); // Function from gameWorld.js
    calculateCharacterStats(); // Function from gameWorld.js

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

    console.log("Stats modal UI updated.");
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
    if (savedAlias && aliasInput) { // Check if input exists too
        playerAlias = savedAlias; // Update global var
        aliasInput.value = playerAlias;
    }
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

            // Calculate sell price using rarityMultipliers from shop.js
            // Ensure rarity is a string and formatted correctly for lookup
            const rarityKey = (item.rarity || 'Common').toLowerCase().replace('-', '_');
            const multiplier = rarityMultipliers[rarityKey] || 1; // rarityMultipliers from shop.js
            const sellPrice = 30 * multiplier;

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
            updateCashUI(currentCash); // Update UI
            // Inventory was modified directly by addItemToInventory
            populateShopUI(); // Re-populate sell list to reflect changes
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
            currentCash = playerForShop.money; // Update global cash from modified object
            updateCashUI(currentCash); // Update UI
            // Inventory was modified directly by removeItemFromInventory
            populateShopUI(); // Re-populate sell list
            showShopMessage(result.message);
        } else {
            showShopMessage(result.message, true); // Show error message
        }
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
                    health: playerHealth, // Use global var from gameWorld.js
                    attack: playerStats.strength, // Use global var from gameWorld.js
                    defense: playerCharacterStats.defence // Use global var from gameWorld.js
                };

                console.log("Player Stats for Battle:", currentPlayerBattleStats);
                console.log("Enemy Stats for Battle:", { name: enemy.name, health: enemy.health, attack: enemy.attack, defense: enemy.defense });

                if (typeof initiateBattle === 'function') {
                    initiateBattle(currentPlayerBattleStats, enemy); // Function from battle.js
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
// Attach the single popup listener
map.on('popupopen', handlePopupOpenForActions);


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

// --- Modal Logic (Wrapped in DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    // Get references to modal elements *after* DOM is loaded
    const statsModal = document.getElementById('stats-modal');
    const openStatsBtn = document.getElementById('open-stats-btn');
    const closeStatsBtn = document.getElementById('close-stats-btn');

    const equipmentModal = document.getElementById('equipment-modal');
    const openEquipmentBtn = document.getElementById('open-equipment-btn');
    const closeEquipmentBtn = document.getElementById('close-equipment-btn');

    const inventoryModal = document.getElementById('inventory-modal');
    const openInventoryBtn = document.getElementById('open-inventory-btn');
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    const inventoryListElement = document.querySelector('#inventory-modal #inventory-list');

    const battleModal = document.getElementById('battle-modal');
    const battleCloseBtn = document.getElementById('battle-close-btn');

    // Get Shop Modal elements here
    const shopModalElement = document.getElementById('shop-modal');
    const closeShopBtnElement = document.getElementById('close-shop-btn');
    const shopBuyListElement = document.getElementById('shop-buy-list');
    const shopSellListElement = document.getElementById('shop-sell-list');


    // --- Stats Info Modal Elements & Listeners ---
    if (statsModal && openStatsBtn && closeStatsBtn) {
        openStatsBtn.addEventListener('click', () => {
            updateStatsModalUI(); // Update content before showing
            statsModal.classList.remove('modal-hidden');
            console.log("Stats modal opened.");
        });
        closeStatsBtn.addEventListener('click', () => {
            statsModal.classList.add('modal-hidden');
            console.log("Stats modal closed (button).");
        });
        statsModal.addEventListener('click', (event) => {
            if (event.target === statsModal) {
                statsModal.classList.add('modal-hidden');
                console.log("Stats modal closed (background).");
            }
        });
    } else {
        console.error("Could not find all stats modal elements:", { modal: !!statsModal, openBtn: !!openStatsBtn, closeBtn: !!closeStatsBtn });
    }

    // --- Equipment Modal Elements & Listeners ---
    if (equipmentModal && openEquipmentBtn && closeEquipmentBtn) {
        openEquipmentBtn.addEventListener('click', () => {
            equipmentModal.classList.remove('modal-hidden');
            // TODO: Populate modal with current equipment data when opening (Requires equipment logic)
            console.log("Equipment modal opened.");
        });
        closeEquipmentBtn.addEventListener('click', () => {
            equipmentModal.classList.add('modal-hidden');
            console.log("Equipment modal closed (button).");
        });
        equipmentModal.addEventListener('click', (event) => {
            if (event.target === equipmentModal) {
                equipmentModal.classList.add('modal-hidden');
                console.log("Equipment modal closed (background).");
            }
        });
    } else {
        console.error("Could not find all equipment modal elements:", { modal: !!equipmentModal, openBtn: !!openEquipmentBtn, closeBtn: !!closeEquipmentBtn });
    }

    // --- Inventory Modal Elements & Listeners ---
    if (inventoryModal && openInventoryBtn && closeInventoryBtn && inventoryListElement) {
        openInventoryBtn.addEventListener('click', () => {
            updateInventoryUI(); // Update list content *before* showing
            inventoryModal.classList.remove('modal-hidden');
            console.log("Inventory modal opened.");
        });
        closeInventoryBtn.addEventListener('click', () => {
            inventoryModal.classList.add('modal-hidden');
            console.log("Inventory modal closed (button).");
        });
        inventoryModal.addEventListener('click', (event) => {
            if (event.target === inventoryModal) {
                inventoryModal.classList.add('modal-hidden');
                console.log("Inventory modal closed (background).");
            }
        });

        // Item usage listener
        inventoryListElement.addEventListener('click', (event) => {
            if (event.target.tagName === 'LI' && event.target.dataset.itemId) {
                const itemId = event.target.dataset.itemId;
                console.log(`Clicked on inventory item: ${itemId}`);
                // TODO: Implement item usage logic here (likely call a function in gameWorld.js)
                showCustomAlert(`Using ${itemId} - Not implemented yet.`);
            }
        });

    } else {
        console.error("Could not find all inventory modal elements:", { modal: !!inventoryModal, openBtn: !!openInventoryBtn, closeBtn: !!closeInventoryBtn, list: !!inventoryListElement });
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


    // --- Initial UI Setup ---
    loadUserInfo(); // Load username/alias first
    updateOrganizationUI(); // Update based on initial state (likely 'None')
    updateCashUI(currentCash); // Show initial cash (0)

}); // Close DOMContentLoaded listener
