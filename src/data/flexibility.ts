type FlexibilityRow = 'flexibility' | 'improved'
type FlexibilityChild = 'improved'
type FlexibilityGenerics = [FlexibilityRow, {}, FlexibilityChild]

export const combatFlexibility: Daily<FlexibilityGenerics> = {
    key: 'flexibility',
    item: {
        uuid: 'Compendium.pf2e.classfeatures.Item.8g6HzARbhfcgilP8', // Combat Flexibility
    },
    children: [
        {
            slug: 'improved',
            uuid: 'Compendium.pf2e.classfeatures.Item.W2rwudMNcAxs8VoX', // Improved Flexibility
        },
    ],
    rows: [
        createRow('flexibility', 8), //
        createRow('improved', 14, 'improved'),
    ],
    process: async ({ utils, fields, addFeat, messages, children }) => {
        const uuid = fields.flexibility.uuid!
        const source = await utils.createFeatSource(uuid)
        addFeat(source)
        messages.add('feats', { uuid })

        if (children.improved) {
            const uuid = fields.improved.uuid!
            const source = await utils.createFeatSource(uuid)
            addFeat(source, children.improved)
            messages.add('feats', { uuid })
        }
    },
}

function createRow(slug: FlexibilityRow, level: number, child?: FlexibilityChild) {
    const row: DailyRowDrop<FlexibilityGenerics> = {
        type: 'drop',
        label: `PF2E.Level${level}`,
        slug,
        filter: {
            type: 'feat',
            search: {
                category: ['class'],
                traits: ['fighter'],
                level,
            },
        },
    }
    if (child) row.childPredicate = [child]
    return row
}
