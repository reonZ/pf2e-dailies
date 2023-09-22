export function getFamiliarPack() {
    return game.packs.get('pf2e.familiar-abilities')
}

export function familiarUUID(id) {
    return `Compendium.pf2e.familiar-abilities.Item.${id}`
}
