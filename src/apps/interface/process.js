import { getActorMaxSlotRank } from '../../actor'
import { createUpdateCollection, utils } from '../../api'
import { familiarUUID, getFamiliarPack } from '../../data/familiar'
import { getRations } from '../../data/rations'
import {
    MODULE_ID,
    chatUUID,
    error,
    fakeChatUUID,
    getFlag,
    getSetting,
    hasLocalization,
    localize,
    subLocalize,
} from '../../module'
import { sluggify } from '../../pf2e/utils'
import { getBestSpellcastingEntry, getHighestSpellcastingEntrySort, getNotExpendedPreparedSpellSlot } from '../../spellcasting'

const REGEX_RANKS = ['cantrips?', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].join('|')

export async function processData() {
    const actor = this.actor
    const dailies = this.dailies
    const fields = getFields.call(this)
    const addItems = []
    const addRules = new Map()
    const [updateItems, updateItem] = createUpdateCollection()
    const flags = {}
    const msg = subLocalize('message')

    let addedSpells = false
    let message = ''

    const getRules = item => {
        const id = item.id
        const existing = addRules.get(id)
        if (existing) return existing

        const rules = deepClone(item._source.system.rules)

        for (let i = rules.length - 1; i >= 0; i--) {
            if (MODULE_ID in rules[i]) rules.splice(i, 1)
        }

        addRules.set(id, rules)
        return rules
    }

    const messages = {
        languages: { order: 80, messages: [] },
        skills: { order: 70, messages: [] },
        resistances: { order: 60, messages: [] },
        feats: { order: 50, messages: [] },
        spells: { order: 40, messages: [] },
        scrolls: { order: 30, messages: [] },
    }

    const messageObj = {
        add: (group, options) => {
            messages[group] ??= { order: 0, messages: [] }
            messages[group].messages.push(options)
        },
        addGroup: (group, order = 1, label) => {
            messages[group] ??= { label, order, messages: [] }
        },
    }

    if (actor.familiar && fields['dailies.familiar']) {
        const familiar = actor.familiar
        const pack = getFamiliarPack()
        const abilities = []

        // we remove old abilities
        const ids = familiar.itemTypes.action.map(item => item.id)
        if (ids.length) familiar.deleteEmbeddedDocuments('Item', ids)

        messageObj.addGroup('familiar', 20)

        for (const field of Object.values(fields['dailies.familiar'])) {
            const value = field.value
            const isCustom = value.includes('.')
            const item = await (isCustom ? fromUuid(value) : pack.getDocument(value))
            if (!item || !item.isOfType('action')) continue

            const source = item.toObject()
            if (source) {
                abilities.push(source)
                messageObj.add('familiar', { uuid: isCustom ? value : familiarUUID(value) })
            }
        }

        if (abilities.length) familiar.createEmbeddedDocuments('Item', abilities)
    }

    if (fields['dailies.rations']?.rations.value === 'true') {
        const rations = getRations(actor)

        if (rations?.uses.value) {
            const quantity = rations.quantity
            const { value, max } = rations.uses

            if (value <= 1) {
                if (quantity <= 1) {
                    rations.delete()
                } else {
                    updateItem({
                        _id: rations.id,
                        'system.quantity': Math.max(rations.quantity - 1, 0),
                        'system.charges.value': max,
                    })
                }
            } else {
                updateItem({
                    _id: rations.id,
                    'system.charges.value': Math.max(value - 1, 0),
                })
            }

            const remaining = (quantity - 1) * max + value
            const name = remaining <= 1 ? fakeChatUUID(rations.name) : chatUUID(rations.uuid)

            if (remaining <= 1) message += msg('rations.last', { name })
            else if (remaining <= 3) message += msg('rations.almost', { name, nb: remaining - 1 })
            else message += msg('rations.used', { name, nb: remaining - 1 })
        }
    }

    if (fields['dailies.staff']) {
        const staffField = fields['dailies.staff']
        const staffID = staffField.staffID.value
        const staff = actor.items.get(staffID)
        const makeshift = staffField.makeshift?.value === 'true'
        const maxStaffCharges = makeshift ? 0 : getActorMaxSlotRank(actor)

        if (staff && (maxStaffCharges || makeshift)) {
            const uuids = []

            let rankMatch
            const ranksRegex = new RegExp(
                `<strong>\\s*(?<rank>(?:${REGEX_RANKS}))\\s*<\/strong>.+?(?<uuids>@(?:UUID|Compendium)\[[a-zA-Z0-9-.]+\].+?)\n`,
                'gi'
            )
            while ((rankMatch = ranksRegex.exec(staff.description)) !== null) {
                const rank = parseInt(rankMatch.groups.rank.trim()) || 0

                let uuidMatch
                const uuidRegex = /@(?<protocole>UUID|Compendium)\[(?<uuid>[a-zA-Z0-9-.]+)\]/g
                while ((uuidMatch = uuidRegex.exec(rankMatch.groups.uuids)) !== null) {
                    let uuid = uuidMatch.groups.uuid
                    if (uuidMatch.groups.protocole === 'Compendium') {
                        if (!uuid.startsWith('Compendium.')) uuid = `Compendium.${uuid}`
                    }
                    uuids.push({ rank, uuid })
                }
            }

            if (uuids.length) {
                let overcharge = 0

                const expendedSpells = []
                const expendedSlots = makeshift ? [1, 2, 3] : [1]

                for (const i of expendedSlots) {
                    const expendField = staffField[`expend${i}`]
                    const spell = actor.items.get(expendField?.value)
                    const rank = expendField?.optionData.rank
                    const spellSlot = getNotExpendedPreparedSpellSlot(spell, rank)

                    if (spellSlot) {
                        const { entry, slotIndex } = spellSlot

                        overcharge += +rank

                        updateItem({ _id: entry.id, [`system.slots.slot${rank}.prepared.${slotIndex}.expended`]: true })

                        expendedSpells.push({
                            uuid: spell.uuid,
                            name: spell.name,
                            rank: rank,
                        })
                    }
                }

                const { ability, tradition, proficiency } = getBestSpellcastingEntry(actor) ?? {}

                const entrySource = {
                    type: 'spellcastingEntry',
                    name: staff.name,
                    sort: getSetting('staff-sort') === 'bottom' ? getHighestSpellcastingEntrySort(actor) + 10000 : -10000,
                    system: {
                        ability,
                        prepared: { value: 'charge' },
                        showSlotlessLevels: { value: false },
                        showUnpreparedSpells: { value: false },
                        proficiency,
                        tradition,
                    },
                    flags: {
                        [MODULE_ID]: {
                            type: 'staff',
                            staff: {
                                charges: maxStaffCharges + overcharge,
                                staveID: staffID,
                                overcharge,
                                makeshift,
                            },
                        },
                    },
                }

                addItems.push(entrySource)

                await Promise.all(
                    uuids.map(async ({ rank, uuid }) => {
                        const source = await utils.createSpellSource(uuid)
                        setProperty(source, `flags.${MODULE_ID}.entry`, { level: rank, type: 'staff' })
                        addItems.push(source)
                    })
                )

                messageObj.addGroup(
                    'staff',
                    45,
                    localize(`staves.message.${overcharge ? 'withExpend' : 'noExpend'}`, {
                        makeshift: makeshift ? localize('staves.makeshift') : '',
                    })
                )
                messageObj.add('staff', { uuid: staff.uuid })
                for (const { uuid, name, rank } of expendedSpells) {
                    messageObj.add('staff', {
                        uuid,
                        label: `${name} (${utils.spellRankLabel(rank)})`,
                    })
                }
            }
        }
    }

    for (const { item, key, process } of dailies) {
        if (!fields[key]) continue

        const dailyArgs = this.dailyArgs[key]

        try {
            await process({
                ...dailyArgs,
                fields: fields[key],
                messages: messageObj,
                addItem: source => addItems.push(source),
                updateItem,
                addRule: (source, parent) => {
                    source[MODULE_ID] = true
                    getRules(parent ?? item).push(source)
                },
                addFeat: (source, parent) => {
                    parent ??= item
                    if (parent.isOfType('feat')) {
                        const parentId = parent.id
                        setProperty(source, 'flags.pf2e.grantedBy', { id: parentId, onDelete: 'cascade' })
                        setProperty(source, `flags.${MODULE_ID}.grantedBy`, parentId)
                    }
                    addItems.push(source)
                },
                addSpell: (source, level) => {
                    setProperty(source, `flags.${MODULE_ID}.entry`, { level: level, type: 'fallback' })
                    addItems.push(source)
                    addedSpells = true
                },
            })
        } catch (err) {
            error('error.unexpected')
            console.error(err)
            console.error(`The error occured during processing of ${key}`)
        }
    }

    for (const [key, rowFields] of Object.entries(fields)) {
        const rows = this.rows[key]
        if (!rows) continue

        for (const { row, type, input, value, uuid } of Object.values(rowFields)) {
            if (type === 'random' || rows[row]?.save === false) continue

            const flag = (flags[key] ??= {})

            if (type === 'combo') {
                flag[row] = { input: input === 'true', selected: value }
            } else if (type === 'drop') {
                flag[row] = { uuid: uuid, name: value }
            } else {
                flag[row] = value
            }
        }
    }

    for (const [id, rules] of addRules) {
        updateItem({ _id: id, 'system.rules': rules })
    }

    if (addedSpells) {
        const entrySource = {
            type: 'spellcastingEntry',
            name: localize('spellEntry.name'),
            system: {
                prepared: { value: 'innate' },
                showSlotlessLevels: { value: false },
                showUnpreparedSpells: { value: false },
                proficiency: { value: 1, slug: actor.classDC?.slug || actor.class?.slug || undefined },
            },
            flags: {
                [MODULE_ID]: {
                    type: 'fallback',
                },
            },
        }
        addItems.push(entrySource)
    }

    for (const source of addItems) {
        const alreadyTemp = getProperty(source, 'system.temporary') === true
        if (!alreadyTemp) setProperty(source, `flags.${MODULE_ID}.temporary`, true)
    }

    if (addItems.length) {
        const items = await actor.createEmbeddedDocuments('Item', addItems)

        for (const item of items) {
            if (item.isOfType('feat')) {
                // we add itemGrants flag to the parent feat to have the cascade effect in the tab
                const parentId = getFlag(item, 'grantedBy')
                if (parentId) {
                    const slug = sluggify(item.name, { camel: 'dromedary' })
                    const path = `flags.pf2e.itemGrants.${slug}`
                    updateItem({ _id: parentId, [path]: { id: item.id, onDelete: 'detach' } })
                }
            } else if (item.isOfType('spellcastingEntry')) {
                // we add all the newly created spells with 'addSpell' to this spellcasting entry
                const entryType = getFlag(item, 'type')
                const spells = items.filter(item => item.isOfType('spell') && getFlag(item, 'entry')?.type === entryType)
                for (const spell of spells) {
                    const { level } = getFlag(spell, 'entry')
                    const data = { _id: spell.id, 'system.location.value': item.id }
                    if (level !== undefined) data['system.location.heightenedLevel'] = level
                    updateItem(data)
                }
            }
        }
    }

    await actor.update({ [`flags.${MODULE_ID}`]: { ...expandObject(flags), rested: false } })

    if (updateItems.size) await actor.updateEmbeddedDocuments('Item', updateItems.contents)

    message = parseMessages(messages, message)
    message = message ? `${msg('changes')}<hr />${message}` : msg('noChanges')
    ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) })
}

function parseMessages(messages, message) {
    const msg = subLocalize('message')

    const messageList = Object.entries(messages).map(([type, options]) => {
        options.label ??= msg.has(type) ? msg(type) : msg('gained', { type })
        return options
    })
    messageList.sort((a, b) => b.order - a.order)

    for (const { label, messages } of messageList) {
        if (!messages.length) continue

        if (message) message += '<hr />'

        if (label) message += `<p><strong>${label}</strong></p>`

        for (let { uuid, selected, label, random } of messages) {
            const key = `label.${label}`
            label = label && hasLocalization(key) ? localize(key) : label || ''

            message += '<p>'
            message += uuid ? `${chatUUID(uuid, label)}` : `<strong>${label}</strong>`
            if (selected) message += ` <span>${selected}</span>`
            if (random) message += ' <i class="fa-solid fa-dice-d20"></i>'
            message += '</p>'
        }
    }

    return message
}

function getFields() {
    const elements = this.element.find('.window-content .content').find('input:not(.alert), select[data-type]').toArray()

    const fields = {}

    for (const element of elements) {
        const field = {
            ...element.dataset,
            value: element.value,
        }

        if (field.type === 'combo' && field.input === 'false') {
            const select = element.previousElementSibling
            field.value = select.value
            field.optionData = select.selectedOptions[0].dataset
        }

        if (field.type === 'select') {
            field.optionData = element.selectedOptions[0].dataset
        }

        fields[field.daily] ??= {}
        fields[field.daily][field.row] = field
    }

    return fields
}
