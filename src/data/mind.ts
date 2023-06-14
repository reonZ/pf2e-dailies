import { MODULE_ID } from '@src/main'
import { localize, subLocalize } from '@utils/foundry/localize'
import { getFlag } from '@utils/foundry/flags'

type MindRow = 'alert' | 'smith' | 'mental' | 'runic' | 'advanced'
type MindChild = 'weapon' | 'mental' | 'runic' | 'advanced'
type MindGenerics = [MindRow, {}, MindChild]

const MIND_WEAPON_UUID = 'Compendium.pf2e-dailies.equipment.VpmEozw21aRxX15P'

const WEAPON_BASE_TYPES = {
    '0': { die: 'd4', traits: ['finesse', 'agile'], usage: 'held-in-one-hand' },
    '1': { die: 'd6', traits: ['finesse'], usage: 'held-in-one-hand' },
    '2': { die: 'd8', traits: [], usage: 'held-in-one-hand' },
    '3': { die: 'd10', traits: ['reach'], usage: 'held-in-two-hands' },
}

const WEAPON_GROUPS = {
    slashing: 'sword',
    piercing: 'spear',
    bludgeoning: 'club',
} as Record<WeaponDamageType, string>

const WEAPON_TRAITS = ['grapple', 'nonlethal', 'shove', 'trip', 'modular']

const WEAPON_DAMAGE_TYPES = Object.keys(WEAPON_GROUPS)

const WEAPON_RUNES = ['corrosive', 'disrupting', 'flaming', 'frost', 'shock', 'thundering']

const WEAPON_GREATER_RUNES = [
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
]

export const mindSmith: Daily<MindGenerics> = {
    key: 'mindsmith',
    item: {
        uuid: 'Compendium.pf2e.feats-srd.Item.juikoiIA0Jy8PboY', // Mind Smith Dedication
    },
    children: [
        {
            slug: 'weapon',
            uuid: MIND_WEAPON_UUID, // Mind Weapon
        },
        {
            slug: 'mental',
            uuid: 'Compendium.pf2e.feats-srd.Item.PccekOihIbRWdDky', // Malleable Mental Forge
        },
        {
            slug: 'runic',
            uuid: 'Compendium.pf2e.feats-srd.Item.2uQbQgz1AbjzcFSp', // Runic Mind Smithing
        },
        {
            slug: 'advanced',
            uuid: 'Compendium.pf2e.feats-srd.Item.fgnfXwFcn9jZlXGD', // Advanced Runic Mind Smithing
        },
    ],
    rows: [
        {
            type: 'alert',
            slug: 'alert',
            message: () => localize('interface.alert.weapon'),
            fix,
            childPredicate: [{ not: 'weapon' }],
        },
        {
            type: 'select',
            slug: 'smith',
            label: () => localize('label.mindsmith'),
            options: WEAPON_DAMAGE_TYPES,
            labelizer: ({ utils }) => utils.damageLabel,
            childPredicate: ['weapon'],
        },
        {
            type: 'select',
            slug: 'mental',
            label: () => localize('label.mentalforge'),
            options: WEAPON_TRAITS,
            labelizer: ({ utils }) => utils.weaponTraitLabel,
            childPredicate: ['weapon', 'mental'],
        },
        {
            type: 'select',
            slug: 'runic',
            label: () => localize('label.runicmind'),
            options: WEAPON_RUNES,
            labelizer: ({ utils }) => utils.weaponPropertyRunesLabel,
            childPredicate: ['weapon', 'runic', { not: 'advanced' }],
            condition: ({ children, utils }) => utils.hasFreePropertySlot(children.weapon as WeaponPF2e),
        },
        {
            type: 'select',
            slug: 'advanced',
            label: () => localize('label.runicmind'),
            options: WEAPON_GREATER_RUNES,
            labelizer: ({ utils }) => utils.weaponPropertyRunesLabel,
            childPredicate: ['weapon', 'advanced'],
            condition: ({ children, utils }) => utils.hasFreePropertySlot(children.weapon as WeaponPF2e),
        },
    ],
    process: ({ children, updateItem, fields, messages, item, utils }) => {
        const weapon = children.weapon as WeaponPF2e | undefined
        if (!weapon) return

        messages.addGroup('mindsmith')

        const selected = fields.smith.value as WeaponDamageType
        updateItem({ _id: weapon.id, 'system.damage.damageType': selected, 'system.group': WEAPON_GROUPS[selected] })
        messages.add('mindsmith', { selected: utils.damageLabel(selected), uuid: item.uuid, label: 'mindsmith' })

        if (children.mental) {
            const selected = fields.mental.value as WeaponTrait
            const traits = deepClone(weapon._source.system.traits?.value ?? [])
            if (!traits.includes(selected)) traits.push(selected)
            updateItem({ _id: weapon.id, 'system.traits.value': traits })
            messages.add('mindsmith', {
                selected: utils.weaponTraitLabel(selected),
                uuid: children.mental.uuid,
                label: 'mentalforge',
            })
        }

        if ((children.advanced || children.runic) && utils.hasFreePropertySlot(weapon)) {
            const child = (children.advanced ?? children.runic) as ItemPF2e
            const freeSlot = utils.getFreePropertyRuneSlot(weapon)
            const field = fields.advanced ?? fields.runic
            const selected = field.value as WeaponPropertyRuneType

            if (freeSlot && !weapon.system.runes.property.includes(selected)) {
                updateItem({ _id: weapon.id, [`system.${freeSlot}.value`]: selected, [`flags.${MODULE_ID}.runeSlot`]: freeSlot })
                messages.add('mindsmith', {
                    selected: utils.weaponPropertyRunesLabel(selected),
                    uuid: child.uuid,
                    label: 'runicmind',
                })
            }
        }
    },
    rest: ({ item, sourceId, updateItem }) => {
        if (sourceId !== MIND_WEAPON_UUID) return

        let traits = item._source.system.traits?.value ?? []
        traits = traits.filter(trait => !WEAPON_TRAITS.includes(trait))
        updateItem({ _id: item.id, 'system.traits.value': traits })

        const runeSlot = getFlag<string>(item, 'runeSlot')
        if (runeSlot) {
            updateItem({ _id: item.id, [`system.${runeSlot}.value`]: null, [`flags.${MODULE_ID}.-=runeSlot`]: true })
        }
    },
}

async function fix({ actor }: DailyValueArgs<MindGenerics>) {
    const localize = subLocalize('dialog.weapon')

    let content = localize('flavor')

    for (const key of ['0', '1', '2', '3']) {
        const label = localize(`option.${key}`)
        content += `<label><input type="radio" name="type" value="${key}">${label}</label>`
    }

    const weapon = await Dialog.wait(
        {
            title: localize('title'),
            content,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-save"></i>',
                    label: localize('accept'),
                    callback: onWeaponSelected,
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: localize('cancel'),
                    callback: () => null,
                },
            },
            close: () => null,
        },
        {},
        { id: 'pf2e-dailies-weapon', width: 600 }
    )

    if (weapon) {
        await actor.createEmbeddedDocuments('Item', [weapon])
        return true
    }

    return false
}

async function onWeaponSelected(html: JQuery) {
    const localize = subLocalize('dialog.weapon')

    const selection = html.find('[name=type]:checked').val() as keyof typeof WEAPON_BASE_TYPES
    if (!selection) {
        localize.warn('error.noSelection')
        return
    }

    const weapon = (await fromUuid<WeaponPF2e>(MIND_WEAPON_UUID))?.toObject()
    if (!weapon) {
        localize.warn('error.missing')
        return
    }

    const stats = WEAPON_BASE_TYPES[selection]

    setProperty(weapon, 'system.damage.die', stats.die)
    setProperty(weapon, 'system.traits.value', stats.traits.slice())
    setProperty(weapon, 'system.usage.value', stats.usage)

    return weapon
}
