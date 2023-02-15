import { hasCategories, isReturnedCategory } from '@src/categories'
import { getFlag } from '@utils/foundry/flags'
import { PROFICIENCY_RANKS } from '@utils/pf2e/actor'
import { getChoiSetRuleSelection } from '@utils/pf2e/item'
import { SKILL_LONG_FORMS } from '@utils/pf2e/skills'
import { capitalize } from '@utils/string'
import { LANGUAGE_LIST } from '@utils/pf2e/languages'
import { localize } from '@utils/foundry/localize'
import {
    getFreePropertySlot,
    runetoLabel,
    WEAPON_DAMAGE_TYPES,
    WEAPON_GREATER_RUNES,
    WEAPON_RUNES,
    WEAPON_TRAITS,
} from '@src/data/weapon'

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
    const flags = getFlag<SavedCategories>(actor, 'saved') ?? {}
    const categories = hasCategories(actor)
    const templates: BaseCategoryTemplate[] = []

    if (actor.familiar) {
        const category = 'familiar'
        const rows: SelectRowTemplate<FamiliarAbility, string>[] = []
        const nbAbilityies = actor.attributes.familiarAbilities.value
        const options: SelectOption<string>[] = []

        const indexes = game.packs.get('pf2e.familiar-abilities')!.index
        for (const index of indexes) {
            options.push({ value: index._id, label: index.name })
        }

        for (let index = 0; index < nbAbilityies; index++) {
            rows.push({
                rowType: 'select',
                value: flags[category]?.[index] ?? '',
                options,
                label: localize('label.ability', { nb: index + 1 }),
            })
        }

        if (rows.length) {
            templates.push({
                type: 'familiarAbility',
                category,
                label: localize('label.familiar'),
                rows,
            })
        }
    }

    for (const entry of categories) {
        if (isReturnedCategory(entry, ['scrollChain', 'scrollSavant'])) {
            const { type, category, label, items } = entry
            const rows: DropRowTemplate[] = []

            const spellSlot = (level: number, index: number = level - 1) => {
                const { name = '', uuid = '' } = flags[category]?.[index] ?? {}
                rows.push({
                    rowType: 'drop',
                    value: name,
                    label: game.i18n.localize(`PF2E.SpellLevel${level}`),
                    dataset: { uuid, level },
                })
            }

            if (type === 'scrollChain') {
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
            } else {
                const { maxSlot, maxTradition } = getSpellcastingDetails(actor, 'arcane')

                // legendary arcane
                if (maxTradition >= 4 && maxSlot >= 6) spellSlot(maxSlot - 5, 3)

                // master arcane
                if (maxTradition >= 3 && maxSlot >= 5) spellSlot(maxSlot - 4, 2)

                // no proficiency
                spellSlot(maxSlot - 3, 1)
                spellSlot(maxSlot - 2, 0)
            }

            templates.push({ type, category, label, rows })
        } else if (isReturnedCategory(entry, 'trainedSkill')) {
            const options = SKILL_LONG_FORMS.filter(x => actor.skills[x]!.rank! < 1)
            if (!options.length) continue

            const { type, category, label } = entry

            let { selected = '', input = true } = flags[category] ?? {}
            if (selected && !input && !options.includes(selected as SkillLongForm)) {
                selected = ''
                input = true
            }

            const row: TemplateRow<TrainedSkillTemplate> = {
                rowType: 'combo',
                options: arrayToSelectOptions(options),
                value: input ? selected : capitalize(selected),
                dataset: { input },
            }
            templates.push({ type, category, label, rows: [row] })
        } else if (isReturnedCategory(entry, 'thaumaturgeTome')) {
            const { type, category, label, items } = entry
            const rows: TemplateRows<ThaumaturgeTomeTemplate> = []
            const actorSkills = actor.skills as Record<SkillLongForm, { rank: OneToFour }>

            const skillSlot = (index: number, rank: OneToFour, options: SkillLongForm[]) => {
                let { selected = '', input = true } = flags[category]?.[index] ?? {}
                if (selected && !input && !options.includes(selected as SkillLongForm)) {
                    selected = ''
                    input = true
                }

                rows.push({
                    rowType: 'combo',
                    label: PROFICIENCY_RANKS[rank],
                    options: arrayToSelectOptions(options),
                    value: input ? selected : capitalize(selected),
                    dataset: { input, rank },
                })
            }

            const isTomeSelected = (index: number, option: 'adept' | 'paragon' = 'adept') => {
                const item = items[index]
                return item ? getChoiSetRuleSelection(item, option) === 'tome' : false
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
            }

            // base Tome
            else {
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

            templates.push({ type, category, label, rows })
        } else if (isReturnedCategory(entry, 'trainedLore')) {
            const { type, category, label } = entry
            const row: TemplateRow<TrainedLoreTemplate> = {
                rowType: 'input',
                placeholder: game.i18n.localize('PF2E.NewPlaceholders.Lore'),
                value: flags[category] ?? '',
            }
            templates.push({ type, category, label, rows: [row] })
        } else if (isReturnedCategory(entry, 'addedLanguage')) {
            const actorLanguages = actor.system.traits.languages.value
            const options = LANGUAGE_LIST.filter(x => !actorLanguages.includes(x)).sort()
            if (!options.length) continue

            const { type, category, label } = entry
            const row: TemplateRow<AddedLanguageTemplate> = {
                rowType: 'select',
                options: arrayToSelectOptions(options),
                value: flags[category] ?? '',
            }
            templates.push({ type, category, label, rows: [row] })
        } else if (isReturnedCategory(entry, 'addedResistance')) {
            const { type, category, label } = entry
            const row: TemplateRow<AddedResistanceTemplate> = {
                rowType: 'select',
                options: arrayToSelectOptions(FOUR_ELEMENTS),
                value: flags[category] ?? '',
            }
            templates.push({ type, category, label, rows: [row] })
        } else if (isReturnedCategory(entry, 'combatFlexibility')) {
            const { type, category, label, items } = entry
            const selected = flags[category] ?? []
            const rows: TemplateRows<CombatFlexibilityTemplate> = []

            // Combat Flexibility
            rows.push({
                rowType: 'drop',
                value: selected[0]?.name ?? '',
                label: game.i18n.localize(`PF2E.Level8`),
                dataset: {
                    uuid: selected[0]?.uuid ?? '',
                    level: 8,
                },
            })

            // Improved Flexibility
            if (items[1]) {
                rows.push({
                    rowType: 'drop',
                    label: game.i18n.localize(`PF2E.Level14`),
                    value: selected[1]?.name ?? '',
                    dataset: {
                        uuid: selected[1]?.uuid ?? '',
                        level: 14,
                    },
                })
            }

            templates.push({ type, category, label, rows })
        } else if (isReturnedCategory(entry, 'tricksterAce')) {
            const { type, category, label } = entry
            const { name = '', uuid = '' } = flags[category] ?? {}
            const row: TemplateRow<TricksterAceTemplate> = {
                rowType: 'drop',
                value: name,
                dataset: {
                    uuid,
                    level: 4,
                },
            }
            templates.push({ type, category, label, rows: [row] })
        } else if (isReturnedCategory(entry, 'ganziHeritage')) {
            const { type, category, label } = entry
            const row: TemplateRow<GanziHeritageTemplate> = {
                rowType: 'random',
                options: arrayToSelectOptions(GANZI_RESISTANCES),
            }
            templates.push({ type, category, label, rows: [row] })
        } else if (isReturnedCategory(entry, 'mindSmith')) {
            const { type, category, label, items } = entry
            const weapon = items[1] as WeaponPF2e

            const template: MindSmithTemplate = {
                type,
                category,
                label,
                rows: [{ rowType: 'alert', value: localize('interface.alert.weapon') }],
            }
            templates.push(template)

            // we missing the weapon
            if (!weapon) continue
            template.rows[0] = {
                rowType: 'select',
                options: arrayToSelectOptions(WEAPON_DAMAGE_TYPES),
                value: flags[category]?.damage ?? '',
                label,
                dataset: {
                    subcategory: 'damage',
                },
            }

            // Malleable Mental Forge
            if (items[2]) {
                template.rows[1] = {
                    rowType: 'select',
                    options: arrayToSelectOptions(WEAPON_TRAITS),
                    value: flags[category]?.trait ?? '',
                    label: localize('label.mentalforge'),
                    dataset: {
                        subcategory: 'trait',
                    },
                }
            }

            // we don't have the next feats
            if (!items[3] && !items[4]) continue

            // the weapon doesn't have any free property rune slot
            if (!getFreePropertySlot(weapon)) continue

            const runes = (items[4] ? WEAPON_GREATER_RUNES : WEAPON_RUNES) as readonly MindSmithWeaponAllRunes[]
            const selected = flags[category]?.rune ?? ''

            template.rows[2] = {
                rowType: 'select',
                options: runes.map(x => ({ value: x, label: runetoLabel(x) })),
                value: selected && runes.includes(selected) ? selected : '',
                label: localize('label.runicmind'),
                dataset: {
                    subcategory: 'rune',
                },
            }
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

function arrayToSelectOptions<T extends string>(arr: readonly T[] | T[]) {
    return arr.map(x => ({ value: x, label: x })) as SelectOption<T>[]
}

function getSpellcastingDetails(actor: ActorPF2e, tradition: MagicTradition) {
    let maxSlot = 1
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

    return { maxSlot: Math.min(maxSlot, 10), maxTradition }
}
