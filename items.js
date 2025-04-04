// Define Item Types and Subtypes

const ItemType = {
    CONSUMABLE: 'Consumable',
    NON_CONSUMABLE: 'NonConsumable',
    EQUIPMENT: 'Equipment' // Added for consistency, though equipment has its own file
};

const ConsumableType = {
    MEDKIT: 'Medkit',
    FOOD: 'Food',
    DRUG: 'Drug'
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
    constructor(id, name, description, itemType, subType, stackable = true, maxStack = 99, effect = null) { // Added effect parameter
        this.id = id; // Unique identifier for the item
        this.name = name;
        this.description = description;
        this.itemType = itemType; // e.g., ItemType.CONSUMABLE
        this.subType = subType;   // e.g., ConsumableType.MEDKIT
        this.stackable = stackable;
        this.maxStack = stackable ? maxStack : 1;
        this.effect = effect; // Store the effect (e.g., { health: 100 })
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
itemsDatabase.set('MED001', new Item('MED001', 'Standard Medkit', 'Replenishes 100 HP.', ItemType.CONSUMABLE, ConsumableType.MEDKIT, true, 10, { health: 100 }));
itemsDatabase.set('MED002', new Item('MED002', 'Large Medkit', 'Replenishes 500 HP.', ItemType.CONSUMABLE, ConsumableType.MEDKIT, true, 5, { health: 500 })); // Lowered stack size for large medkit
itemsDatabase.set('FOOD001', new Item('FOOD001', 'Canned Beans', 'Provides basic sustenance.', ItemType.CONSUMABLE, ConsumableType.FOOD, true, 20));
itemsDatabase.set('FOOD002', new Item('FOOD002', 'Energy Bar', 'Quick energy boost.', ItemType.CONSUMABLE, ConsumableType.FOOD, true, 15));
itemsDatabase.set('DRUG001', new Item('DRUG001', 'Adrenaline Shot', 'Temporarily boosts speed.', ItemType.CONSUMABLE, ConsumableType.DRUG, true, 5));
itemsDatabase.set('DRUG002', new Item('DRUG002', 'Painkillers', 'Temporarily increases damage resistance.', ItemType.CONSUMABLE, ConsumableType.DRUG, true, 8));

// --- Non-Consumables ---
itemsDatabase.set('QUEST001', new Item('QUEST001', 'Mysterious Key', 'A strange key found in the old ruins.', ItemType.NON_CONSUMABLE, NonConsumableType.QUEST_ITEM, false));
itemsDatabase.set('QUEST002', new Item('QUEST002', 'Torn Map Piece', 'Part of a larger map.', ItemType.NON_CONSUMABLE, NonConsumableType.QUEST_ITEM, false));
itemsDatabase.set('UTIL001', new Item('UTIL001', 'Lockpick Set', 'Used to open simple locks.', ItemType.NON_CONSUMABLE, NonConsumableType.UTILITY, true, 1)); // Max stack 1 often makes sense for tools
itemsDatabase.set('UTIL002', new Item('UTIL002', 'Binoculars', 'Allows viewing distant objects.', ItemType.NON_CONSUMABLE, NonConsumableType.UTILITY, false));
itemsDatabase.set('CRAFT001', new Item('CRAFT001', 'Scrap Metal', 'Common material for crafting.', ItemType.NON_CONSUMABLE, NonConsumableType.CRAFTING_ITEM, true, 50));
itemsDatabase.set('CRAFT002', new Item('CRAFT002', 'Duct Tape', 'Useful for quick repairs and crafting.', ItemType.NON_CONSUMABLE, NonConsumableType.CRAFTING_ITEM, true, 25));
itemsDatabase.set('KEY001', new Item('KEY001', 'Warehouse Key', 'Opens the main warehouse door.', ItemType.NON_CONSUMABLE, NonConsumableType.KEY, false));
itemsDatabase.set('KEY002', new Item('KEY002', 'Office Key', 'Unlocks the back office.', ItemType.NON_CONSUMABLE, NonConsumableType.KEY, false));
itemsDatabase.set('RING001', new Item('RING001', 'Don\'s Ring', 'A heavy gold ring, signifies Mafia status.', ItemType.NON_CONSUMABLE, NonConsumableType.MAFIA_RING, false));
itemsDatabase.set('RING002', new Item('RING002', 'Capo\'s Signet', 'A silver ring worn by Capos.', ItemType.NON_CONSUMABLE, NonConsumableType.MAFIA_RING, false));

// --- Mafia Themed Items ---
itemsDatabase.set('UTIL003', new Item('UTIL003', 'Brass Knuckles', 'Adds impact to your arguments.', ItemType.NON_CONSUMABLE, NonConsumableType.UTILITY, false)); // Might be better as equipment later
itemsDatabase.set('UTIL004', new Item('UTIL004', 'Burner Phone', 'Untraceable communication device.', ItemType.NON_CONSUMABLE, NonConsumableType.UTILITY, true, 5)); // Stackable? Maybe charges?
itemsDatabase.set('DRUG003', new Item('DRUG003', 'Stimulant Shot', 'Temporary boost to combat stats.', ItemType.CONSUMABLE, ConsumableType.DRUG, true, 5));


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
