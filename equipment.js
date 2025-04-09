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
    WEAPON: 'Weapon',
    // Housing Slots
    BASE: 'Base',
    WALL_DECORATION: 'WallDecoration',
    WEAPON_STASH: 'WeaponStash',
    LUXURY_FURNITURE: 'LuxuryFurniture',
    SECURITY_SYSTEM: 'SecuritySystem'
};

// --- Rarity System ---
const Rarity = {
    COMMON:     { name: 'Common',     color: '#B0B0B0', multiplier: 1.0 },
    UNCOMMON:   { name: 'Uncommon',   color: '#4CAF50', multiplier: 1.2 },
    RARE:       { name: 'Rare',       color: '#2196F3', multiplier: 1.5 },
    EPIC:       { name: 'Epic',       color: '#9C27B0', multiplier: 1.8 },
    LEGENDARY:  { name: 'Legendary',  color: '#FFC107', multiplier: 2.0 },
    MYTHIC:     { name: 'Mythic',     color: '#F44336', multiplier: 2.5 },
    GOD_TIER:   { name: 'God-Tier',   color: '#000000', multiplier: 3.0 } // Note: Black might be hard to see
};

// Base Equipment Class (Adding optional image and category properties)
class Equipment {
    constructor(id, name, description, equipmentType, stats = {}, requirements = {}, rarity = Rarity.COMMON, image = null, category = 'equipment') { // Added category parameter
        // Automatically generate image path for standard equipment if not provided
        const defaultImagePath = category === 'equipment' ? `img/items/${id}.jpg` : null; // Changed extension to .jpg

        this.id = id; // Unique identifier
        this.name = name;
        this.description = description;
        this.itemType = 'Equipment'; // Explicitly set item type
        this.equipmentType = equipmentType; // The slot this equipment goes into (e.g., EquipmentType.HEAD)
        // Note: The stats provided here are considered the FINAL stats for this specific item instance's rarity.
        // The multiplier in Rarity is for reference or potential future dynamic calculation/balancing.
        this.stats = stats;
        this.requirements = requirements; // An object for equip requirements, e.g., { level: 10, strength: 5 }
        this.rarity = rarity; // Store the rarity object
        this.image = image !== null ? image : defaultImagePath; // Use provided image, or default if applicable
        this.category = category; // Added category for inventory filtering (e.g., 'equipment', 'housing', 'plots')
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
equipmentDatabase.set('HEAD001', new Equipment('HEAD001', 'Leather Cap', 'A simple leather cap.', EquipmentType.HEAD, { defence: 2 }, {}, Rarity.COMMON));
equipmentDatabase.set('HEAD002', new Equipment('HEAD002', 'Iron Helmet', 'Offers decent protection.', EquipmentType.HEAD, { defence: 5 }, { level: 5 }, Rarity.UNCOMMON)); // Example: Uncommon
equipmentDatabase.set('HEAD003', new Equipment('HEAD003', 'Tactical Helmet', 'Advanced protection.', EquipmentType.HEAD, { defence: 8, hitRate: 2 }, { level: 10 }, Rarity.RARE)); // Example: Rare

// --- Mask ---
equipmentDatabase.set('MASK001', new Equipment('MASK001', 'Gas Mask', 'Protects against airborne toxins.', EquipmentType.MASK, { resistance_poison: 10 }, {}, Rarity.UNCOMMON));
equipmentDatabase.set('MASK002', new Equipment('MASK002', 'Ballistic Mask', 'Provides minor facial protection.', EquipmentType.MASK, { defence: 1 }, { level: 3 }, Rarity.COMMON));
equipmentDatabase.set('MASK003', new Equipment('MASK003', 'Stealth Mask', 'Slightly improves evasion.', EquipmentType.MASK, { evasionRate: 3 }, { level: 7 }, Rarity.RARE));

// --- Body ---
equipmentDatabase.set('BODY001', new Equipment('BODY001', 'Leather Vest', 'Basic torso protection.', EquipmentType.BODY, { defence: 4 }, {}, Rarity.COMMON));
equipmentDatabase.set('BODY002', new Equipment('BODY002', 'Chainmail Shirt', 'Good protection against slashing attacks.', EquipmentType.BODY, { defence: 8, resistance_slash: 5 }, { level: 8 }, Rarity.UNCOMMON));
equipmentDatabase.set('BODY003', new Equipment('BODY003', 'Kevlar Vest', 'High damage resistance.', EquipmentType.BODY, { defence: 12, vitality: 5 }, { level: 12 }, Rarity.RARE));

// --- Gloves ---
equipmentDatabase.set('GLOV001', new Equipment('GLOV001', 'Work Gloves', 'Slightly improves grip.', EquipmentType.GLOVES, { hitRate: 1 }, {}, Rarity.COMMON));
equipmentDatabase.set('GLOV002', new Equipment('GLOV002', 'Reinforced Gloves', 'Offers better protection and grip.', EquipmentType.GLOVES, { defence: 1, hitRate: 2 }, { level: 4 }, Rarity.UNCOMMON));
equipmentDatabase.set('GLOV003', new Equipment('GLOV003', 'Assassin Gloves', 'Improves critical chance.', EquipmentType.GLOVES, { criticalRate: 5 }, { level: 9 }, Rarity.EPIC)); // Example: Epic

// --- Pants ---
equipmentDatabase.set('PANT001', new Equipment('PANT001', 'Rugged Trousers', 'Durable legwear.', EquipmentType.PANTS, { defence: 3 }, {}, Rarity.COMMON));
equipmentDatabase.set('PANT002', new Equipment('PANT002', 'Cargo Pants', 'Offers extra storage space (conceptual).', EquipmentType.PANTS, { defence: 2, inventory_slots: 2 }, {}, Rarity.COMMON));
equipmentDatabase.set('PANT003', new Equipment('PANT003', 'Agile Leggings', 'Enhances evasion.', EquipmentType.PANTS, { defence: 1, evasionRate: 4 }, { level: 5 }, Rarity.UNCOMMON));

// --- Boots ---
equipmentDatabase.set('BOOT001', new Equipment('BOOT001', 'Leather Boots', 'Standard footwear.', EquipmentType.BOOTS, { defence: 2, agility: 1 }, {}, Rarity.COMMON));
equipmentDatabase.set('BOOT002', new Equipment('BOOT002', 'Combat Boots', 'Sturdy boots offering better protection.', EquipmentType.BOOTS, { defence: 4 }, { level: 6 }, Rarity.UNCOMMON));
equipmentDatabase.set('BOOT003', new Equipment('BOOT003', 'Swift Boots', 'Increases movement speed and evasion.', EquipmentType.BOOTS, { defence: 1, agility: 3, evasionRate: 2 }, { level: 7 }, Rarity.RARE));

// --- Accessory ---
equipmentDatabase.set('ACCS001', new Equipment('ACCS001', 'Silver Ring', 'A simple silver ring.', EquipmentType.ACCESSORY, { influence: 5 }, {}, Rarity.COMMON));
equipmentDatabase.set('ACCS002', new Equipment('ACCS002', 'Gold Chain', 'A flashy gold chain.', EquipmentType.ACCESSORY, { influence: 10 }, { level: 5 }, Rarity.UNCOMMON));
equipmentDatabase.set('ACCS003', new Equipment('ACCS003', 'Scope', 'Improves weapon accuracy.', EquipmentType.ACCESSORY, { hitRate: 5 }, { level: 8 }, Rarity.RARE));

// --- Charm ---
equipmentDatabase.set('CHARM001', new Equipment('CHARM001', 'Lucky Rabbit\'s Foot', 'Might bring good fortune.', EquipmentType.CHARM, { criticalRate: 2 }, {}, Rarity.UNCOMMON));
equipmentDatabase.set('CHARM002', new Equipment('CHARM002', 'Protective Amulet', 'Offers minor magical resistance.', EquipmentType.CHARM, { defence: 1, resistance_magic: 3 }, {}, Rarity.RARE));
equipmentDatabase.set('CHARM003', new Equipment('CHARM003', 'Vitality Charm', 'Increases overall vitality.', EquipmentType.CHARM, { vitality: 5 }, { level: 10 }, Rarity.EPIC));

// --- Weapon ---
// Note: Using 'attack' for base damage, criticalRate/hitRate for derived stats
equipmentDatabase.set('WEAP001', new Equipment('WEAP001', 'Rusty Pipe', 'Better than nothing.', EquipmentType.WEAPON, { attack: 5 }, { strength: 3 }, Rarity.COMMON));
equipmentDatabase.set('WEAP002', new Equipment('WEAP002', 'Baseball Bat', 'Good for hitting things.', EquipmentType.WEAPON, { attack: 8 }, { strength: 5 }, Rarity.COMMON));
equipmentDatabase.set('WEAP003', new Equipment('WEAP003', 'Sharp Knife', 'Quick and deadly.', EquipmentType.WEAPON, { attack: 6, criticalRate: 3 }, { agility: 4 }, Rarity.UNCOMMON));
equipmentDatabase.set('WEAP004', new Equipment('WEAP004', 'Sniper Rifle', 'High precision, high damage.', EquipmentType.WEAPON, { attack: 25, hitRate: 10, criticalRate: 8 }, { level: 15, agility: 8 }, Rarity.EPIC));

// --- Mafia Themed Equipment ---
equipmentDatabase.set('HEAD004', new Equipment('HEAD004', 'Fedora', 'A classic symbol of status and style.', EquipmentType.HEAD, { influence: 5, defence: 1 }, { level: 3 }, Rarity.UNCOMMON));
equipmentDatabase.set('BODY004', new Equipment('BODY004', 'Tailored Suit', 'Impeccable style, offers surprising protection.', EquipmentType.BODY, { defence: 6, influence: 10 }, { level: 7 }, Rarity.RARE));
equipmentDatabase.set('WEAP005', new Equipment('WEAP005', 'Tommy Gun', 'Chicago Typewriter. High rate of fire.', EquipmentType.WEAPON, { attack: 18, hitRate: -5 }, { level: 10, strength: 7 }, Rarity.RARE)); // High attack, lower accuracy

// --- Housing Equipment Examples (Itemized with Rarities & Category) ---

// Base Designs (EquipmentType.BASE)
equipmentDatabase.set('BASE001', new Equipment('BASE001', 'Basic Warehouse', 'A simple, functional warehouse base. Low profile.', EquipmentType.BASE, { defence: 5 }, {}, Rarity.COMMON, 'img/housing/base_warehouse.png', 'housing-plots'));
equipmentDatabase.set('BASE002', new Equipment('BASE002', 'Downtown Loft', 'A stylish loft in the city center. Boosts influence.', EquipmentType.BASE, { influence: 10 }, { level: 5 }, Rarity.UNCOMMON, 'img/housing/base_loft.png', 'housing-plots'));
equipmentDatabase.set('BASE003', new Equipment('BASE003', 'Secure Bunker', 'A heavily fortified underground bunker. High defense.', EquipmentType.BASE, { defence: 20 }, { level: 10 }, Rarity.RARE, 'img/housing/base_bunker.png', 'housing-plots'));
equipmentDatabase.set('BASE004', new Equipment('BASE004', 'Penthouse Suite', 'Luxury living with a view. Maximum influence.', EquipmentType.BASE, { influence: 25, defence: 5 }, { level: 15 }, Rarity.EPIC, 'img/housing/base_penthouse.png', 'housing-plots')); // Added Epic option

// Wall Decorations (EquipmentType.WALL_DECORATION)
equipmentDatabase.set('WALL001', new Equipment('WALL001', 'Graffiti Tag', 'Adds some street cred, minor influence boost.', EquipmentType.WALL_DECORATION, { influence: 2 }, {}, Rarity.COMMON, 'img/housing/wall_graffiti.png', 'housing-plots'));
equipmentDatabase.set('WALL002', new Equipment('WALL002', 'Framed Masterpiece', 'A touch of class and sophistication.', EquipmentType.WALL_DECORATION, { influence: 6 }, { level: 4 }, Rarity.UNCOMMON, 'img/housing/wall_painting.png', 'housing-plots'));
equipmentDatabase.set('WALL003', new Equipment('WALL003', 'Mounted Weapon Display', 'Showcases your favorite piece. Intimidating.', EquipmentType.WALL_DECORATION, { attack: 1, influence: 2 }, { level: 6 }, Rarity.RARE, 'img/housing/wall_weapon_rack.png', 'housing-plots'));
equipmentDatabase.set('WALL004', new Equipment('WALL004', 'Neon Sign', 'A flashy sign for your operation.', EquipmentType.WALL_DECORATION, { influence: 4 }, { level: 2 }, Rarity.UNCOMMON, 'img/housing/wall_neon.png', 'housing-plots')); // Added another Uncommon

// Weapon Stash (EquipmentType.WEAPON_STASH)
equipmentDatabase.set('WSTASH001', new Equipment('WSTASH001', 'Loose Floorboard', 'Simple hidden storage. Minimal security.', EquipmentType.WEAPON_STASH, { evasionRate: 1 }, {}, Rarity.COMMON, 'img/housing/stash_floorboard.png', 'housing-plots'));
equipmentDatabase.set('WSTASH002', new Equipment('WSTASH002', 'Reinforced Gun Locker', 'Secure storage for multiple weapons.', EquipmentType.WEAPON_STASH, { defence: 5 }, { level: 8 }, Rarity.RARE, 'img/housing/stash_locker.png', 'housing-plots'));
equipmentDatabase.set('WSTASH003', new Equipment('WSTASH003', 'Walk-in Vault', 'Maximum security for your arsenal and valuables.', EquipmentType.WEAPON_STASH, { defence: 15 }, { level: 14 }, Rarity.EPIC, 'img/housing/stash_vault.png', 'housing-plots')); // Added Epic option
equipmentDatabase.set('WSTASH004', new Equipment('WSTASH004', 'False Wall Compartment', 'Well-hidden storage, good for evasion.', EquipmentType.WEAPON_STASH, { evasionRate: 3, defence: 2 }, { level: 5 }, Rarity.UNCOMMON, 'img/housing/stash_false_wall.png', 'housing-plots')); // Added another Uncommon

// Luxury Furniture (EquipmentType.LUXURY_FURNITURE)
equipmentDatabase.set('FURN001', new Equipment('FURN001', 'Worn Leather Armchair', 'Seen better days, but still comfy.', EquipmentType.LUXURY_FURNITURE, { influence: 2 }, {}, Rarity.COMMON, 'img/housing/furn_armchair.png', 'housing-plots'));
equipmentDatabase.set('FURN002', new Equipment('FURN002', 'Mahogany Desk & Chair', 'A symbol of power and business.', EquipmentType.LUXURY_FURNITURE, { influence: 8 }, { level: 6 }, Rarity.UNCOMMON, 'img/housing/furn_desk.png', 'housing-plots'));
equipmentDatabase.set('FURN003', new Equipment('FURN003', 'Golden Throne', 'Ultimate status symbol. Commands respect.', EquipmentType.LUXURY_FURNITURE, { influence: 15 }, { level: 12 }, Rarity.EPIC, 'img/housing/furn_throne.png', 'housing-plots'));
equipmentDatabase.set('FURN004', new Equipment('FURN004', 'Plush Velvet Sofa', 'Expensive and comfortable seating.', EquipmentType.LUXURY_FURNITURE, { influence: 5 }, { level: 3 }, Rarity.UNCOMMON, 'img/housing/furn_sofa_velvet.png', 'housing-plots')); // Added another Uncommon

// Security System (EquipmentType.SECURITY_SYSTEM)
equipmentDatabase.set('SEC001', new Equipment('SEC001', 'Guard Dog Sign', 'Might deter casual intruders.', EquipmentType.SECURITY_SYSTEM, { defence: 1 }, {}, Rarity.COMMON, 'img/housing/sec_dog_sign.png', 'housing-plots'));
equipmentDatabase.set('SEC002', new Equipment('SEC002', 'CCTV Network', 'Monitors the premises, helps anticipate trouble.', EquipmentType.SECURITY_SYSTEM, { evasionRate: 2, defence: 2 }, { level: 5 }, Rarity.UNCOMMON, 'img/housing/sec_cameras.png', 'housing-plots'));
equipmentDatabase.set('SEC003', new Equipment('SEC003', 'Laser Grid Defense', 'Advanced perimeter defense. Hard to bypass.', EquipmentType.SECURITY_SYSTEM, { defence: 8, hitRate: 1 }, { level: 10 }, Rarity.RARE, 'img/housing/sec_lasers.png', 'housing-plots'));
equipmentDatabase.set('SEC004', new Equipment('SEC004', 'Pressure Plates', 'Detects intruders stepping in specific areas.', EquipmentType.SECURITY_SYSTEM, { defence: 4, criticalRate: 1 }, { level: 7 }, Rarity.RARE, 'img/housing/sec_pressure_plates.png', 'housing-plots')); // Added another Rare

// --- Plot Items (Placeholder Example) ---
// Assuming plots are also treated as 'Equipment' for inventory purposes
// Using a placeholder EquipmentType or null if plots don't have a specific slot
equipmentDatabase.set('PLOT001', new Equipment('PLOT001', 'Small Urban Plot', 'A small piece of land in the city.', null, {}, {}, Rarity.COMMON, 'img/plots/plot_small_urban.png', 'housing-plots'));
equipmentDatabase.set('PLOT002', new Equipment('PLOT002', 'Industrial Zone Plot', 'Land zoned for industrial use.', null, {}, { level: 5 }, Rarity.UNCOMMON, 'img/plots/plot_industrial.png', 'housing-plots'));

// --- Pet Items ---
equipmentDatabase.set('PET001', new Equipment('PET001', 'Guard Dog', 'A loyal canine companion. Offers some protection.', null, { defence: 3 }, { level: 5 }, Rarity.UNCOMMON, 'img/pets/guard_dog.png', 'pets'));
equipmentDatabase.set('PET002', new Equipment('PET002', 'Attack Cat', 'Surprisingly vicious feline. Good for intimidation.', null, { influence: 2, criticalRate: 1 }, { level: 3 }, Rarity.COMMON, 'img/pets/attack_cat.png', 'pets'));
equipmentDatabase.set('PET003', new Equipment('PET003', 'Carrier Pigeon', 'Useful for sending messages discreetly.', null, { agility: 1 }, {}, Rarity.COMMON, 'img/pets/pigeon.png', 'pets')); // Added a third pet

// --- Painting Items ---
equipmentDatabase.set('PAINT001', new Equipment('PAINT001', 'Abstract Canvas', 'A splash of color. Modern art.', null, { influence: 1 }, {}, Rarity.COMMON, 'img/paintings/abstract.png', 'painting'));
equipmentDatabase.set('PAINT002', new Equipment('PAINT002', 'Classical Portrait', 'A portrait of some old dignitary. Looks expensive.', null, { influence: 4 }, { level: 8 }, Rarity.RARE, 'img/paintings/portrait.png', 'painting'));
equipmentDatabase.set('PAINT003', new Equipment('PAINT003', 'Landscape Painting', 'A serene landscape scene.', null, { influence: 2 }, {}, Rarity.UNCOMMON, 'img/paintings/landscape.png', 'painting')); // Added a third painting


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
