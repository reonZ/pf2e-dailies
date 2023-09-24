const effectUUID = 'Compendium.pf2e.feat-effects.Item.jO7wMhnjT7yoAtQg'

export const rootMagic = {
    key: 'root',
    item: {
        uuid: 'Compendium.pf2e.feats-srd.Item.22P7IFyhrF7Fbw8B',
    },
    rows: [
        {
            type: 'select',
            slug: 'target',
            options: ({ actor, utils }) => {
                const actors = utils.getPlayersActors(actor)
                return actors.map(a => ({ value: a.id, label: a.name }))
            },
        },
    ],
    process: ({ fields, messages }) => {
        const actorId = fields.target.value
        const actor = game.actors.get(actorId)
        if (!actor) return
        messages.addGroup('root')
        messages.add('root', { uuid: effectUUID, selected: actor.name })
    },
}
