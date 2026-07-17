import { createDaily } from "daily";
import { CharacterPF2e, ItemSourcePF2e, localize } from "foundry-helpers";

type PreparedFormulaData = {
    uuid: string;
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
};

type PreparedFormulaLike = {
    uuid: string;
    quantity: number;
    expended: boolean;
    item: { name: string; uuid: string };
};

type DailyCraftingResultLike = {
    items: PreCreate<ItemSourcePF2e>[];
    resource: { slug: string; cost: number } | null;
    insufficient: boolean;
};

type CraftingAbilityLike = {
    slug: string;
    isAlchemical: boolean;
    isDailyPrep: boolean;
    preparedFormulaData: PreparedFormulaData[];
    getPreparedCraftingFormulas: () => Promise<PreparedFormulaLike[]>;
    calculateDailyCrafting: () => Promise<DailyCraftingResultLike>;
    updateFormulas: (formulas: PreparedFormulaData[], operation?: object) => Promise<void>;
};

type CharacterCraftingLike = {
    abilities: {
        filter: (predicate: (ability: CraftingAbilityLike) => boolean) => CraftingAbilityLike[];
    };
};

type CraftingActor = CharacterPF2e & {
    crafting?: CharacterCraftingLike;
    getResource: (slug: string) => { value: number; max: number } | null | undefined;
    updateResource: (slug: string, value: number, operation?: object) => Promise<unknown>;
    inventory: CharacterPF2e["inventory"] & {
        add: (items: PreCreate<ItemSourcePF2e>[], options?: { stack?: boolean }) => Promise<unknown>;
    };
};

type PreparedAlchemyItem = {
    uuid: string;
    name: string;
    quantity: number;
};

function getAlchemicalAbilities(actor: CharacterPF2e): CraftingAbilityLike[] {
    const crafting = (actor as CraftingActor).crafting;
    if (!crafting?.abilities) return [];

    return crafting.abilities.filter((ability) => ability.isAlchemical && ability.isDailyPrep);
}

async function getPreparedAlchemyItems(actor: CharacterPF2e): Promise<PreparedAlchemyItem[]> {
    const abilities = getAlchemicalAbilities(actor);
    const prepared: PreparedAlchemyItem[] = [];

    for (const ability of abilities) {
        const formulas = await ability.getPreparedCraftingFormulas();

        for (const formula of formulas) {
            if (formula.expended) continue;

            prepared.push({
                uuid: formula.item.uuid,
                name: formula.item.name,
                quantity: formula.quantity,
            });
        }
    }

    return prepared;
}

const advancedAlchemy = createDaily({
    key: "advanced-alchemy",
    condition: (actor) => getAlchemicalAbilities(actor).length > 0,
    prepare: async (actor) => {
        return {
            prepared: await getPreparedAlchemyItems(actor),
        };
    },
    rows: (_actor, _items, custom) => {
        if (!custom.prepared.length) {
            return [
                {
                    type: "notify",
                    slug: "empty",
                    message: localize("interface.advanced-alchemy.empty"),
                },
            ];
        }

        return custom.prepared.map((item, index) => ({
            type: "notify" as const,
            slug: `item${index}`,
            message: localize("interface.advanced-alchemy.item", {
                name: item.name,
                quantity: item.quantity,
            }),
        }));
    },
    process: async ({ actor, custom, messages }) => {
        if (!custom.prepared.length) return;

        const craftingActor = actor as CraftingActor;
        const abilities = getAlchemicalAbilities(actor);
        if (!abilities.length) return;

        const results = await Promise.all(abilities.map((ability) => ability.calculateDailyCrafting()));
        const itemsToAdd = results.flatMap((result) => result.items);
        if (!itemsToAdd.length) return;

        if (results.some((result) => result.insufficient)) {
            ui.notifications.warn("PF2E.Actor.Character.Crafting.MissingResource", { localize: true });
            return;
        }

        const resourceCosts = results.reduce((costs: Record<string, number>, result) => {
            if (result.resource) {
                costs[result.resource.slug] ??= 0;
                costs[result.resource.slug] += result.resource.cost;
            }
            return costs;
        }, {});

        const resourceUpdates: Record<string, number> = {};
        for (const [slug, cost] of Object.entries(resourceCosts)) {
            const resource = craftingActor.getResource(slug);
            if (!resource || cost > resource.value) {
                ui.notifications.warn("PF2E.Actor.Character.Crafting.MissingResource", { localize: true });
                return;
            }

            resourceUpdates[slug] = resource.value - cost;
        }

        for (const [slug, value] of Object.entries(resourceUpdates)) {
            await craftingActor.updateResource(slug, value, { render: false });
        }

        for (const ability of abilities) {
            const formulas = ability.preparedFormulaData.map((formula) => ({ ...formula, expended: true }));
            await ability.updateFormulas(formulas, { render: false });
        }

        await craftingActor.inventory.add(itemsToAdd, { stack: true });

        messages.addGroup("alchemy", undefined, 35);

        for (const item of custom.prepared) {
            messages.add("alchemy", {
                uuid: item.uuid,
                label: localize("interface.advanced-alchemy.item", {
                    name: item.name,
                    quantity: item.quantity,
                }),
            });
        }
    },
});

export { advancedAlchemy };
