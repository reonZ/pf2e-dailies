import { getCategoryUUIDS, getRuleItems, RULE_TYPES } from '@src/categories'
import { hasSourceId, setFlag } from '@utils/foundry/flags'
import { findItemWithSourceId } from '@utils/foundry/item'
import { hasLocalization, localize, subLocalize } from '@utils/foundry/localize'
import { chatUUID } from '@utils/foundry/uuid'
import { MODULE_ID } from '@utils/module'
import { PROFICIENCY_RANKS } from '@utils/pf2e/actor'
import { createSpellScroll } from '@utils/pf2e/spell'
import { sluggify } from '@utils/pf2e/utils'

const msg = subLocalize('interface.message')

type ReturnedMessage = { uuid: ItemUUID; selected?: string; category?: CategoryName; label?: string }

export async function accept(html: JQuery, actor: CharacterPF2e) {
    let message = ''
    const flags = {} as SavedCategories
    const fields = html.find('.window-content .content').find('input, select').toArray() as TemplateField[]
    const ruleItems = fields.some(field => RULE_TYPES.includes(field.dataset.type as RulesName)) ? getRuleItems(actor) : []
    const addData: Partial<BaseItemSourcePF2e>[] = []
    const updateData: EmbeddedDocumentUpdateData<ItemPF2e>[] = []
    const rulesToAdd: Map<string, RuleElementSource[]> = new Map()

    const getRules = (item: ItemPF2e) => {
        const id = item.id
        const existing = rulesToAdd.get(id)
        if (existing) return existing

        const rules = deepClone(item._source.system.rules)

        for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i]
            if ('pf2e-dailies' in rule) rules.splice(i, 1)
        }

        rulesToAdd.set(id, rules)
        return rules
    }

    const messages = {
        languages: [] as ReturnedMessage[],
        skills: [] as ReturnedMessage[],
        tome: [] as ReturnedMessage[],
        resistances: [] as ReturnedMessage[],
        feats: [] as ReturnedMessage[],
        scrolls: [] as ReturnedMessage[],
    }

    for (const field of fields) {
        const type = field.dataset.type

        if (type === 'scrollChain' || type === 'scrollSavant') {
            const { uuid, category } = field.dataset
            const level = Number(field.dataset.level) as OneToTen
            const name = field.value

            if (uuid) {
                const scroll = await createSpellScroll(uuid, level, true)
                if (scroll) addData.push(scroll)
            }

            flags[category] ??= []
            flags[category]!.push({ name, uuid })
        } else if (type === 'combatFlexibility') {
            const { category, uuid, level } = field.dataset
            const name = field.value
            const index = level === '8' ? 0 : 1
            const parentUUID = getCategoryUUIDS(category)[index]

            if (parentUUID) {
                const parent = findItemWithSourceId(actor, parentUUID) as FeatPF2e
                const feat = await createTemporaryFeat(uuid, parent)
                if (feat) addData.push(feat)
            }

            flags[category] ??= []
            flags[category]!.push({ name, uuid })
        } else if (type === 'trainedLore') {
            const category = field.dataset.category
            const uuid = getCategoryUUIDS(category)[0]
            const selected = field.value

            if (uuid) {
                const lore = createTemporaryLore(selected, 1)
                addData.push(lore)
                messages.skills.push({ uuid, selected, category })
            }

            flags[category] = selected
        } else {
            const category = field.dataset.category
            const uuid = getCategoryUUIDS(category)[0]
            const ruleItem = ruleItems.find(item => hasSourceId(item, uuid))
            if (!ruleItem) continue

            const selected = field.value
            const rules = getRules(ruleItem)

            if (type === 'addedLanguage') {
                rules.push(createLanguageRule(selected))
                messages.languages.push({ uuid, selected, category })
            } else if (type === 'trainedSkill') {
                rules.push(createSkillRule(selected, 1))
                messages.skills.push({ uuid, selected, category })
            } else if (type === 'addedResistance') {
                rules.push(createResistanceRule(selected, 'half'))
                messages.resistances.push({ uuid, selected, category })
            } else if (type === 'thaumaturgeTome') {
                const rank = field.dataset.rank
                rules.push(createSkillRule(selected, rank))
                messages.tome.push({ uuid, selected, category, label: PROFICIENCY_RANKS[rank] })
            }

            if (type === 'thaumaturgeTome') {
                const category = field.dataset.category
                flags[category] ??= []
                flags[category]!.push(selected as SkillLongForm)
            } else {
                // @ts-ignore
                flags[category] = selected
            }
        }
    }

    for (const [id, rules] of rulesToAdd) {
        updateData.push({ _id: id, 'system.rules': rules })
    }

    const pushMessages = (type: string, list: ReturnedMessage[]) => {
        if (!list.length) return

        if (message) message += '<hr />'

        const title = msg.has(type) ? msg(type) : msg('gained', { type })
        message += `<p><strong>${title}</strong></p>`

        for (const { uuid, selected, category, label } of list) {
            if (label) {
                message += `<p><strong>${label}:</strong>`
            } else {
                const label = category && hasLocalization(`label.${category}`) ? localize(`label.${category}`) : undefined
                message += `<p>${chatUUID(uuid, label)}`
            }

            if (selected) message += ` <span style="text-transform: capitalize;">${selected}</span>`
            message += '</p>'
        }
    }

    if (addData.length) {
        const items = (await actor.createEmbeddedDocuments('Item', addData)) as ItemPF2e[]
        for (const item of items) {
            const uuid = item.uuid

            if (item.type === 'feat') messages.feats.push({ uuid })
            else if (item.type !== 'lore') messages.scrolls.push({ uuid })

            // we add a flag to the parent feat to have the cascade effect in the tab
            const parentId = item.getFlag<string>('pf2e', 'grantedBy.id')
            if (parentId) {
                const slug = sluggify(item.name, { camel: 'dromedary' })
                const path = `flags.pf2e.itemGrants.${slug}`
                updateData.push({ _id: parentId, [path]: { id: item.id, onDelete: 'detach' } })
            }
        }
    }

    pushMessages('languages', messages.languages)
    pushMessages('skills', messages.skills)
    pushMessages('tome', messages.tome)
    pushMessages('resistances', messages.resistances)
    pushMessages('feats', messages.feats)
    pushMessages('scrolls', messages.scrolls)

    if (updateData.length) await actor.updateEmbeddedDocuments('Item', updateData)

    await setFlag(actor, 'saved', flags)

    message = `${msg('changes')}<hr>${message}`
    ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) })
}

function createTemporaryLore(name: string, rank: OneToFour) {
    const data: Partial<BaseItemSourcePF2e> = {
        type: 'lore',
        img: 'systems/pf2e/icons/default-icons/lore.svg',
        name: name,
    }

    setProperty(data, `flags.${MODULE_ID}.temporary`, true)
    setProperty(data, 'system.proficient.value', rank)

    return data
}

async function createTemporaryFeat(uuid: ItemUUID, parent: FeatPF2e) {
    const feat = ((await fromUuid(uuid)) as FeatPF2e | null)?.toObject()
    if (!feat) return

    setProperty(feat, 'flags.pf2e.grantedBy', { id: parent.id, onDelete: 'cascade' })
    setProperty(feat, `flags.${MODULE_ID}.temporary`, true)

    return feat
}

function createLanguageRule(language: string) {
    return {
        key: 'ActiveEffectLike',
        mode: 'add',
        path: 'system.traits.languages.value',
        value: language,
        [MODULE_ID]: true,
    } as const
}

function createSkillRule(skill: string, rank: OneToFour | `${OneToFour}`) {
    return {
        key: 'ActiveEffectLike',
        mode: 'upgrade',
        path: `system.skills.${skill}.rank`,
        value: Number(rank),
        [MODULE_ID]: true,
    } as const
}

function createResistanceRule(type: string, value: number | string | 'half') {
    if (value === 'half') value = 'max(1,floor(@actor.level/2))'
    return {
        key: 'Resistance',
        type,
        value,
        [MODULE_ID]: true,
    } as const
}
