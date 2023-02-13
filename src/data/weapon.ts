export const WEAPON_GROUPS = {
    slashing: 'sword',
    piercing: 'spear',
    bludgeoning: 'club',
} as const

export const WEAPON_DAMAGE_TYPES = Object.keys(WEAPON_GROUPS) as MindSmithDamageType[]

export const WEAPON_BASE_TYPES = {
    '0': { die: 'd4', traits: ['finesse', 'agile'], usage: 'held-in-one-hand' },
    '1': { die: 'd6', traits: ['finesse'], usage: 'held-in-one-hand' },
    '2': { die: 'd8', traits: [], usage: 'held-in-one-hand' },
    '3': { die: 'd10', traits: ['reach'], usage: 'held-in-two-hands' },
} as const

export const WEAPON_TRAITS = ['grapple', 'nonlethal', 'shove', 'trip', 'modular'] as const

export const WEAPON_RUNES = ['corrosive', 'disrupting', 'flaming', 'frost', 'shock', 'thundering'] as const

export const WEAPON_GREATER_RUNES = [
    'anarchic',
    'axiomatic',
    'greaterCorrosive',
    'greaterDisrupting',
    'greaterFlaming',
    'greaterFrost',
    'greaterShock',
    'greaterThundering',
    'holy',
    'unholy',
] as const

export const RUNE_PROPERTY_KEYS = ['propertyRune1', 'propertyRune2', 'propertyRune3', 'propertyRune4'] as const

export function getFreePropertySlot(
    weapon: WeaponPF2e
): null | 'propertyRune1' | 'propertyRune2' | 'propertyRune3' | 'propertyRune4' {
    const potency = weapon.system.potencyRune.value
    if (potency === null) return null

    for (let i = 0; i < potency; i++) {
        const property = RUNE_PROPERTY_KEYS[i]
        if (!weapon.system[property].value) return property
    }

    return null
}

export function runetoLabel(rune: MindSmithWeaponAllRunes | '') {
    return rune.replace('greater', 'greater ') as MindSmithWeaponAllRunes
}

export function labelToRune(label: string) {
    return label.replace('greater ', 'greater') as MindSmithWeaponAllRunes
}
