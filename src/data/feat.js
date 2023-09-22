export function createFeatDaily(key, uuid, filter = {}, label) {
    const daily = {
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
        process: async ({ utils, fields, addFeat, messages }) => {
            const uuid = fields.feat.uuid
            const source = await utils.createFeatSource(uuid)
            addFeat(source)
            messages.add('feats', { uuid })
        },
    }
    return daily
}
