import { getFlag, setFlag } from '~src/@utils/foundry/flags'
import { subLocalize } from '~src/@utils/foundry/i18n'
import { warn } from '~src/@utils/foundry/notifications'
import { templatePath } from '~src/@utils/foundry/path'
import { getScrollCompendiumUUID } from '~src/@utils/pf2e'
import { hasAllFeats } from '~src/feats'

const localize = subLocalize('app')

export class PF2eDailies extends Application {
    private _actor: CharacterPF2e

    constructor(actor: CharacterPF2e) {
        super({ id: `pf2e-dailies-${actor.id}` })
        this._actor = actor
    }

    static get defaultOptions(): ApplicationOptions {
        return mergeObject(super.defaultOptions, {
            title: localize('title'),
            template: templatePath('app.html'),
            height: 'auto',
            dragDrop: [
                {
                    dropSelector: '[name="spell"]',
                },
            ],
        })
    }

    getData(options?: Partial<ApplicationOptions>) {
        const actor = this._actor
        const saved = getFlag<ItemFlags>(actor, 'saved') ?? ({} as ItemFlags)
        const feats = hasAllFeats(actor)

        return {
            i18n: localize,
            feats,
            saved,
            level: actor.level,
            getSpellValue: (values: ItemFlag[] | undefined, level: number, attr: 'name' | 'uuid') =>
                values?.[level - 1]?.[attr] ?? '',
            addOne: (v: number) => v + 1,
        }
    }

    activateListeners(html: JQuery<HTMLElement>): void {
        super.activateListeners(html)

        html.find<HTMLAnchorElement>('[data-type=spell] [data-action=search]').on('click', this.#onSpellSearch.bind(this))
        html.find<HTMLAnchorElement>('[data-action=clear]').on('click', this.#onClear.bind(this))
        html.find<HTMLButtonElement>('[data-action=accept]').on('click', this.#onAccept.bind(this))
        html.find<HTMLButtonElement>('[data-action=cancel]').on('click', this.#onCancel.bind(this))
    }

    protected async _onDrop(event: ElementDragEvent) {
        const dataString = event.dataTransfer?.getData('text/plain')
        try {
            const input = $(event.target)
            const typeError = () => warn('app.error.wrongType')

            const data: { type: string; uuid: string } = JSON.parse(dataString)
            if (!data || data.type !== 'Item' || typeof data.uuid !== 'string') return typeError()

            const item = await fromUuid<ItemPF2e>(data.uuid)
            if (!item?.isOfType('spell') || item.isCantrip || item.isRitual) return typeError()

            if (item.level > Number(input.attr('data-level'))) return warn('app.error.wrongLevel')

            input.attr('value', item.name)
            input.attr('data-uuid', item.uuid)
            input.nextAll('[data-action="clear"]').first().removeClass('disabled')
        } catch {}
    }

    #onSpellSearch(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()

        const level = Number(event.currentTarget.dataset.level)
        const levels: number[] = []

        for (let i = 0; i < level; i++) {
            levels[i] = i + 1
        }

        const filter: InitialSpellFilters = {
            category: ['spell'],
            classes: [],
            level: levels,
            rarity: [],
            school: [],
            source: [],
            traditions: [],
            traits: [],
        }

        game.pf2e.compendiumBrowser.openTab('spell', filter)
    }

    #onClear(event: JQuery.ClickEvent<any, any, HTMLAnchorElement>) {
        event.preventDefault()
        const target = $(event.currentTarget)
        const input = target.prevAll('[name="spell"]').first()
        input.attr('value', '')
        input.attr('data-uuid', '')
        target.addClass('disabled')
    }

    #lock() {
        this.element.find('button').attr('disabled', 'true')
        this.element.find('a').addClass('disabled')
    }

    async #onAccept(event: JQuery.ClickEvent) {
        event.preventDefault()
        this.#lock()

        const actor = this._actor
        const groups = {} as ItemFlags
        const add: (ItemFlag & { level: OneToTen; category: FeatGroup })[] = []
        let message = ''

        this.element.find('.window-content .groups .group').each((_, el) => {
            const group = $(el)
            const category = group.attr('data-category') as FeatGroup

            group.find<HTMLInputElement>('[name="spell"], [name="talisman"]').each((i, el) => {
                const input = $(el)
                const uuid = input.attr('data-uuid') as ItemUUID
                const level = Number(input.attr('data-level')) as OneToTen
                const name = input.attr('value') as string
                const value = { name, uuid }

                if (uuid) add.push({ name, uuid, level, category })

                groups[category] ??= []
                groups[category][i] = value
            })
        })

        if (add.length) {
            const data: ConsumableSource[] = []
            const scrolls: (ConsumablePF2e | null)[] = []

            for (const entry of add) {
                const uuid = entry.uuid
                const level = entry.level
                const category = localize(entry.category)
                const scrollUUID = getScrollCompendiumUUID(level)

                scrolls[level] ??= await fromUuid<ConsumablePF2e>(scrollUUID)

                const spell = (await fromUuid<SpellPF2e>(uuid))?.toObject() as SpellSource
                const item = scrolls[level]?.toObject() as unknown as ConsumableSource
                if (!item || !spell) continue

                spell.system.location.heightenedLevel = level

                item.name = localize('item.spell.name', { name: spell.name, level: level })
                item.system.temporary = true
                item.system.spell = spell
                item.system.traits.value.push(...spell.system.traditions.value)
                item.system.description.value = localize('item.spell.description', {
                    category,
                    uuid: uuid,
                    description: item.system.description.value,
                })

                data.push(item)
            }

            message = `<p>${localize(`message.add`)}</p>`

            const items = (await actor.createEmbeddedDocuments('Item', data)) as ItemPF2e[]
            items.map(x => (message += `<p>@UUID[${x.uuid}]</p>`))
        }

        setFlag(actor, 'saved', groups)

        if (message) message = `${localize('message.changes')}<hr>${message}`
        else message = localize('message.noChanges')
        ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) })

        this.close()
    }

    #onCancel(event: JQuery.ClickEvent) {
        event.preventDefault()
        this.close()
    }
}
