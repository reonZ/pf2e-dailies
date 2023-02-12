import { getCategoryUUIDS, getRuleItems, RULE_TYPES } from '@src/categories'
import { getFlag, hasSourceId, setFlag } from '@utils/foundry/flags'
import { findItemWithSourceId } from '@utils/foundry/item'
import { hasLocalization, localize, subLocalize } from '@utils/foundry/localize'
import { chatUUID } from '@utils/foundry/uuid'
import { MODULE_ID } from '@utils/module'
import { PROFICIENCY_RANKS } from '@utils/pf2e/actor'
import { createSpellScroll } from '@utils/pf2e/spell'
import { sluggify } from '@utils/pf2e/utils'
import { capitalize } from '@utils/string'

const msg = subLocalize('interface.message')

type ReturnedMessage = { uuid: ItemUUID; selected?: string; category?: CategoryName; label?: string; random?: boolean }

export async function accept(html: JQuery, actor: CharacterPF2e) {
    let message = ''
    const flags = {} as SavedCategories
    const fields = html.find('.window-content .content').find('input, select[data-type]').toArray() as TemplateField[]
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
            if (MODULE_ID in rule) rules.splice(i, 1)
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
        spells: [] as ReturnedMessage[],
    }

    for (const field of fields) {
        const type = field.dataset.type

        if (type === 'scrollChain' || type === 'scrollSavant') {
            const { uuid, category } = field.dataset
            const level = Number(field.dataset.level) as OneToTen
            const name = field.value

            const scroll = await createSpellScroll(uuid, level, true)
            if (scroll) addData.push(scroll)

            flags[category] ??= []
            flags[category]!.push({ name, uuid })
        } else if (type === 'combatFlexibility') {
            const { category, uuid, level } = field.dataset
            const name = field.value
            const index = level === '8' ? 0 : 1
            const parentUUID = getCategoryUUIDS(category)[index]

            if (parentUUID) {
                const parent = findItemWithSourceId<CharacterPF2e, FeatPF2e>(actor, parentUUID, ['feat'])
                if (parent) {
                    const feat = await createTemporaryFeat(uuid, parent)
                    if (feat) addData.push(feat)
                }
            }

            flags[category] ??= []
            flags[category]!.push({ name, uuid })
        } else if (type === 'trainedLore') {
            const category = field.dataset.category
            const uuid = getCategoryUUIDS(category)[0]
            const selected = field.value

            const lore = createTemporaryLore(selected, 1)
            addData.push(lore)
            messages.skills.push({ uuid, selected, category })

            flags[category] = selected
        } else if (type === 'tricksterAce') {
            const { category, uuid } = field.dataset
            const name = field.value

            const entrySlug = sluggify("Trickster's Ace", { camel: 'dromedary' })
            const spell = await createSpellcastingSpell(uuid, 4, entrySlug)

            if (spell) {
                const proficiency = actor.classDC?.slug || actor.class?.slug
                const entry = createSpellcastingEntry("Trickster's Ace", entrySlug, proficiency)
                addData.push(spell)
                addData.push(entry)
            }

            flags[category] = { name, uuid }
        } else if (type === 'trainedSkill' || type === 'thaumaturgeTome') {
            const dataset = field.dataset
            const category = dataset.category
            const uuid = getCategoryUUIDS(category)[0]
            const selected = field.value
            const rank = Number(dataset.rank || '1')
            const isInput = dataset.input === 'true'

            if (isInput) {
                const lore = createTemporaryLore(selected, rank)
                addData.push(lore)
            } else {
                const ruleItem = ruleItems.find(item => hasSourceId(item, uuid))
                if (!ruleItem) continue

                const rules = getRules(ruleItem)
                rules.push(createSkillRule(selected.toLowerCase(), rank))
            }

            const toSave = { selected: isInput ? selected : selected.toLowerCase(), input: isInput }

            if (type === 'trainedSkill') {
                messages.skills.push({ uuid, selected, category })
                flags[field.dataset.category] = toSave
            } else if (type === 'thaumaturgeTome') {
                const category = field.dataset.category
                messages.tome.push({ uuid, selected, category, label: PROFICIENCY_RANKS[rank] })
                flags[category] ??= []
                flags[category].push(toSave)
            }
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
            } else if (type === 'addedResistance') {
                rules.push(createResistanceRule(selected, 'half'))
                messages.resistances.push({ uuid, selected, category })
            } else if (type === 'ganziHeritage') {
                const options = Array.from((field as HTMLSelectElement).options).map(x => x.value) as ResistanceType[]
                const selected = await randomOptions(options)
                rules.push(createResistanceRule(selected, 'half'))
                messages.resistances.push({ uuid, selected, category, random: true })
            }

            // @ts-ignore
            flags[category] = selected
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

        for (const { uuid, selected, category, label, random = false } of list) {
            if (label) {
                message += `<p><strong>${capitalize(label)}:</strong>`
            } else {
                const label = category && hasLocalization(`label.${category}`) ? localize(`label.${category}`) : undefined
                message += `<p>${chatUUID(uuid, label)}`
            }

            if (selected) message += ` <span style="text-transform: capitalize;">${selected}</span>`
            if (random) message += ' <i class="fa-solid fa-dice-d20"></i>'
            message += '</p>'
        }
    }

    if (addData.length) {
        const items = (await actor.createEmbeddedDocuments('Item', addData)) as ItemPF2e[]
        for (const item of items) {
            const uuid = item.uuid

            if (item.type === 'feat') messages.feats.push({ uuid })
            else if (item.type === 'consumable') messages.scrolls.push({ uuid })
            // we populate the spellcasting entries with the spells
            else if (item.type === 'spellcastingEntry') {
                const slug = item.slug
                const spells = items.filter(x => x.type === 'spell' && getFlag(x, 'parent') === slug) as SpellPF2e[]
                for (const spell of spells) {
                    const level = getFlag(spell, 'level')
                    updateData.push({ _id: spell.id, 'system.location.value': item.id, 'system.location.heightenedLevel': level })
                    messages.spells.push({ uuid: spell.uuid })
                }
            }

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
    pushMessages('spells', messages.spells)
    pushMessages('scrolls', messages.scrolls)

    if (updateData.length) await actor.updateEmbeddedDocuments('Item', updateData)

    await setFlag(actor, 'saved', flags)

    message = `${msg('changes')}<hr>${message}`
    ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) })
}

async function randomOptions<T extends string>(options: T[]) {
    const roll = (await new Roll(`1d${options.length}`).evaluate({ async: true })).total
    return options[roll - 1]
}

function createTemporaryLore(name: string, rank: number) {
    const data: Partial<BaseItemSourcePF2e> = {
        type: 'lore',
        img: 'systems/pf2e/icons/default-icons/lore.svg',
        name: name,
        flags: {
            [MODULE_ID]: { temporary: true },
        },
    }

    setProperty(data, 'system.proficient.value', rank)

    return data
}

async function createTemporaryFeat(uuid: ItemUUID, parent: FeatPF2e) {
    const feat = (await fromUuid<FeatPF2e>(uuid))?.toObject()
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

function createSkillRule(skill: string, rank: number) {
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

async function createSpellcastingSpell(uuid: ItemUUID, level: OneToTen, entry: string) {
    const spell = (await fromUuid<SpellPF2e>(uuid))?.toObject()
    if (!spell) return

    setProperty(spell, `flags.${MODULE_ID}`, { parent: entry, level })

    return spell
}

function createSpellcastingEntry(name: string, slug: string, proficiency: string | undefined | null) {
    const entry: Partial<BaseItemSourcePF2e> = {
        type: 'spellcastingEntry',
        img: 'systems/pf2e/icons/default-icons/spellcastingEntry.svg',
        name,
        flags: {
            [MODULE_ID]: { temporary: true },
        },
    }

    setProperty(entry, 'system', {
        slug,
        prepared: { value: 'innate' },
        showSlotlessLevels: { value: false },
        showUnpreparedSpells: { value: false },
        proficiency: { value: 1, slug: proficiency },
    })

    return entry
}
