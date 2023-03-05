import { DailiesInterface } from '@apps/interface'
import { familiarUUID, getFamiliarPack } from '@data/familiar'
import { getRations } from '@data/rations'
import { MODULE_ID } from '@src/main'
import { getFlag } from '@utils/foundry/flags'
import { hasLocalization, localize, subLocalize } from '@utils/foundry/localize'
import { error } from '@utils/foundry/notification'
import { chatUUID, fakeChatUUID } from '@utils/foundry/uuid'
import { sluggify } from '@utils/pf2e/utils'

export async function processData(this: DailiesInterface) {
    const actor = this.actor
    const dailies = this.dailies
    const fields = getFields.call(this)
    const addItems: DeepPartial<BaseItemSourcePF2e>[] = []
    const addRules: Map<string, DailyRuleSource[]> = new Map()
    const updateItems: EmbeddedDocumentUpdateData<ItemPF2e>[] = []
    const flags: Record<string, DailySaved> = {}
    const msg = subLocalize('message')

    let addedSpells: boolean = false
    let message = ''

    const getRules = (item: ItemPF2e) => {
        const id = item.id
        const existing = addRules.get(id)
        if (existing) return existing

        const rules = deepClone(item._source.system.rules)

        for (let i = rules.length - 1; i >= 0; i--) {
            if (MODULE_ID in rules[i]!) rules.splice(i, 1)
        }

        addRules.set(id, rules)
        return rules
    }

    const messages: DailyMessageGroups = {
        languages: { order: 80, messages: [] },
        skills: { order: 70, messages: [] },
        resistances: { order: 60, messages: [] },
        feats: { order: 50, messages: [] },
        spells: { order: 40, messages: [] },
        scrolls: { order: 30, messages: [] },
    }

    const messageObj = {
        add: (group: string, options: DailyMessage) => {
            messages[group] ??= { order: 0, messages: [] }
            messages[group]!.messages.push(options)
        },
        addGroup: (group: string, order = 1, label?: string) => {
            messages[group] ??= { label, order, messages: [] }
        },
    }

    if (actor.familiar && fields['dailies.familiar']) {
        const familiar = actor.familiar
        const pack = getFamiliarPack()
        const abilities: EffectSource[] = []

        // we remove old abilities
        const ids = familiar.itemTypes.effect.map(effect => effect.id)
        if (ids.length) familiar.deleteEmbeddedDocuments('Item', ids)

        messageObj.addGroup('familiar', 20)

        for (const field of Object.values(fields['dailies.familiar'])) {
            const value = field.value
            const source = (await pack.getDocument(value))?.toObject()

            if (source) {
                abilities.push(source)
                messageObj.add('familiar', { uuid: familiarUUID(value) })
            }
        }

        if (abilities.length) familiar.createEmbeddedDocuments('Item', abilities)
    }

    if (fields['dailies.rations']?.rations!.value === 'true') {
        const rations = getRations(actor)

        if (rations?.uses.value) {
            const quantity = rations.quantity
            const { value, max } = rations.uses

            if (value <= 1) {
                if (quantity <= 1) {
                    rations.delete()
                } else {
                    updateItems.push({
                        _id: rations.id,
                        'system.quantity': Math.max(rations.quantity - 1, 0),
                        'system.charges.value': max,
                    })
                }
            } else {
                updateItems.push({
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

    for (const { item, key, process } of dailies) {
        if (!fields[key]) continue

        const dailyArgs = this.dailyArgs[key]!

        try {
            await process({
                ...dailyArgs,
                fields: fields[key]!,
                messages: messageObj,
                addItem: source => addItems.push(source),
                updateItem: data => updateItems.push(data),
                addRule: (source, parent) => getRules(parent ?? item).push(source),
                addFeat: (source, parent) => {
                    if (item.isOfType('feat')) {
                        const parentId = (parent ?? item).id
                        setProperty(source, 'flags.pf2e.grantedBy', { id: parentId, onDelete: 'cascade' })
                        setProperty(source, `flags.${MODULE_ID}.grantedBy`, parentId)
                    }
                    addItems.push(source)
                },
                addSpell: (source, level) => {
                    setProperty(source, `flags.${MODULE_ID}.entry`, { level: level })
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
                flag[row] = { uuid: uuid as ItemUUID, name: value }
            } else {
                flag[row] = value
            }
        }
    }

    for (const [id, rules] of addRules) {
        rules.forEach(x => (x[MODULE_ID] = true))
        updateItems.push({ _id: id, 'system.rules': rules })
    }

    if (addedSpells) {
        const entry: DeepPartial<SpellcastingEntrySource> = {
            type: 'spellcastingEntry',
            name: localize('spellEntry.name'),
            system: {
                prepared: { value: 'innate' },
                showSlotlessLevels: { value: false },
                showUnpreparedSpells: { value: false },
                proficiency: { value: 1, slug: actor.classDC?.slug || actor.class?.slug || undefined },
            },
        }
        addItems.push(entry)
    }

    for (const source of addItems) {
        const alreadyTemp = getProperty(source, 'system.temporary') === true
        if (!alreadyTemp) setProperty(source, `flags.${MODULE_ID}.temporary`, true)
    }

    if (addItems.length) {
        const items = (await actor.createEmbeddedDocuments('Item', addItems)) as ItemPF2e[]

        for (const item of items) {
            if (item.isOfType('feat')) {
                // we add itemGrants flag to the parent feat to have the cascade effect in the tab
                const parentId = getFlag<string>(item, 'grantedBy')
                if (parentId) {
                    const slug = sluggify(item.name, { camel: 'dromedary' })
                    const path = `flags.pf2e.itemGrants.${slug}`
                    updateItems.push({ _id: parentId, [path]: { id: item.id, onDelete: 'detach' } })
                }
            } else if (item.isOfType('spellcastingEntry')) {
                // we add all the newly created spells with 'addSpell' to this spellcasting entry
                const spells = items.filter(item => item.isOfType('spell') && getFlag(item, 'entry'))
                for (const spell of spells) {
                    const { level } = getFlag<{ level?: number }>(spell, 'entry')!
                    const data: EmbeddedDocumentUpdateData<ItemPF2e> = { _id: spell.id, 'system.location.value': item.id }
                    if (level !== undefined) data['system.location.heightenedLevel'] = level
                    updateItems.push(data)
                }
            }
        }
    }

    await actor.update({ [`flags.${MODULE_ID}`]: { ...expandObject(flags), rested: false } })

    if (updateItems.length) await actor.updateEmbeddedDocuments('Item', updateItems)

    message = parseMessages(messages, message)
    message = message ? `${msg('changes')}<hr />${message}` : msg('noChanges')
    ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) })
}

function parseMessages(messages: DailyMessageGroups, message: string) {
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

function getFields(this: DailiesInterface) {
    const elements = this.element
        .find('.window-content .content')
        .find<HTMLInputElement | HTMLSelectElement>('input:not(.alert), select[data-type]')
        .toArray()

    const fields: Record<string, DailyRowFields> = {}

    for (const element of elements) {
        const field = {
            ...element.dataset,
            value: element.value,
        } as DailyRowField

        if (field.type === 'combo' && field.input === 'false') {
            const select = element.previousElementSibling as HTMLSelectElement
            field.value = select.value
        }

        fields[field.daily] ??= {}
        fields[field.daily]![field.row] = field
    }

    return fields
}
