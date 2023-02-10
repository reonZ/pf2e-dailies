import { DailiesInterface } from '@apps/interface'
import { localize } from '@utils/foundry/localize'
import { hasAnyCategory } from './categories'

export function renderCharacterSheetPF2e(sheet: CharacterSheetPF2e, html: JQuery) {
    const actor = sheet.actor
    if (!actor.isOwner || !hasAnyCategory(actor)) return

    const small = html.find('aside .sidebar .hitpoints .hp-small')
    small
        .append(`<a class="roll-icon dailies" title="${localize('sheet.title')}"><i class="fas fa-mug-saucer"></i></a>`)
        .find('.dailies')
        .on('click', () => new DailiesInterface(actor).render(true, { id: `pf2e-dailies-interface-${actor.id}` }))

    // TODO remove with next system update
    small
        .find('[data-action=rest]')
        .off('click')
        .on('click', event => game.pf2e.actions.restForTheNight({ event, actors: actor }))
}
