export function getFamiliarPack() {
    return game.packs.get<CompendiumCollection<EffectPF2e>>('pf2e.familiar-abilities')!
}

export function familiarUUID(id: string) {
    return `Compendium.pf2e.familiar-abilities.${id}` as ItemUUID
}
