import { createFeatDaily } from '@src/data/feat'
import { createLanguageDaily } from '@src/data/language'
import { createResistancelDaily } from '@src/data/resistance'
import { createTrainedLoreDaily, createTrainedSkillDaily } from '@src/data/skill'
import { createSpellDaily } from '@src/data/spell'
import { subLocalize } from '@utils/foundry/localize'
import { templatePath } from '@utils/foundry/path'
import { getSetting, setSetting } from '@utils/foundry/settings'
import { getModule } from '@utils/foundry/module'
import { AsyncFunction } from '@utils/function'
import { error, warn } from '@utils/foundry/notification'
import { tome } from './customs/tome'
import { flexibility } from './customs/flexibility'
import { savant } from './customs/savant'
import { mind } from './customs/mind'
import { EXT_VERSION } from '@src/main'

const localize = subLocalize('customs')

type DailyExampleType = 'tome' | 'flexibility' | 'savant' | 'mind'
type DailyTemplateType = 'default' | 'trainedSkill' | 'trainedLore' | 'language' | 'resistance' | 'feat' | 'spell'
type DailyData = {
    key: string
    uuid: ItemUUID
    label: string
    resistances: string
    resistance: string
    feattype: string
    traits: string
    level: string
    category: string
    traditions: string
    levels: string
}

const TEMPLATES = ['default', 'trainedSkill', 'trainedLore', 'language', 'resistance', 'feat', 'spell']
const EXAMPLES = ['flexibility', 'savant', 'tome', 'mind']

export class DailyCustoms extends FormApplication {
    private _selectedTemplate: DailyTemplateType | DailyExampleType = 'default'
    private _selectedDaily: string = ''
    private _monaco: any | null = null

    constructor() {
        super()
    }

    static get defaultOptions(): FormApplicationOptions {
        return mergeObject(super.defaultOptions, {
            id: 'pf2e-dailies-customs',
            title: localize('title'),
            template: templatePath('customs.hbs'),
            submitOnChange: false,
            submitOnClose: false,
            closeOnSubmit: false,
            scrollY: ['.left .list'],
        })
    }

    async _updateObject(event: Event, formData: Record<string, unknown>) {}

    async getData(options?: Partial<FormApplicationOptions> | undefined) {
        const customs = getSetting<SavedCustomDaily[]>('customDailies')
        const code = customs.find(custom => custom.key === this._selectedDaily)?.code
        const template = this._selectedTemplate
        const extension = getModule<PF2eDailiesExtApi>('pf2e-dailies-ext')
        const newVersion = extension?.active && isNewerVersion(EXT_VERSION, extension.version) ? { version: EXT_VERSION } : ''

        return mergeObject(super.getData(options), {
            i18n: localize,
            template,
            templates: TEMPLATES,
            daily: this._selectedDaily,
            code,
            customs,
            examples: EXAMPLES,
            isExample: EXAMPLES.includes(template),
            monaco: extension?.active,
            newVersion,
        })
    }

    activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html)

        this._monaco?.dispose()

        const monaco = getModule<PF2eDailiesExtApi>('pf2e-dailies-ext')?.api
        const area = html.find<HTMLTextAreaElement>('.code')[0]
        if (monaco && area) {
            const element = html.find('.monaco .placeholder')[0]!
            this._monaco = monaco.createEditor(element, area.value)
            this._monaco.onDidChangeModelContent(debounce(() => (area.value = this._monaco.getValue()), 200))
        } else {
            this._monaco = null
        }

        html.find<HTMLSelectElement>('[data-action=select-template]').on('change', this.#onSelectTemplate.bind(this))
        html.find('[data-action=create-template]').on('click', this.#onCreateTemplate.bind(this))
        html.find('[data-action=create-daily]').on('click', this.#onCreateDaily.bind(this))

        html.find('.row[data-key]').on('click', this.#onSelectDaily.bind(this))
        html.find('[data-action=delete-daily]').on('click', this.#onDeleteDaily.bind(this))

        html.find('[data-action=save-code]').on('click', this.#onSaveCode.bind(this))
    }

    get code() {
        const element = this.form.querySelector<HTMLTextAreaElement>('.window-content .code')
        return element?.value
    }

    async #onSaveCode(event: JQuery.ClickEvent) {
        event.preventDefault()

        const code = this.code
        const selected = this._selectedDaily

        if (!selected || !code) return

        const customs = getSetting<SavedCustomDaily[]>('customDailies')
        const stipped = customs.filter(custom => custom.key !== selected)

        try {
            const fn = new AsyncFunction(code)
            const daily = await fn()
            const key = daily.key

            if (typeof key !== 'string') return warn('invalidKey')
            if (stipped.find(custom => custom.key === key)) return warn('duplicate')

            const index = customs.findIndex(custom => custom.key === selected)
            if (index < 0) return

            customs.splice(index, 1, { key, code })
            await setSetting('customDailies', customs)

            localize.info('saved', { daily: key })
            this._selectedDaily = key
            this.render()
        } catch (err) {
            error('error.unexpected')
            console.error(err)
            console.error(`The error occured while testing the custom daily ${selected}`)
        }
    }

    async #onDeleteDaily(event: JQuery.ClickEvent) {
        event.preventDefault()
        event.stopPropagation()

        const remove = await Dialog.confirm({
            title: localize('delete.title'),
            content: localize('delete.content'),
        })

        if (!remove) return

        const key = event.currentTarget.dataset.key as string
        const customs = getSetting<SavedCustomDaily[]>('customDailies').filter(custom => custom.key !== key)

        await setSetting('customDailies', customs)
        localize.info('deleted', { daily: key })
        this.#onCreateDaily()
    }

    #onCreateDaily() {
        this._selectedDaily = ''
        this._selectedTemplate = 'default'
        this.render()
    }

    #onSelectDaily(event: JQuery.ClickEvent) {
        event.preventDefault()

        this._selectedDaily = event.currentTarget.dataset.key
        this.render()
    }

    async #onCreateTemplate(event: JQuery.ClickEvent) {
        event.preventDefault()
        const template = this._selectedTemplate

        const customs = getSetting<SavedCustomDaily[]>('customDailies')
        const formData = new FormData(this.form)
        const data = Object.fromEntries(formData) as DailyData
        const isExample = EXAMPLES.includes(template)
        let { key, uuid, label } = data

        if (isExample) {
            key = template
        } else if (!key || !uuid) {
            return localize.warn('template.noEmpty')
        }

        if (customs.find(custom => custom.key === key)) return warn('error.duplicate')

        let code

        if (template === 'trainedSkill') {
            const daily = createTrainedSkillDaily(key, uuid, label)
            code = this.#stringifyDaily(daily, { key, uuid, label }, 'SkillGenerics')
        } else if (template === 'trainedLore') {
            const daily = createTrainedLoreDaily(key, uuid, label)
            code = this.#stringifyDaily(daily, { key, uuid, label }, 'SkillGenerics')
        } else if (template === 'language') {
            const daily = createLanguageDaily(key, uuid, label)
            code = this.#stringifyDaily(daily, { key, uuid, label }, 'LanguageGenerics')
        } else if (template === 'resistance') {
            const resistance = simplyfiable(data.resistance)
            const resistances = splitList(data.resistances)

            if (resistance === '' || !resistances.length) return localize.warn('template.noEmpty')
            if (typeof resistance === 'number' && resistance < 1) return localize.warn('template.badResistance')

            const daily = createResistancelDaily(key, uuid, resistances, resistance, label)
            code = this.#stringifyDaily(daily, { key, uuid, label, resistance, resistances }, 'ResistanceGenerics')
        } else if (template === 'feat') {
            const traits = splitList<FeatTrait>(data.traits)
            const filter: DailyFeatFilter = {
                feattype: splitList<FeatType>(data.feattype),
                level: simplyfiable(data.level) || { min: 0, max: 20 },
            }
            if (traits.length) filter.traits = traits
            const daily = createFeatDaily(key, uuid, filter, label)
            code = this.#stringifyDaily(daily, { key, uuid, label }, 'FeatGenerics')
        } else if (template === 'spell') {
            const level = Number(data.level) || undefined
            const traits = splitList<SpellTrait>(data.traits)
            let levels: (DailySimplifiableValue | string)[] | DailySimplifiableValue = data.levels.split(',').map(x => x.trim())
            if (levels.length === 1) {
                levels = simplyfiable(levels[0]!) as DailySimplifiableValue
            } else {
                levels = levels
                    .filter(x => x)
                    .map(x => Number(x))
                    .filter(x => !isNaN(x)) as number[]
            }
            const filter: DailySpellFilter = {
                category: splitList(data.category),
                traditions: splitList(data.traditions),
                level: (levels || []) as DailySimplifiableValue | number[],
            }
            if (traits.length) filter.traits = traits
            const daily = createSpellDaily(key, uuid, filter, level, label)
            code = this.#stringifyDaily(daily, { key, uuid, label, level }, 'SpellGenerics')
        } else if (template === 'tome') {
            code = tome
        } else if (template === 'flexibility') {
            code = flexibility
        } else if (template === 'savant') {
            code = savant
        } else if (template === 'mind') {
            code = mind
        } else {
            const daily = { key, label, item: { uuid }, rows: [], process: () => {} }
            code = this.#stringifyDaily(daily, { key, uuid, label })
        }

        customs.push({ key, code })
        await setSetting('customDailies', customs)

        this._selectedDaily = key
        this.render()
    }

    #stringifyDaily(daily: Record<string, any>, args: Record<string, any>, type?: string) {
        const placeholder = '____PLACEHOLDER____'
        const fns: Function[] = []

        let str = JSON.stringify(
            daily,
            (_, value) => {
                if (typeof value === 'function') {
                    fns.push(value)
                    return placeholder
                }
                return value
            },
            4
        )

        str = str.replace(new RegExp('"' + placeholder + '"', 'g'), () => {
            const fn = fns.shift()?.toString()
            return fn?.replace(/( {5,})/g, match => match.slice(4)) ?? ''
        })

        let strArgs = ''
        for (const [key, value] of Object.entries(args)) {
            if (typeof value === 'string') strArgs += `const ${key} = '${value}';\n`
            else if (typeof value === 'object') strArgs += `const ${key} = ${JSON.stringify(value)};\n`
            else strArgs += `const ${key} = ${value};\n`
        }

        const typing = type ? `Daily<${type}>` : 'Daily'
        return `${strArgs}\n/** @type {${typing}} */\nconst daily = ${str};\n\nreturn daily;`
    }

    #onSelectTemplate(event: JQuery.ChangeEvent<any, any, HTMLSelectElement>) {
        event.preventDefault()

        this._selectedDaily = ''
        this._selectedTemplate = event.currentTarget.value as DailyTemplateType

        this.render()
    }
}

function splitList<T extends string>(list: string) {
    return list
        .split(',')
        .map(x => x.trim())
        .filter(x => x) as T[]
}

function simplyfiable(value: string | number) {
    if (typeof value === 'number') return value
    value = value.trim()
    if (value === 'level' || value === 'half') return value
    const numbered = Number(value)
    return isNaN(numbered) ? '' : numbered
}
