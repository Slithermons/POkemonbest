// Define Item Types and Subtypes

const ItemType = {
    CONSUMABLE: 'Consumable',
    NON_CONSUMABLE: 'NonConsumable',
    EQUIPMENT: 'Equipment' // Added for consistency, though equipment has its own file
};

const ConsumableType = {
    MEDKIT: 'Medkit',
    FOOD: 'Food',
    DRUG: 'Drug',
    BRIEFCASE: 'Briefcase' // Added Briefcase type
};

const NonConsumableType = {
    QUEST_ITEM: 'QuestItem',
    UTILITY: 'Utility',
    CRAFTING_ITEM: 'CraftingItem',
    KEY: 'Key',
    MAFIA_RING: 'MafiaRing' // Assuming this is a specific non-consumable type
};

// Base Item Class (Optional but good for structure)
class Item {
    constructor(id, name, description, itemType, subType, stackable = true, maxStack = 99, effect = null, image = null) { // Added effect and image parameters
        this.id = id; // Unique identifier for the item
        this.name = name;
        this.description = description;
        this.itemType = itemType; // e.g., ItemType.CONSUMABLE
        this.subType = subType;   // e.g., ConsumableType.MEDKIT
        this.stackable = stackable;
        this.maxStack = stackable ? maxStack : 1;
        this.effect = effect; // Store the effect (e.g., { health: 100 })
        this.image = image; // Store the image path
    }

    // Potential common methods for items can go here
    use() {
        console.log(`Using ${this.name}.`);
        // Specific use logic would be implemented in subclasses or handled externally
    }
}

// Example Item Definitions (using a Map for easy lookup and addition)
const itemsDatabase = new Map();

// --- Consumables ---
// Updated MED001 and MED002 with specific HP values and names
itemsDatabase.set('MED001', new Item('MED001', 'Standard Medkit', 'Replenishes 100 HP.', ItemType.CONSUMABLE, ConsumableType.MEDKIT, true, 90, { health: 100 }, 'img/items/MED001.jpg'));
itemsDatabase.set('MED002', new Item('MED002', 'Large Medkit', 'Replenishes 500 HP.', ItemType.CONSUMABLE, ConsumableType.MEDKIT, true, 9, { health: 500 }, 'img/items/MED002.jpg')); // Lowered stack size for large medkit
itemsDatabase.set('FOOD001', new Item('FOOD001', 'Canned Beans', 'Provides basic sustenance.', ItemType.CONSUMABLE, ConsumableType.FOOD, true, 90, { health: 50 }, 'img/items/FOOD001.jpg'));
itemsDatabase.set('FOOD002', new Item('FOOD002', 'Energy Bar', 'Quick energy boost.', ItemType.CONSUMABLE, ConsumableType.FOOD, true, 15, null, 'img/items/FOOD002.jpg'));
itemsDatabase.set('DRUG001', new Item('DRUG001', 'Adrenaline Shot', 'Temporarily boosts speed.', ItemType.CONSUMABLE, ConsumableType.DRUG, true, 5, null, 'img/items/DRUG001.jpg'));
itemsDatabase.set('DRUG002', new Item('DRUG002', 'Painkillers', 'Temporarily increases damage resistance.', ItemType.CONSUMABLE, ConsumableType.DRUG, true, 8, null, 'img/items/DRUG002.jpg'));

// --- Non-Consumables ---
itemsDatabase.set('QUEST001', new Item('QUEST001', 'Mysterious Key', 'A strange key found in the old ruins.', ItemType.NON_CONSUMABLE, NonConsumableType.QUEST_ITEM, false, 1, null, 'img/items/QUEST001.jpg'));
itemsDatabase.set('QUEST002', new Item('QUEST002', 'Torn Map Piece', 'Part of a larger map.', ItemType.NON_CONSUMABLE, NonConsumableType.QUEST_ITEM, false, 1, null, 'img/items/QUEST002.jpg'));
itemsDatabase.set('UTIL001', new Item('UTIL001', 'Lockpick Set', 'Used to open simple locks.', ItemType.NON_CONSUMABLE, NonConsumableType.UTILITY, true, 1, null, 'img/items/UTIL001.jpg'));
itemsDatabase.set('UTIL002', new Item('UTIL002', 'Binoculars', 'Allows viewing distant objects.', ItemType.NON_CONSUMABLE, NonConsumableType.UTILITY, false, 1, null, 'img/items/UTIL002.jpg'));
itemsDatabase.set('CRAFT001', new Item('CRAFT001', 'Scrap Metal', 'Common material for crafting.', ItemType.NON_CONSUMABLE, NonConsumableType.CRAFTING_ITEM, true, 50, null, 'img/items/CRAFT001.jpg'));
itemsDatabase.set('CRAFT002', new Item('CRAFT002', 'Duct Tape', 'Useful for quick repairs and crafting.', ItemType.NON_CONSUMABLE, NonConsumableType.CRAFTING_ITEM, true, 25, null, 'img/items/CRAFT002.jpg'));
itemsDatabase.set('KEY001', new Item('KEY001', 'Warehouse Key', 'Opens the main warehouse door.', ItemType.NON_CONSUMABLE, NonConsumableType.KEY, false, 1, null, 'img/items/KEY001.jpg'));
itemsDatabase.set('KEY002', new Item('KEY002', 'Office Key', 'Unlocks the back office.', ItemType.NON_CONSUMABLE, NonConsumableType.KEY, false, 1, null, 'img/items/KEY002.jpg'));
itemsDatabase.set('RING001', new Item('RING001', 'Don\'s Ring', 'A heavy gold ring, signifies Mafia status.', ItemType.NON_CONSUMABLE, NonConsumableType.MAFIA_RING, false, 1, null, 'img/items/RING001.jpg'));
itemsDatabase.set('RING002', new Item('RING002', 'Capo\'s Signet', 'A silver ring worn by Capos.', ItemType.NON_CONSUMABLE, NonConsumableType.MAFIA_RING, false, 1, null, 'img/items/RING002.jpg'));

// --- Mafia Themed Items ---
itemsDatabase.set('UTIL003', new Item('UTIL003', 'Brass Knuckles', 'Adds impact to your arguments.', ItemType.NON_CONSUMABLE, NonConsumableType.UTILITY, false, 1, null, 'img/items/UTIL003.jpg')); // Might be better as equipment later
itemsDatabase.set('UTIL004', new Item('UTIL004', 'Burner Phone', 'Untraceable communication device.', ItemType.NON_CONSUMABLE, NonConsumableType.UTILITY, true, 5, null, 'img/items/UTIL004.jpg')); // Stackable? Maybe charges?
itemsDatabase.set('DRUG003', new Item('DRUG003', 'Stimulant Shot', 'Temporary boost to combat stats.', ItemType.CONSUMABLE, ConsumableType.DRUG, true, 5, null, 'img/items/DRUG003.jpg'));

// --- Briefcases (Consumables that grant items) ---
// Note: Rarity name stored in effect for lookup in gameWorld.js, as Rarity object isn't available here.
// Icons are placeholders. Stackable true, maxStack can vary.
itemsDatabase.set('BRIEFCASE_C', new Item('BRIEFCASE_C', 'Common Briefcase', 'Contains common items or equipment.', ItemType.CONSUMABLE, ConsumableType.BRIEFCASE, true, 20, { open: true, rarityName: 'Common' }, 'img/items/briefcase_common.jpg'));
itemsDatabase.set('BRIEFCASE_U', new Item('BRIEFCASE_U', 'Uncommon Briefcase', 'May contain uncommon items.', ItemType.CONSUMABLE, ConsumableType.BRIEFCASE, true, 15, { open: true, rarityName: 'Uncommon' }, 'img/items/briefcase_uncommon.jpg'));
itemsDatabase.set('BRIEFCASE_R', new Item('BRIEFCASE_R', 'Rare Briefcase', 'Likely contains rare items or better.', ItemType.CONSUMABLE, ConsumableType.BRIEFCASE, true, 10, { open: true, rarityName: 'Rare' }, 'img/items/briefcase_rare.jpg'));
itemsDatabase.set('BRIEFCASE_E', new Item('BRIEFCASE_E', 'Epic Briefcase', 'Guaranteed epic item or better.', ItemType.CONSUMABLE, ConsumableType.BRIEFCASE, true, 5, { open: true, rarityName: 'Epic' }, 'img/items/briefcase_epic.jpg'));
itemsDatabase.set('BRIEFCASE_L', new Item('BRIEFCASE_L', 'Legendary Briefcase', 'Contains legendary items.', ItemType.CONSUMABLE, ConsumableType.BRIEFCASE, true, 3, { open: true, rarityName: 'Legendary' }, 'img/items/briefcase_legendary.jpg'));
itemsDatabase.set('BRIEFCASE_M', new Item('BRIEFCASE_M', 'Mythic Briefcase', 'Holds items of mythic power.', ItemType.CONSUMABLE, ConsumableType.BRIEFCASE, true, 2, { open: true, rarityName: 'Mythic' }, 'img/items/briefcase_mythic.jpg'));
itemsDatabase.set('BRIEFCASE_G', new Item('BRIEFCASE_G', 'God-Tier Briefcase', 'Contains items of unparalleled power.', ItemType.CONSUMABLE, ConsumableType.BRIEFCASE, true, 1, { open: true, rarityName: 'God-Tier' }, 'img/items/briefcase_god.jpg'));


// Function to get an item by its ID
function getItemById(id) {
    return itemsDatabase.get(id);
}

// Example Usage:
// const medkit = getItemById('MED001');
// if (medkit) {
//     console.log(`Found item: ${medkit.name}`);
//     medkit.use();
// }

// const ring = getItemById('RING001');
// if (ring) {
//     console.log(`Found item: ${ring.name} - ${ring.description}`);
// }

// To add more items easily:
// itemsDatabase.set('FOOD002', new Item('FOOD002', 'Energy Bar', 'Quick energy boost.', ItemType.CONSUMABLE, ConsumableType.FOOD, true, 15));

// Exporting (if using modules in the future)
// export { Item, ItemType, ConsumableType, NonConsumableType, itemsDatabase, getItemById };

console.log("Items system loaded.");
