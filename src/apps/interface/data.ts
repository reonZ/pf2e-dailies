import { hasCategories, isCategory } from '@src/categories'
import { getFlag } from '@utils/foundry/flags'
import { PROFICIENCY_RANKS } from '@utils/pf2e/actor'
import { LANGUAGE_LIST } from '@utils/pf2e/languages'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'
import { capitalize } from '@utils/string'

const FOUR_ELEMENTS = ['air', 'earth', 'fire', 'water'] as const
const GANZI_RESISTANCES = ['acid', 'electricity', 'sonic'] as const

const sortOrder = new Proxy(
    {
        addedLanguage: 0,
        trainedSkill: 1,
        addedResistance: 2,
        trainedLore: 3,
    } as Partial<Record<CategoryType | symbol, number>>,
    {
        get(obj, prop) {
            return prop in obj ? obj[prop as CategoryType] : 99
        },
    }
) as Record<CategoryType, number>

export function getData(actor: CharacterPF2e) {
    const actorLevel = actor.level
    const flags = (getFlag(actor, 'saved') ?? {}) as SavedCategories
    const categories = hasCategories(actor)
    const templates: BaseCategoryTemplate[] = []

    for (const entry of categories) {
        if (isCategory(entry, 'scrollChain')) {
            const { type, category, label, items } = entry
            const slots: DropTemplate[] = []

            const spellSlot = (level: OneToTen) => {
                const { name = '', uuid = '' } = flags[category]?.[level - 1] ?? {}
                slots.push({ type: 'drop', level, name, uuid, label: game.i18n.localize(`PF2E.SpellLevel${level}`) })
            }

            // first feat
            spellSlot(1)
            if (actorLevel >= 8) spellSlot(2)

            // second feat
            if (items[1]) {
                spellSlot(3)
                if (actorLevel >= 14) spellSlot(4)
                if (actorLevel >= 16) spellSlot(5)
            }

            // third feat
            if (items[2]) {
                spellSlot(6)
                if (actorLevel >= 20) spellSlot(7)
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
            const options = SKILL_LONG_FORMS.filter(x => actor.skills[x]!.rank! < 1)
            if (!options.length) continue

            const { type, category, label } = entry
            let { selected = '', input = true } = flags[category] ?? {}

            if (selected && !input && !options.includes(selected as SkillLongForm)) {
                selected = ''
                input = true
            }

            const template: TrainedSkillTemplate = {
                type,
                category,
                label,
                rows: [{ type: 'combo', options, selected: input ? selected : capitalize(selected), input }],
            }
            templates.push(template)
        } else if (isCategory(entry, 'thaumaturgeTome')) {
            const { type, category, label, items } = entry
            const slots: ThaumaturgeTomeTemplate['rows'] = []
            const actorSkills = actor.skills as Record<SkillLongForm, { rank: OneToFour }>

            const skillSlot = (index: number, rank: OneToFour, options: SkillLongForm[]) => {
                let { selected = '', input = true } = flags[category]?.[index] ?? {}

                if (selected && !input && !options.includes(selected as SkillLongForm)) {
                    selected = ''
                    input = true
                }

                slots.push({
                    type: 'combo',
                    label: PROFICIENCY_RANKS[rank],
                    options,
                    selected: input ? selected : capitalize(selected),
                    rank,
                    input,
                })
            }

            const isTomeSelected = (index: number, option: 'adept' | 'paragon' = 'adept') => {
                const item = items[index]
                return item ? getRuleSelection(item, option) === 'tome' : false
            }

            // Implement Paragon
            if (isTomeSelected(4, 'paragon')) {
                const skills = SKILL_LONG_FORMS.filter(x => actorSkills[x].rank < 4)
                if (!skills.length) continue

                skillSlot(0, 4, skills)
                skillSlot(1, 4, skills)
            }
            // Intense Implement or Second Adept or Implement Adept
            else if (items[3] || isTomeSelected(2) || isTomeSelected(1)) {
                const masters = SKILL_LONG_FORMS.filter(x => actorSkills[x].rank < 3)

                if (actorLevel >= 9) {
                    if (!masters.length) continue
                    skillSlot(0, 3, masters)
                    skillSlot(1, 3, masters)
                } else {
                    const experts = SKILL_LONG_FORMS.filter(x => actorSkills[x].rank < 2)
                    if (!experts.length) continue
                    skillSlot(0, 2, experts)
                    if (masters.length) skillSlot(1, 3, masters)
                }
            } else {
                if (actorLevel >= 5) {
                    const experts = SKILL_LONG_FORMS.filter(x => actorSkills[x].rank < 2)
                    if (!experts.length) continue

                    skillSlot(0, 2, experts)
                    skillSlot(1, 2, experts)
                } else if (actorLevel >= 3) {
                    const trained = SKILL_LONG_FORMS.filter(x => actorSkills[x].rank < 1)
                    if (!trained.length) continue

                    skillSlot(0, 1, trained)

                    const experts = SKILL_LONG_FORMS.filter(x => actorSkills[x].rank < 2)
                    if (experts.length) skillSlot(1, 2, experts)
                } else {
                    const trained = SKILL_LONG_FORMS.filter(x => actorSkills[x].rank < 1)
                    if (!trained.length) continue

                    skillSlot(0, 1, trained)
                    skillSlot(1, 1, trained)
                }
            }
            const template: ThaumaturgeTomeTemplate = {
                type,
                category,
                label,
                rows: slots,
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
            const actorLanguages = actor.system.traits.languages.value
            const options = LANGUAGE_LIST.filter(x => !actorLanguages.includes(x)).sort()
            if (!options.length) continue

            const { type, category, label } = entry
            const selected = flags[category] ?? ''

            const template: AddedLanguageTemplate = {
                type,
                category,
                label,
                rows: [{ type: 'select', options, selected }],
            }
            templates.push(template)
        } else if (isCategory(entry, 'addedResistance')) {
            const { type, category, label } = entry
            const selected = flags[category] ?? ''
            const template: AddedResistanceTemplate = {
                type,
                category,
                label,
                rows: [{ type: 'select', options: FOUR_ELEMENTS, selected }],
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
        } else if (isCategory(entry, 'tricksterAce')) {
            const { type, category, label } = entry
            const { name = '', uuid = '' } = flags[category] ?? {}
            const template: TricksterAceTemplate = {
                type,
                category,
                label,
                rows: [{ type: 'drop', level: 4, name, uuid }],
            }
            templates.push(template)
        } else if (isCategory(entry, 'ganziHeritage')) {
            const { type, category, label } = entry
            const template: GanziHeritageTemplate = {
                type,
                category,
                label,
                rows: [{ type: 'random', options: GANZI_RESISTANCES }],
            }
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

function getRuleSelection<T extends unknown>(item: ItemPF2e, option: string) {
    const rules = item._source.system.rules as ChoiceSetSource[]
    const rule = rules.find(rule => rule.key === 'ChoiceSet' && rule.rollOption === option)
    return rule?.selection as T | undefined
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
