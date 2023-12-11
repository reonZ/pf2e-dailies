import { utils } from './api'
import { MODULE_ID, getSpellcastingEntryStaffData, localize, templatePath, warn } from './module'

export async function onSpellcastingEntryCast(wrapped, ...args) {
    const staffData = getSpellcastingEntryStaffData(this)
    if (!staffData) return wrapped(...args)

    const actor = this.actor
    const staff = actor.items.get(staffData.staveID)
    if (!staff?.isEquipped) {
        warn('staves.noStaff')
        return
    }

    const [spell, { level }] = args
    const castRank = spell.computeCastRank(level)

    if (!level || level === '0') {
        return spell.toMessage(undefined, { data: { castLevel: castRank } })
    }

    if (staffData.charges < 1 || (staffData.charges < castRank && staffData.overcharge)) {
        warn('staves.noCharge')
        return
    }

    let updates = []

    if (!staffData.overcharge) {
        const spontaneousEntries = actor.spellcasting.filter(
            entry => entry.isSpontaneous && entry.system.slots[`slot${castRank}`].value
        )

        let useSpontaneous = false

        const entryRankValue = entry => entry.system.slots[`slot${castRank}`].value

        if (spontaneousEntries.length === 1) {
            const entry = spontaneousEntries[0]

            const content = localize('staves.spontaneous.one', {
                rank: utils.spellRankLabel(castRank),
                entry: entry.name,
                remaining: entryRankValue(entry),
            })

            useSpontaneous = await Dialog.confirm({
                title: localize('staves.spontaneous.title'),
                defaultYes: false,
                content: `<div class="pf2e-dailies-spontaneous">${content}</div>`,
            })

            if (useSpontaneous) useSpontaneous = 0
        } else if (spontaneousEntries.length > 1) {
            const entries = spontaneousEntries.map((entry, index) => ({
                index,
                name: entry.name,
                remaining: entryRankValue(entry),
            }))

            const content = await renderTemplate(templatePath('staves-spontaneous.hbs'), {
                entries,
                castRank: utils.spellRankLabel(castRank),
                i18n: (key, { hash }) => localize(`staves.spontaneous.${key}`, hash),
            })

            useSpontaneous = await Dialog.wait({
                title: localize('staves.spontaneous.title'),
                content,
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize('Yes'),
                        callback: html => html.find('input[name=entry]:checked').val(),
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('No'),
                        callback: () => false,
                    },
                },
                close: () => null,
            })
        }

        if (useSpontaneous === null) {
            return
        } else if (useSpontaneous !== false) {
            const entry = spontaneousEntries[useSpontaneous]
            const current = entry.system.slots[`slot${castRank}`].value

            updates.push({ _id: entry.id, [`system.slots.slot${castRank}.value`]: current - 1 })

            staffData.charges -= 1
        }
    }

    if (!updates.length) {
        if (staffData.charges < castRank) {
            warn('staves.noCharge')
            return
        }

        staffData.charges -= castRank
    }

    updates.push({ _id: this.id, [`flags.${MODULE_ID}.staff`]: staffData })

    await actor.updateEmbeddedDocuments('Item', updates)
    await spell.toMessage(undefined, { data: { castLevel: castRank } })
}
