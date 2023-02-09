import { getFlag } from '@utils/foundry/flags'
import { sluggify } from '@utils/pf2e/utils'
import { getRuleItems, isRuleItem } from './categories'

export function wrapRestForTheNight() {
    const original = game.pf2e.actions.restForTheNight
    game.pf2e.actions.restForTheNight = async (options: ActionDefaultOptions) => {
        const result = await original(options)
        if (result.length && options.actors) afterRest(options.actors)
        return result
    }
}

async function afterRest(actors: ActorPF2e | ActorPF2e[]) {
    actors = Array.isArray(actors) ? actors : [actors]

    const characters = actors.filter(x => x.isOfType('character')) as CharacterPF2e[]
    for (const actor of characters) {
        const update: EmbeddedDocumentUpdateData<ItemPF2e>[] = []
        const remove: string[] = []

        const cleanRuleItem = (item: ItemPF2e) => {
            const rules = deepClone(item._source.system.rules)
            const ruleIndex = rules.findIndex(x => 'pf2e-dailies' in x)
            if (ruleIndex >= 0) {
                rules.splice(ruleIndex, 1)
                update.push({ _id: item.id, 'system.rules': rules })
            }
        }

        for (const item of actor.itemTypes.feat) {
            if (isRuleItem(item)) cleanRuleItem(item)

            if (getFlag(item, 'temporary')) {
                const parentId = item.getFlag<string>('pf2e', 'grantedBy.id')
                if (parentId) {
                    const slug = sluggify(item.name, { camel: 'dromedary' })
                    const path = `flags.pf2e.itemGrants.-=${slug}`
                    update.push({ _id: parentId, [path]: true })
                }
                remove.push(item.id)
            }
        }

        for (const item of actor.itemTypes.equipment) {
            if (isRuleItem(item)) cleanRuleItem(item)
        }

        if (update.length) actor.updateEmbeddedDocuments('Item', update)
        if (remove.length) actor.deleteEmbeddedDocuments('Item', remove)
    }
}
