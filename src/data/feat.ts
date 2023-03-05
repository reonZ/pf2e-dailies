type FeatGenerics = ['feat', {}, '']

export function createFeatDaily(key: string, uuid: ItemUUID, filter: DailyFeatFilter = {}, label?: string) {
    const daily: Daily<FeatGenerics> = {
        key,
        label,
        item: {
            uuid,
        },
        rows: [
            {
                type: 'drop',
                slug: 'feat',
                filter: {
                    type: 'feat',
                    search: filter,
                },
            },
        ],
        process: async ({ utils, fields, addFeat, messages }: DailyProcessFunctionArgs<FeatGenerics>) => {
            const uuid = fields.feat.uuid!
            const source = await utils.createFeatSource(uuid)
            addFeat(source)
            messages.add('feats', { uuid })
        },
    }
    return daily
}
