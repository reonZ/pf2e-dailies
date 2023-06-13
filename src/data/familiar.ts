export function getFamiliarPack() {
    return game.packs.get('pf2e.familiar-abilities')! as CompendiumCollection<EffectPF2e>
}

export function familiarUUID(id: string) {
    return `Compendium.pf2e.familiar-abilities.Item.${id}` as ItemUUID
}
