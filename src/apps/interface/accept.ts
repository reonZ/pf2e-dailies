import { getCategoryUUIDS, getRuleItems, RULE_TYPES } from '@src/categories'
import { createSpellScroll } from '@utils/pf2e/spell'
import { findItemWithSourceId } from '@utils/foundry/item'
import { hasSourceId, setFlag } from '@utils/foundry/flags'
import { MODULE_ID } from '@utils/module'
import { sluggify } from '@utils/pf2e/utils'
import { chatUUID } from '@utils/foundry/uuid'
import { subLocalize } from '@utils/foundry/localize'

const localize = subLocalize('interface.message')

export async function accept(html: JQuery, actor: CharacterPF2e) {
    let message = ''
    const flags = {} as SavedCategories
    const fields = html.find('.window-content .content').find('input, select').toArray() as TemplateField[]
    const ruleItems = fields.some(field => RULE_TYPES.includes(field.dataset.type as RulesName)) ? getRuleItems(actor) : []
    const addData: Partial<BaseItemSourcePF2e>[] = []
    const updateData: EmbeddedDocumentUpdateData<ItemPF2e>[] = []

    const messages = {
        languages: [] as { uuid: ItemUUID; selected: string }[],
        skills: [] as { uuid: ItemUUID; selected: string }[],
        feats: [] as { uuid: ItemUUID }[],
        items: [] as { uuid: ItemUUID }[],
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
                messages.skills.push({ uuid, selected })
            }

            flags[category] = selected
        } else {
            const category = field.dataset.category
            const uuid = getCategoryUUIDS(category)[0]
            const ruleItem = ruleItems.find(item => hasSourceId(item, uuid))
            if (!ruleItem) continue

            const selected = field.value
            const rules = deepClone(ruleItem._source.system.rules)

            for (let i = rules.length - 1; i >= 0; i--) {
                const rule = rules[i]
                if ('pf2e-dailies' in rule) rules.splice(i, 1)
            }

            if (type === 'addedLanguage') {
                rules.push(createLanguageRule(selected as Language))
                messages.languages.push({ uuid, selected })
            } else {
                rules.push(createTrainedSkillRule(selected as SkillLongForm))
                messages.skills.push({ uuid, selected })
            }

            // @ts-ignore
            flags[category] = selected
            updateData.push({ _id: ruleItem.id, 'system.rules': rules })
        }
    }

    const pushMessages = (type: string, list: { uuid: ItemUUID; selected?: string }[]) => {
        if (!list.length) return

        if (message) message += '<hr />'
        message += `<p><strong>${localize(type)}</strong></p>`

        for (const { uuid, selected } of list) {
            if (selected === undefined) message += `<p>${chatUUID(uuid)}</p>`
            else message += `<p>${chatUUID(uuid)} <span style="text-transform: capitalize;">${selected}</span></p>`
        }
    }

    if (addData.length) {
        const items = (await actor.createEmbeddedDocuments('Item', addData)) as ItemPF2e[]
        for (const item of items) {
            const uuid = item.uuid

            if (item.type === 'feat') messages.feats.push({ uuid })
            else if (item.type !== 'lore') messages.items.push({ uuid })

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
    pushMessages('feats', messages.feats)
    pushMessages('items', messages.items)

    if (updateData.length) await actor.updateEmbeddedDocuments('Item', updateData)

    await setFlag(actor, 'saved', flags)

    message = `${localize('changes')}<hr>${message}`
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

function createLanguageRule(language: Language) {
    return {
        key: 'ActiveEffectLike',
        mode: 'add',
        path: 'system.traits.languages.value',
        value: language,
        [MODULE_ID]: true,
    } as const
}

function createTrainedSkillRule(skill: SkillLongForm) {
    return {
        key: 'ActiveEffectLike',
        mode: 'upgrade',
        path: `system.skills.${skill}.rank`,
        value: 1,
        [MODULE_ID]: true,
    } as const
}
