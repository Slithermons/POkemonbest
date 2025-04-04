// Define Equipment Types (Slots)
const EquipmentType = {
    HEAD: 'Head',
    MASK: 'Mask',
    BODY: 'Body',
    GLOVES: 'Gloves',
    PANTS: 'Pants',
    BOOTS: 'Boots',
    ACCESSORY: 'Accessory',
    CHARM: 'Charm',
    WEAPON: 'Weapon'
};

// Base Equipment Class
// Assuming Item class is available globally or will be imported if using modules
// If not, define necessary base properties here or duplicate the Item class structure.
// For simplicity here, we'll define properties directly. If Item class is accessible,
// you could do: class Equipment extends Item { ... }
class Equipment {
    constructor(id, name, description, equipmentType, stats = {}, requirements = {}) {
        this.id = id; // Unique identifier
        this.name = name;
        this.description = description;
        this.itemType = 'Equipment'; // Explicitly set item type
        this.equipmentType = equipmentType; // The slot this equipment goes into (e.g., EquipmentType.HEAD)
        this.stats = stats; // An object containing stat bonuses, e.g., { defense: 5, strength: 2 }
        this.requirements = requirements; // An object for equip requirements, e.g., { level: 10, strength: 5 }
        this.stackable = false; // Equipment is typically not stackable
        this.maxStack = 1;
    }

    // Potential methods specific to equipment
    getStatBonus(statName) {
        return this.stats[statName] || 0;
    }

    meetsRequirements(playerStats) {
        for (const req in this.requirements) {
            if (!playerStats.hasOwnProperty(req) || playerStats[req] < this.requirements[req]) {
                // console.log(`Requirement not met: ${req} needs ${this.requirements[req]}, player has ${playerStats[req] || 0}`);
                return false;
            }
        }
        return true;
    }
}

// Example Equipment Definitions (using a Map for easy lookup and addition)
const equipmentDatabase = new Map();

// --- Head ---
// Note: Using 'defence' for the stat key to match user request for derived stat calculation
equipmentDatabase.set('HEAD001', new Equipment('HEAD001', 'Leather Cap', 'A simple leather cap.', EquipmentType.HEAD, { defence: 2 }));
equipmentDatabase.set('HEAD002', new Equipment('HEAD002', 'Iron Helmet', 'Offers decent protection.', EquipmentType.HEAD, { defence: 5 }, { level: 5 }));
equipmentDatabase.set('HEAD003', new Equipment('HEAD003', 'Tactical Helmet', 'Advanced protection.', EquipmentType.HEAD, { defence: 8, hitRate: 2 }, { level: 10 }));

// --- Mask ---
equipmentDatabase.set('MASK001', new Equipment('MASK001', 'Gas Mask', 'Protects against airborne toxins.', EquipmentType.MASK, { resistance_poison: 10 }));
equipmentDatabase.set('MASK002', new Equipment('MASK002', 'Ballistic Mask', 'Provides minor facial protection.', EquipmentType.MASK, { defence: 1 }, { level: 3 }));
equipmentDatabase.set('MASK003', new Equipment('MASK003', 'Stealth Mask', 'Slightly improves evasion.', EquipmentType.MASK, { evasionRate: 3 }, { level: 7 }));

// --- Body ---
equipmentDatabase.set('BODY001', new Equipment('BODY001', 'Leather Vest', 'Basic torso protection.', EquipmentType.BODY, { defence: 4 }));
equipmentDatabase.set('BODY002', new Equipment('BODY002', 'Chainmail Shirt', 'Good protection against slashing attacks.', EquipmentType.BODY, { defence: 8, resistance_slash: 5 }, { level: 8 }));
equipmentDatabase.set('BODY003', new Equipment('BODY003', 'Kevlar Vest', 'High damage resistance.', EquipmentType.BODY, { defence: 12, vitality: 5 }, { level: 12 }));

// --- Gloves ---
equipmentDatabase.set('GLOV001', new Equipment('GLOV001', 'Work Gloves', 'Slightly improves grip.', EquipmentType.GLOVES, { hitRate: 1 })); // Changed dexterity to hitRate for example
equipmentDatabase.set('GLOV002', new Equipment('GLOV002', 'Reinforced Gloves', 'Offers better protection and grip.', EquipmentType.GLOVES, { defence: 1, hitRate: 2 }, { level: 4 }));
equipmentDatabase.set('GLOV003', new Equipment('GLOV003', 'Assassin Gloves', 'Improves critical chance.', EquipmentType.GLOVES, { criticalRate: 5 }, { level: 9 }));

// --- Pants ---
equipmentDatabase.set('PANT001', new Equipment('PANT001', 'Rugged Trousers', 'Durable legwear.', EquipmentType.PANTS, { defence: 3 }));
equipmentDatabase.set('PANT002', new Equipment('PANT002', 'Cargo Pants', 'Offers extra storage space (conceptual).', EquipmentType.PANTS, { defence: 2, inventory_slots: 2 })); // Note: inventory_slots is a conceptual stat
equipmentDatabase.set('PANT003', new Equipment('PANT003', 'Agile Leggings', 'Enhances evasion.', EquipmentType.PANTS, { defence: 1, evasionRate: 4 }, { level: 5 }));

// --- Boots ---
equipmentDatabase.set('BOOT001', new Equipment('BOOT001', 'Leather Boots', 'Standard footwear.', EquipmentType.BOOTS, { defence: 2, agility: 1 })); // Changed speed to agility
equipmentDatabase.set('BOOT002', new Equipment('BOOT002', 'Combat Boots', 'Sturdy boots offering better protection.', EquipmentType.BOOTS, { defence: 4 }, { level: 6 })); // Removed speed
equipmentDatabase.set('BOOT003', new Equipment('BOOT003', 'Swift Boots', 'Increases movement speed and evasion.', EquipmentType.BOOTS, { defence: 1, agility: 3, evasionRate: 2 }, { level: 7 }));

// --- Accessory ---
equipmentDatabase.set('ACCS001', new Equipment('ACCS001', 'Silver Ring', 'A simple silver ring.', EquipmentType.ACCESSORY, { influence: 5 })); // Changed charisma to influence
equipmentDatabase.set('ACCS002', new Equipment('ACCS002', 'Gold Chain', 'A flashy gold chain.', EquipmentType.ACCESSORY, { influence: 10 }, { level: 5 })); // Changed charisma to influence
equipmentDatabase.set('ACCS003', new Equipment('ACCS003', 'Scope', 'Improves weapon accuracy.', EquipmentType.ACCESSORY, { hitRate: 5 }, { level: 8 }));

// --- Charm ---
equipmentDatabase.set('CHARM001', new Equipment('CHARM001', 'Lucky Rabbit\'s Foot', 'Might bring good fortune.', EquipmentType.CHARM, { criticalRate: 2 })); // Changed luck to criticalRate
equipmentDatabase.set('CHARM002', new Equipment('CHARM002', 'Protective Amulet', 'Offers minor magical resistance.', EquipmentType.CHARM, { defence: 1, resistance_magic: 3 }));
equipmentDatabase.set('CHARM003', new Equipment('CHARM003', 'Vitality Charm', 'Increases overall vitality.', EquipmentType.CHARM, { vitality: 5 }, { level: 10 }));

// --- Weapon ---
// Note: Using 'attack' for base damage, criticalRate/hitRate for derived stats
equipmentDatabase.set('WEAP001', new Equipment('WEAP001', 'Rusty Pipe', 'Better than nothing.', EquipmentType.WEAPON, { attack: 5 }, { strength: 3 }));
equipmentDatabase.set('WEAP002', new Equipment('WEAP002', 'Baseball Bat', 'Good for hitting things.', EquipmentType.WEAPON, { attack: 8 }, { strength: 5 }));
equipmentDatabase.set('WEAP003', new Equipment('WEAP003', 'Sharp Knife', 'Quick and deadly.', EquipmentType.WEAPON, { attack: 6, criticalRate: 3 }, { agility: 4 }));
equipmentDatabase.set('WEAP004', new Equipment('WEAP004', 'Sniper Rifle', 'High precision, high damage.', EquipmentType.WEAPON, { attack: 25, hitRate: 10, criticalRate: 8 }, { level: 15, agility: 8 }));


// Function to get an equipment item by its ID
function getEquipmentById(id) {
    return equipmentDatabase.get(id);
}

// Example Usage:
// const helmet = getEquipmentById('HEAD002');
// if (helmet) {
//     console.log(`Found equipment: ${helmet.name}`);
//     console.log(`Defense bonus: ${helmet.getStatBonus('defense')}`);
//     // Example player stats check
//     const playerStats = { level: 6, strength: 4 };
//     if (helmet.meetsRequirements(playerStats)) {
//         console.log("Player can equip this item.");
//     } else {
//         console.log("Player does not meet requirements.");
//     }
// }

// To add more equipment easily:
// equipmentDatabase.set('WEAP003', new Equipment('WEAP003', 'Sharp Knife', 'A basic knife.', EquipmentType.WEAPON, { attack: 6, speed: 1 }, { dexterity: 4 }));


// Exporting (if using modules in the future)
// export { Equipment, EquipmentType, equipmentDatabase, getEquipmentById };

console.log("Equipment system loaded.");
