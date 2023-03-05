type LanguageGenerics = ['language', {}, '']

export function createLanguageDaily(key: string, uuid: ItemUUID, label?: string) {
    const daily: Daily<LanguageGenerics> = {
        key,
        label,
        item: {
            uuid,
        },
        rows: [
            {
                type: 'select',
                slug: 'language',
                options: ({ actor, utils }) => {
                    const actorLanguages = actor.system.traits.languages.value
                    return utils.languageNames.filter(x => !actorLanguages.includes(x)).sort()
                },
                labelizer: ({ utils }) => utils.languageLabel,
            },
        ],
        process: ({ addRule, utils, fields, messages }) => {
            const value = fields.language.value
            const source = utils.createLanguageRuleElement({ language: value })
            addRule(source)
            messages.add('languages', { uuid, selected: utils.languageLabel(value), label })
        },
    }
    return daily
}
