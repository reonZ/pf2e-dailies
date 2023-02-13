export const WEAPON_GROUPS = {
    slashing: 'sword',
    piercing: 'spear',
    bludgeoning: 'club',
} as const

export const WEAPON_DAMAGE_TYPES = Object.keys(WEAPON_GROUPS) as WeaponDamageType[]

export const WEAPON_BASE_TYPES = {
    '0': { die: 'd4', traits: ['finesse', 'agile'], usage: 'held-in-one-hand' },
    '1': { die: 'd6', traits: ['finesse'], usage: 'held-in-one-hand' },
    '2': { die: 'd8', traits: [], usage: 'held-in-one-hand' },
    '3': { die: 'd10', traits: ['reach'], usage: 'held-in-two-hands' },
} as const
