type TomeRow = 'first' | 'second'
type TomeChild = 'adept' | 'second' | 'intense' | 'paragon'
type TomeCustom = Record<TomeRow, { rank: OneToFour; options: string[] }>
type TomeGenerics = [TomeRow, TomeCustom, TomeChild]

export const thaumaturgeTome: Daily<TomeGenerics> = {
    key: 'tome',
    item: {
        uuid: 'Compendium.pf2e.classfeatures.Item.MyN1cQgE0HsLF20e', // Tome
    },
    children: [
        {
            slug: 'adept',
            uuid: 'Compendium.pf2e.classfeatures.Item.Obm4ItMIIr0whYeO', // Implement Adept
            condition: createChildCondition('adept'),
        },
        {
            slug: 'second',
            uuid: 'Compendium.pf2e.classfeatures.Item.ZEUxZ4Ta1kDPHiq5', // Second Adept
            condition: createChildCondition('adept'),
        },
        {
            slug: 'intense',
            uuid: 'Compendium.pf2e.feats-srd.Item.yRRM1dsY6jakEMaC', // Intense Implement
        },
        {
            slug: 'paragon',
            uuid: 'Compendium.pf2e.classfeatures.Item.QEtgbY8N2V4wTbsI', // Implement Paragon
            condition: createChildCondition('paragon'),
        },
    ],
    prepare: ({ utils, actor, children }) => {
        const skillNames = utils.skillNames
        const actorLevel = actor.level
        const actorSkills = actor.skills as Record<SkillLongForm, { rank: ZeroToFour }>

        const custom: TomeCustom = {
            first: { options: [], rank: 1 },
            second: { options: [], rank: 1 },
        }

        // Implement Paragon
        if (children.paragon) {
            const skills = skillNames.filter(x => actorSkills[x].rank < 4)
            custom.first = { rank: 4, options: skills }
            custom.second = { rank: 4, options: skills }
        }
        // Intense Implement or Second Adept or Implement Adept
        else if (children.intense || children.adept || children.second) {
            const masters = skillNames.filter(x => actorSkills[x].rank < 3)

            if (actorLevel >= 9) {
                custom.first = { rank: 3, options: masters }
                custom.second = { rank: 3, options: masters }
            } else {
                const experts = skillNames.filter(x => actorSkills[x].rank < 2)
                custom.first = { rank: 2, options: experts }
                custom.second = { rank: 3, options: masters }
            }
        }
        // Tome
        else {
            if (actorLevel >= 5) {
                const experts = skillNames.filter(x => actorSkills[x].rank < 2)
                custom.first = { rank: 2, options: experts }
                custom.second = { rank: 2, options: experts }
            } else if (actorLevel >= 3) {
                const trained = skillNames.filter(x => actorSkills[x].rank < 1)
                const experts = skillNames.filter(x => actorSkills[x].rank < 2)
                custom.first = { rank: 1, options: trained }
                custom.second = { rank: 2, options: experts }
            } else {
                const trained = skillNames.filter(x => actorSkills[x].rank < 1)
                custom.first = { rank: 1, options: trained }
                custom.second = { rank: 1, options: trained }
            }
        }

        return custom
    },
    rows: (['first', 'second'] as const).map(rowName => {
        const row: DailyRow<TomeGenerics> = {
            type: 'combo',
            slug: rowName,
            label: ({ custom, utils }) => utils.proficiencyLabel(custom[rowName].rank),
            options: ({ custom }) => custom[rowName].options,
            labelizer: ({ utils }) => utils.skillLabel,
        }
        return row
    }),
    process: ({ custom, fields, utils, messages, addItem, addRule }) => {
        messages.addGroup('tome', 65)

        for (const rowName of ['first', 'second'] as const) {
            const rank = custom[rowName].rank
            let value = fields[rowName].value

            if (fields[rowName].input === 'true') {
                const source = utils.createLoreSource({ name: value, rank })
                addItem(source)
            } else {
                const source = utils.createSkillRuleElement({ skill: value, value: rank })
                value = utils.skillLabel(value)
                addRule(source)
            }

            messages.add('tome', { label: utils.proficiencyLabel(rank), selected: value })
        }
    },
}

function createChildCondition(option: 'adept' | 'paragon') {
    return function ({ item, utils }: BaseDailyValueArgs<TomeGenerics>) {
        return utils.getChoiSetRuleSelection(item, option) === 'tome'
    }
}
