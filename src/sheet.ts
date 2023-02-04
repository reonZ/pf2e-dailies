import { DailiesInterface } from '@apps/interface'
import { localize } from '@utils/foundry/localize'
import { hasAnyFeat } from './feats'

export function renderCharacterSheetPF2e(sheet: CharacterSheetPF2e, html: JQuery) {
    const actor = sheet.actor
    if (!hasAnyFeat(actor)) return

    const title = localize('sheet.title')
    const link = `<a class="roll-icon dailies" title="${title}"><i class="fas fa-mug-saucer"></i></a>`
    html.find('aside .sidebar .hitpoints .hp-small')
        .append(link)
        .find('.dailies')
        .on('click', () => new DailiesInterface(actor).render(true, { id: `pf2e-dailies-interface-${actor.id}` }))
}
