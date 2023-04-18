import { localize } from '@utils/foundry/localize'
import { openDailiesInterface } from './api'
import { hasAnyDaily } from './dailies'

export function renderCharacterSheetPF2e(sheet: CharacterSheetPF2e, html: JQuery) {
    const actor = sheet.actor
    if (!actor.isOwner || !hasAnyDaily(actor)) return

    const small = html.find('aside .sidebar .hitpoints .hp-small')
    small
        .append(`<a class="roll-icon dailies" data-tooltip="${localize('sheet.title')}"><i class="fas fa-mug-saucer"></i></a>`)
        .find('.dailies')
        .on('click', () => openDailiesInterface(actor, true))
}
