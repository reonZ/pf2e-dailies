import { hasCategories, isCategory } from '@src/categories'
import { getFlag } from '@utils/foundry/flags'
import { LANGUAGE_LIST } from '@utils/pf2e/languages'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'

const sortOrder = new Proxy(
    {
        addedLanguage: 0,
        trainedSkill: 1,
        combatFlexibility: 2,
    } as Record<string | symbol, number>,
    {
        get(obj, prop) {
            return prop in obj ? obj[prop] : 99
        },
    }
) as Record<CategoryType, number>

export function getData(actor: CharacterPF2e) {
    const level = actor.level
    const flags = (getFlag(actor, 'saved') ?? {}) as SavedCategories
    const categories = hasCategories(actor)
    const templates: BaseCategoryTemplate[] = []
    const actorLanguages = actor.system.traits.languages.value
    const skills = SKILL_LONG_FORMS.filter(x => actor.skills[x]!.rank! < 1).map(x => ({ key: x }))
    const languages = LANGUAGE_LIST.filter(x => !actorLanguages.includes(x))
        .sort()
        .map(x => ({ key: x }))

    for (const entry of categories) {
        if (isCategory(entry, 'scrollChain')) {
            const { type, category, label, items } = entry
            const slots: DropTemplate[] = []
            const spellSlot = (level: OneToTen): DropTemplate => {
                const { name, uuid } = flags[category]?.[level - 1] ?? { name: '', uuid: '' }
                return { type: 'drop', level, name, uuid, label: game.i18n.localize(`PF2E.SpellLevel${level}`) }
            }

            // first feat
            slots.push(spellSlot(1))
            if (level >= 8) slots.push(spellSlot(2))

            // second feat
            if (items[1]) {
                slots.push(spellSlot(3))
                if (level >= 14) slots.push(spellSlot(4))
                if (level >= 16) slots.push(spellSlot(5))
            }

            // third feat
            if (items[2]) {
                slots.push(spellSlot(6))
                if (level >= 20) slots.push(spellSlot(7))
            }

            const template: ScrollChainTemplate = { type, category, label, rows: slots }
            templates.push(template)
        } else if (isCategory(entry, 'scrollSavant')) {
            const { maxSlot, maxTradition } = getSpellcastingDetails(actor, 'arcane')
            if (maxSlot < 4) continue

            const { type, category, label } = entry
            const slots: DropTemplate[] = []
            const spellSlot = (index: number, level: number): DropTemplate => {
                const { name, uuid } = flags[category]?.[index] ?? { name: '', uuid: '' }
                return { type: 'drop', level, name, uuid, label: game.i18n.localize(`PF2E.SpellLevel${level}`) }
            }

            // legendary arcane
            if (maxTradition >= 4 && maxSlot >= 6) slots.push(spellSlot(3, maxSlot - 5))

            // master arcane
            if (maxTradition >= 3 && maxSlot >= 5) slots.push(spellSlot(2, maxSlot - 4))

            // no proficiency
            slots.push(spellSlot(1, maxSlot - 3))
            slots.push(spellSlot(0, maxSlot - 2))

            const template: ScrollSavantTemplate = { type, category, label, rows: slots }
            templates.push(template)
        } else if (isCategory(entry, 'trainedSkill')) {
            const { type, category, label } = entry
            const selected = flags[category] ?? ''
            const template: TrainedSkillTemplate = {
                type,
                category,
                label,
                rows: [{ type: 'select', options: skills, selected }],
            }
            templates.push(template)
        } else if (isCategory(entry, 'trainedLore')) {
            const { type, category, label } = entry
            const selected = flags[category] ?? ''
            const template: TrainedLoreTemplate = {
                type,
                category,
                label,
                rows: [{ type: 'input', selected, placeholder: game.i18n.localize('PF2E.NewPlaceholders.Lore') }],
            }
            templates.push(template)
        } else if (isCategory(entry, 'addedLanguage')) {
            const { type, category, label } = entry
            const selected = flags[category] ?? ''
            const template: AddedLanguageTemplate = {
                type,
                category,
                label,
                rows: [{ type: 'select', options: languages, selected }],
            }
            templates.push(template)
        } else if (isCategory(entry, 'combatFlexibility')) {
            const { type, category, label, items } = entry
            const selected = flags[category] ?? []
            // first feat
            const slots: DropTemplate[] = [
                {
                    type: 'drop',
                    label: game.i18n.localize(`PF2E.Level8`),
                    name: selected[0]?.name ?? '',
                    uuid: selected[0]?.uuid ?? '',
                    level: 8,
                },
            ]
            // second feat
            if (items[1])
                slots.push({
                    type: 'drop',
                    label: game.i18n.localize(`PF2E.Level14`),
                    name: selected[1]?.name ?? '',
                    uuid: selected[1]?.uuid ?? '',
                    level: 14,
                })
            const template: CombatFlexibilityTemplate = { type, category, label, rows: slots }
            templates.push(template)
        }
    }

    const rows: BaseCategoryTemplate[] = []
    const groups: BaseCategoryTemplate[] = []
    for (const template of templates) {
        if (template.rows.length > 1) groups.push(template)
        else rows.push(template)
    }

    rows.sort((a, b) => sortOrder[a.type] - sortOrder[b.type])
    groups.sort((a, b) => a.rows.length - b.rows.length)

    return { rows, groups }
}

function getSpellcastingDetails(actor: ActorPF2e, tradition: MagicTradition) {
    let maxSlot = 0
    let maxTradition = 0

    for (const entry of actor.spellcasting) {
        if ('pf2e-staves' in entry.flags) continue // we skip staff entries

        const slots = entry.system.slots
        for (const key in slots) {
            const slot = slots[key as SlotKey]
            if (slot.max) maxSlot = Math.max(maxSlot, Number(key.slice(4)))
        }

        if (entry.tradition === tradition) maxTradition = Math.max(maxTradition, entry.rank)
    }

    return { maxSlot: Math.clamped(maxSlot, 1, 10), maxTradition }
}
