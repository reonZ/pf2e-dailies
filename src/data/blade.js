import { localize } from '../module'

export const bladeAlly = {
    key: 'blade',
    item: {
        uuid: 'Compendium.pf2e.classfeatures.Item.EtltLdiy9kNfHU0c', // Blade Ally
    },
    children: [
        {
            slug: 'good',
            uuid: 'Compendium.pf2e.classfeatures.Item.nxZYP3KGfTSkaW6J', // The Tenets of Good
        },
        {
            slug: 'evil',
            uuid: 'Compendium.pf2e.classfeatures.Item.JiY2ZB4FkK8RJm4T', // The Tenets of Evil
        },
        {
            slug: 'liberator',
            uuid: 'Compendium.pf2e.classfeatures.Item.FCoMFUsth4xB4veC', // Liberator
        },
        {
            slug: 'paladin',
            uuid: 'Compendium.pf2e.classfeatures.Item.peEXunfbSD8WcMFk', // paladin
        },
        {
            slug: 'antipaladin',
            uuid: 'Compendium.pf2e.classfeatures.Item.EQ6DVIQHAUXUhY6Y', // Antipaladin
        },
        {
            slug: 'tyrant',
            uuid: 'Compendium.pf2e.classfeatures.Item.HiIvez0TqESbleB5', // Tyrant
        },
        {
            slug: 'spirit',
            uuid: 'Compendium.pf2e.feats-srd.Item.h5ksUZlrVGBjq6p4', // Radiant Blade Spirit
        },
        {
            slug: 'master',
            uuid: 'Compendium.pf2e.feats-srd.Item.jYEMVfrXJLpXS6aC', // Radiant Blade Master
        },
    ],
    rows: [
        {
            type: 'select',
            slug: 'weapon',
            label: () => localize('label.blade.weapon'),
            options: ({ actor }) => {
                return actor.itemTypes.weapon
                    .filter(weapon => !weapon.isAlchemical)
                    .map(weapon => ({ value: weapon.id, label: weapon.name }))
            },
        },
        {
            type: 'select',
            slug: 'rune',
            label: () => localize('label.blade.rune'),
            options: ({ children }) => {
                const runes = ['returning', 'shifting']

                const { antipaladin, evil, good, liberator, master, paladin, spirit, tyrant } = children

                if (spirit) {
                    runes.push('flaming')
                    if (good) runes.push('holy')
                    if (evil) runes.push('unholy')
                    if (liberator || antipaladin) runes.push('anarchic')
                    if (paladin || tyrant) runes.push('axiomatic')
                }

                if (good) runes.push('disrupting', 'ghost-touch')
                if (master) runes.push('greater-disrupting', 'keen')
                if (evil) runes.push('fearsome')

                return runes
                    .map(value => ({
                        value,
                        label: localizeRune(value),
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label))
            },
        },
    ],
    process: async ({ actor, fields, addRule, messages, updateItem }) => {
        const weaponId = fields.weapon.value
        const rune = fields.rune.value

        const weapon = actor.items.get(weaponId)
        if (!weapon) return

        addRule(
            {
                definition: [`item:id:${weaponId}`],
                key: 'AdjustStrike',
                mode: 'add',
                property: 'property-runes',
                value: rune,
            },
            weapon
        )

        addRule(
            {
                key: 'CriticalSpecialization',
                predicate: [
                    {
                        or: [`item:category:${weapon.category}`, `item:id:${weaponId}`],
                    },
                ],
            },
            weapon
        )

        const name = weapon.name !== weapon._source.name ? `... ${weapon._source.name}` : weapon.name

        messages.addGroup('blade')
        messages.add('blade', {
            uuid: weapon.uuid,
            label: name,
            selected: localizeRune(rune),
        })
    },
}

function localizeRune(value) {
    const slugged = value.replace(/-\w/, match => match[1].toUpperCase())
    return game.i18n.localize(`PF2E.WeaponPropertyRune.${slugged}.Name`)
}
