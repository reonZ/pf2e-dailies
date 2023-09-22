import { getDailyFromSourceId } from './dailies'
import { MODULE_ID, getFlag, getSourceId, setFlag } from './module'
import { sluggify } from './pf2e/sluggify'

export async function restForTheNight(actor) {
    const update = []
    const remove = []

    for (const item of actor.items) {
        if (getFlag(item, 'temporary')) {
            remove.push(item.id)

            // we remove the itemGrants flag from the parent feat
            if (item.isOfType('feat')) {
                const parentId = getFlag(item, 'grantedBy')
                if (parentId) {
                    const slug = sluggify(item.name, { camel: 'dromedary' })
                    const path = `flags.pf2e.itemGrants.-=${slug}`
                    update.push({ _id: parentId, [path]: true })
                }
            }

            // we don't need to do more work because the item is being deleted
            continue
        }

        const sourceId = getSourceId(item)

        // We run the daily rest function if it exists
        if (sourceId) {
            const daily = getDailyFromSourceId(sourceId)
            if (daily?.rest) {
                await daily.rest({ item, sourceId, updateItem: data => update.push(data) })
            }
        }

        // we clean temporary rule elements
        const rules = deepClone(item._source.system.rules)
        let modifiedRules = false
        for (let i = rules.length - 1; i >= 0; i--) {
            if (MODULE_ID in rules[i]) {
                rules.splice(i, 1)
                modifiedRules = true
            }
        }
        if (modifiedRules) update.push({ _id: item.id, 'system.rules': rules })
    }

    if (update.length) await actor.updateEmbeddedDocuments('Item', update)
    if (remove.length) await actor.deleteEmbeddedDocuments('Item', remove)

    await setFlag(actor, 'rested', true)
}
