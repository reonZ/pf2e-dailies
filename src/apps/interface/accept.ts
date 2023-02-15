import { getFreePropertySlot, WEAPON_GROUPS } from '@data/weapon'
import { getCategoryUUIDS, getRuleItems, RULE_TYPES } from '@src/categories'
import { familiarUUID, getFamiliarPack } from '@src/data/familiar'
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

type ReturnedMessage = { uuid?: ItemUUID; selected?: string; label?: string; random?: boolean }

export async function accept(html: JQuery, actor: CharacterPF2e) {
    let message = ''
    const flags = {} as SavedCategories
    const fields = html.find('.window-content .content').find('input:not(.alert), select[data-type]').toArray() as TemplateField[]
    const ruleItems = fields.some(field => RULE_TYPES.includes(field.dataset.type as RulesName)) ? getRuleItems(actor) : []
    const addData: Partial<BaseItemSourcePF2e>[] = []
    const updateData: EmbeddedDocumentUpdateData<ItemPF2e>[] = []
    const rulesToAdd: Map<string, RuleElementSource[]> = new Map()
    const addToFamiliar: string[] = []

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
        mind: [] as ReturnedMessage[],
        familiar: [] as ReturnedMessage[],
    }

    for (const field of fields) {
        const type = field.dataset.type

        if (type === 'scrollChain' || type === 'scrollSavant') {
            const { uuid, category } = field.dataset
            const level = Number(field.dataset.level) as OneToTen

            const scroll = await createSpellScroll(uuid, level, true)
            if (scroll) addData.push(scroll)

            flags[category] ??= []
            flags[category]!.push({ name: field.value, uuid })
        } else if (type === 'addedFeat' || type === 'combatFlexibility') {
            const { category, uuid, level } = field.dataset
            const index = type === 'combatFlexibility' ? (level === '8' ? 0 : 1) : 0
            const parentUUID = getCategoryUUIDS(category)[index]

            if (parentUUID) {
                const parent = findItemWithSourceId<CharacterPF2e, FeatPF2e>(actor, parentUUID, ['feat'])
                if (parent) {
                    const feat = await createTemporaryFeat(uuid, parent)
                    if (feat) addData.push(feat)
                }
            }

            if (type === 'combatFlexibility') {
                flags[field.dataset.category] ??= []
                flags[field.dataset.category]!.push({ name: field.value, uuid })
            } else {
                flags[field.dataset.category] = { uuid, name: field.value }
            }
        } else if (type === 'trainedLore') {
            const category = field.dataset.category
            const uuid = getCategoryUUIDS(category)[0]
            const selected = field.value

            const lore = createTemporaryLore(selected, 1)
            addData.push(lore)
            messages.skills.push({ uuid, selected, label: category })

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
            const { input, category } = field.dataset
            const selected = field.value
            const uuid = getCategoryUUIDS(category)[0]
            const rank = type === 'thaumaturgeTome' ? Number(field.dataset.rank) : 1
            const isInput = input === 'true'

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
                messages.skills.push({ uuid, selected, label: category })
                flags[field.dataset.category] = toSave
            } else if (type === 'thaumaturgeTome') {
                const category = field.dataset.category
                messages.tome.push({ selected, label: PROFICIENCY_RANKS[rank] })
                flags[category] ??= []
                flags[category].push(toSave)
            }
        } else if (type === 'mindSmith') {
            const { category, subcategory } = field.dataset
            const uuids = getCategoryUUIDS(category)
            const weapon = findItemWithSourceId<CharacterPF2e, WeaponPF2e>(actor, uuids[1], ['weapon'])
            if (!weapon) continue

            flags[category] ??= {}

            if (subcategory === 'damage') {
                const selected = field.value as MindSmithDamageType
                updateData.push({ _id: weapon.id, 'system.damage.damageType': selected, 'system.group': WEAPON_GROUPS[selected] })
                messages.mind.push({ selected, uuid: uuids[0], label: 'mindsmith' })
                flags[category]![subcategory] = selected
            } else if (subcategory === 'trait') {
                const selected = field.value as MindSmithWeaponTrait
                const traits = deepClone(weapon._source.system.traits?.value ?? [])
                if (!traits.includes(selected)) traits.push(selected)
                updateData.push({ _id: weapon.id, 'system.traits.value': traits })
                messages.mind.push({ selected, uuid: uuids[2], label: 'mentalforge' })
                flags[category]![subcategory] = selected
            } else if (subcategory === 'rune') {
                const propertySlot = getFreePropertySlot(weapon)
                if (!propertySlot) continue

                const selected = field.value as MindSmithWeaponAllRunes
                updateData.push({ _id: weapon.id, [`system.${propertySlot}.value`]: selected })
                messages.mind.push({ selected, uuid: uuids[3], label: 'runicmind' })
                flags[category]![subcategory] = selected
                setFlag(actor, 'weapon.runeProperty', propertySlot)
            }
        } else if (type === 'familiarAbility') {
            const category = field.dataset.category
            const id = field.value

            if (actor.familiar) {
                addToFamiliar.push(field.value)
                messages.familiar.push({ uuid: familiarUUID(id) })
            }

            flags[category] ??= []
            flags[category].push(id)
        } else {
            const category = field.dataset.category
            const uuid = getCategoryUUIDS(category)[0]
            const ruleItem = ruleItems.find(item => hasSourceId(item, uuid))
            if (!ruleItem) continue

            const rules = getRules(ruleItem)

            if (type === 'addedLanguage') {
                const selected = field.value as Language
                rules.push(createLanguageRule(selected))
                messages.languages.push({ uuid, selected, label: category })
                flags[field.dataset.category] = selected
            } else if (type === 'addedResistance') {
                const selected = field.value as ResistanceType
                rules.push(createResistanceRule(selected, 'half'))
                messages.resistances.push({ uuid, selected, label: category })
                flags[field.dataset.category] = selected
            } else if (type === 'ganziHeritage') {
                const options = Array.from((field as SelectTemplateField).options).map(x => x.value) as ResistanceType[]
                const selected = await randomOptions(options)
                rules.push(createResistanceRule(selected, 'half'))
                messages.resistances.push({ uuid, selected, label: category, random: true })
                flags[field.dataset.category] = selected
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

        for (let { uuid, selected, label, random = false } of list) {
            label = label && hasLocalization(`label.${label}`) ? localize(`label.${label}`) : label
            label = capitalize(label)

            message += '<p>'
            message += uuid ? `${chatUUID(uuid, label)}` : `<strong>${label}</strong>`

            if (selected) message += ` <span style="text-transform: capitalize;">${selected}</span>`
            if (random) message += ' <i class="fa-solid fa-dice-d20"></i>'
            message += '</p>'
        }
    }

    if (actor.familiar) {
        const familiar = actor.familiar

        // we remove old abilities
        const ids = familiar.itemTypes.effect.map(x => x.id)
        if (ids.length) familiar.deleteEmbeddedDocuments('Item', ids)

        if (addToFamiliar.length) {
            const pack = getFamiliarPack()
            const items: EffectSource[] = []

            for (const id of addToFamiliar) {
                const source = (await pack.getDocument(id))?.toObject()
                if (source) items.push(source)
            }

            if (items.length) familiar.createEmbeddedDocuments('Item', items)
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
    pushMessages('mindsmith', messages.mind)
    pushMessages('resistances', messages.resistances)
    pushMessages('feats', messages.feats)
    pushMessages('spells', messages.spells)
    pushMessages('scrolls', messages.scrolls)
    pushMessages('familiar', messages.familiar)

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
