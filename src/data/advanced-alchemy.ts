import { createDaily, DailyRowSelectOption } from "daily";
import { CharacterPF2e, ItemSourcePF2e, localize, R, sortByLocaleCompare } from "foundry-helpers";

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

type CraftingFormulaLike = {
    uuid: string;
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
    maxSlots: number;
    resource: string | null;
    preparedFormulaData: PreparedFormulaData[];
    getPreparedCraftingFormulas: () => Promise<PreparedFormulaLike[]>;
    getValidFormulas: () => Promise<CraftingFormulaLike[]>;
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

type AlchemyPrepareData = {
    abilities: CraftingAbilityLike[];
    maxSlots: number;
    options: DailyRowSelectOption[];
    defaults: string[];
};

/** Remaster Advanced Alchemy uses isDailyPrep + maxSlots and does not set isAlchemical. */
function isAdvancedAlchemyAbility(ability: CraftingAbilityLike): boolean {
    if (!ability.isDailyPrep) return false;
    return ability.isAlchemical || ability.slug === "advanced-alchemy";
}

function getAlchemicalAbilities(actor: CharacterPF2e): CraftingAbilityLike[] {
    const crafting = (actor as CraftingActor).crafting;
    if (!crafting?.abilities) return [];

    return crafting.abilities.filter(isAdvancedAlchemyAbility);
}

function getAbilityCapacity(actor: CharacterPF2e, ability: CraftingAbilityLike): number {
    if (ability.maxSlots > 0) return ability.maxSlots;

    if (ability.resource) {
        return (actor as CraftingActor).getResource(ability.resource)?.max ?? 0;
    }

    return 0;
}

async function prepareAlchemyData(actor: CharacterPF2e): Promise<AlchemyPrepareData> {
    const abilities = getAlchemicalAbilities(actor);
    const formulaByUuid = new Map<string, string>();
    const defaults: string[] = [];
    let maxSlots = 0;

    for (const ability of abilities) {
        maxSlots += getAbilityCapacity(actor, ability);

        const valid = await ability.getValidFormulas();
        for (const formula of valid) {
            formulaByUuid.set(formula.item.uuid, formula.item.name);
        }

        const prepared = await ability.getPreparedCraftingFormulas();
        for (const formula of prepared) {
            if (formula.expended) continue;
            for (let i = 0; i < formula.quantity; i++) {
                defaults.push(formula.item.uuid);
            }
        }
    }

    const formulaOptions = [...formulaByUuid.entries()].map(([value, label]) => ({ value, label }));
    sortByLocaleCompare(formulaOptions, "label");

    return {
        abilities,
        maxSlots,
        options: [{ value: "", label: "" }, ...formulaOptions],
        defaults: defaults.slice(0, maxSlots),
    };
}

function groupSelections(uuids: string[]): PreparedFormulaData[] {
    const quantities = new Map<string, number>();

    for (const uuid of uuids) {
        if (!uuid) continue;
        quantities.set(uuid, (quantities.get(uuid) ?? 0) + 1);
    }

    return [...quantities.entries()].map(([uuid, quantity]) => ({ uuid, quantity }));
}

const advancedAlchemy = createDaily({
    key: "advanced-alchemy",
    condition: (actor) => getAlchemicalAbilities(actor).length > 0,
    prepare: async (actor) => prepareAlchemyData(actor),
    rows: (_actor, _items, custom) => {
        if (!custom.maxSlots || !custom.options.some((option) => "value" in option && option.value)) {
            return [];
        }

        return R.range(1, custom.maxSlots + 1).map((index) => ({
            type: "select" as const,
            slug: `item${index}`,
            label: localize("label.item", { nb: index }),
            empty: true,
            order: 100,
            options: custom.options,
            selected: custom.defaults[index - 1] ?? "",
        }));
    },
    process: async ({ actor, custom, rows, messages }) => {
        const selections = R.range(1, custom.maxSlots + 1)
            .map((index) => rows[`item${index}`] as string | undefined)
            .filter((uuid): uuid is string => !!uuid);

        const prepared = groupSelections(selections);
        if (!prepared.length || !custom.abilities.length) return;

        // Remaster has a single Advanced Alchemy ability; write prep there.
        // Legacy/archetype isAlchemical entries share the same selection pool.
        const [primary, ...rest] = custom.abilities;
        await primary.updateFormulas(prepared, { render: false });
        for (const ability of rest) {
            await ability.updateFormulas([], { render: false });
        }

        const craftingActor = actor as CraftingActor;
        const results = await Promise.all(custom.abilities.map((ability) => ability.calculateDailyCrafting()));
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

        for (const ability of custom.abilities) {
            const formulas = ability.preparedFormulaData.map((formula) => ({ ...formula, expended: true }));
            await ability.updateFormulas(formulas, { render: false });
        }

        await craftingActor.inventory.add(itemsToAdd, { stack: true });

        const names = new Map(custom.options.flatMap((option) => ("value" in option && option.value ? [[option.value, option.label] as const] : [])));

        messages.addGroup("alchemy", undefined, 35);
        for (const item of prepared) {
            messages.add("alchemy", {
                uuid: item.uuid,
                label: localize("interface.advanced-alchemy.item", {
                    name: names.get(item.uuid) ?? item.uuid,
                    quantity: item.quantity ?? 1,
                }),
            });
        }
    },
});

export { advancedAlchemy };
