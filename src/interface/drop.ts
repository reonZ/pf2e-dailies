import { DailyRowDrop } from "daily";
import {
    CompendiumBrowserFeatTab,
    error,
    FeatFilters,
    FeatOrFeatureCategory,
    FeatPF2e,
    getDragEventData,
    getTranslatedSkills,
    htmlClosest,
    htmlQuery,
    localize,
    MagicTradition,
    R,
    Rarity,
    SkillSlug,
    SpellFilters,
    SpellPF2e,
    SpellTrait,
    warning,
} from "module-helpers";
import { DailyInterface } from "./application";

async function onInterfaceDrop(this: DailyInterface, el: HTMLElement, event: DragEvent) {
    const target = htmlQuery<HTMLInputElement>(el, "input");
    if (!target) return;

    const data = getDragEventData(event);

    if (data?.type !== "Item" || typeof data.uuid !== "string") {
        return error("interface.drop.error.wrongDataType");
    }

    const item = await fromUuid<SpellPF2e | FeatPF2e>(data.uuid);
    const compendium = await this.compendiumFilterFromElement(target);

    if (!item || !compendium) {
        return error("interface.drop.error.wrongDataType");
    }

    if (item.parent) {
        return error("interface.drop.error.wrongSource");
    }

    if (item.type !== compendium.type) {
        return dropDataWarning(
            "type",
            game.i18n.localize(`TYPES.Item.${compendium.type}`),
            game.i18n.localize(`TYPES.Item.${item.type}`)
        );
    }

    const dailyRow = this.getDailyRow<DailyRowDrop>(compendium.daily, compendium.row);
    if (dailyRow?.onDrop && typeof dailyRow.onDrop === "function") {
        const result = await dailyRow.onDrop(item as any, this.actor);

        if (result === false) {
            return warning("interface.drop.error.exclude", { item: item.name });
        }
        if (typeof result === "string") {
            return ui.notifications.warn(result);
        }
    }

    const isFeat = item.isOfType("feat");
    const isValid = isFeat
        ? validateFeat(item, compendium.filter as FeatFilters)
        : validateSpell(item, compendium.filter as SpellFilters);

    if (!isValid) return;

    target.value = item.name;
    target.dataset.uuid = item.uuid;

    const clear = htmlQuery(htmlClosest(target, ".drop"), ".clear");
    clear?.classList.remove("disabled");

    if (isFeat) {
        const exists = !!this.actor.itemTypes.feat.find((feat) => feat.sourceId === data.uuid);
        target.classList.toggle("exists", exists);
        target.dataset.tooltip = exists ? target.dataset.cacheTooltip : "";
    }
}

function dropDataWarning(type: string, need?: string | string[], has?: string | string[]) {
    const localizedType = localize("interface.drop.error.type", type);
    const formattedNeed = Array.isArray(need)
        ? need.length === 1
            ? need[0]
            : `[${need.join(", ")}]`
        : need;
    const formattedHas = Array.isArray(has)
        ? has.length === 1
            ? has[0]
            : `[${has.join(", ")}]`
        : has;
    const localizedHas = formattedHas || localize("interface.drop.error.none");
    const localizedRequire =
        need && has
            ? localize("interface.drop.error.require", {
                  need: formattedNeed,
                  has: localizedHas,
              })
            : need
            ? localize("interface.drop.error.missing", { need: formattedNeed })
            : localize("interface.drop.error.invalid", { has: localizedHas });

    warning("interface.drop.error.wrongData", {
        type: localizedType,
        require: localizedRequire,
    });
}

function validateSpell(item: SpellPF2e, filter: SpellFilters): boolean {
    const { checkboxes } = filter;

    const itemRank = String(item.rank);
    const filterRanks = checkboxes.rank.selected;
    if (filterRanks.length && !filterRanks.includes(itemRank)) {
        dropDataWarning("rank", filterRanks, itemRank);
        return false;
    }

    const filterCategories = checkboxes.category.selected as SpellTrait[];
    if (filterCategories.length) {
        const isCantrip = item.isCantrip;
        const isFocusSpell = item.isFocusSpell;
        const isRitual = item.isRitual;
        const isSpell = !isCantrip && !isFocusSpell && !isRitual;
        const categories = R.filter(
            [
                isSpell ? "spell" : null,
                isCantrip ? "cantrip" : null,
                isFocusSpell ? "focus" : null,
                isRitual ? "ritual" : null,
            ] as SpellTrait[],
            R.isTruthy
        );

        const sortedFilterCategories = filterCategories.sort();
        const sortedItemCategories = categories.sort();

        if (!R.isDeepEqual(sortedFilterCategories, sortedItemCategories)) {
            dropDataWarning(
                "categories",
                sortedFilterCategories.map((x) => game.i18n.localize(CONFIG.PF2E.spellTraits[x])),
                sortedItemCategories.map((x) =>
                    game.i18n.localize(CONFIG.PF2E.spellTraits[x] ?? "TYPES.Item.spell")
                )
            );
            return false;
        }
    }

    const filterTraditions = checkboxes.traditions.selected as MagicTradition[];
    const itemTraditions = item.system.traits.traditions as MagicTradition[];
    if (filterTraditions.length && !R.intersection(filterTraditions, itemTraditions).length) {
        dropDataWarning(
            "traditions",
            filterTraditions.map((x) => game.i18n.localize(CONFIG.PF2E.magicTraditions[x])),
            itemTraditions.map((x) => game.i18n.localize(CONFIG.PF2E.magicTraditions[x]))
        );
        return false;
    }

    if (!validateDefault(item, filter)) {
        return false;
    }

    return true;
}

function validateFeat(item: FeatPF2e, filter: FeatFilters): boolean {
    const { checkboxes, level } = filter;

    if (!item.level.between(level.from, level.to)) {
        dropDataWarning("level", `${level.from}-${level.to}`, String(item.level));
        return false;
    }

    const filterCategory = checkboxes.category.selected as FeatOrFeatureCategory[];
    if (filterCategory.length && !filterCategory.includes(item.category)) {
        dropDataWarning(
            "category",
            filterCategory.map((x) => game.i18n.localize(CONFIG.PF2E.featCategories[x])),
            game.i18n.localize(CONFIG.PF2E.featCategories[item.category])
        );
        return false;
    }

    const filterSkills = checkboxes.skills.selected as SkillSlug[];
    if (filterSkills.length) {
        const prereqs: { value: string }[] = item.system.prerequisites.value;
        const prerequisitesArr = prereqs.map((prerequisite) =>
            prerequisite?.value ? prerequisite.value.toLowerCase() : ""
        );
        const translatedSkills = getTranslatedSkills(true);
        const skillList = Object.entries(translatedSkills);
        const skills: Set<SkillSlug> = new Set();

        for (const prereq of prerequisitesArr) {
            for (const [key, value] of skillList) {
                if (prereq.includes(key) || prereq.includes(value)) {
                    skills.add(key as SkillSlug);
                }
            }
        }

        const itemSkills = [...skills];
        const missingSkills = R.difference(filterSkills, itemSkills);

        if (missingSkills.length) {
            dropDataWarning(
                "skills",
                missingSkills.map((x) => translatedSkills[x])
            );
            return false;
        }
    }

    if (!validateDefault(item, filter)) {
        return false;
    }

    return true;
}

function validateDefault(item: FeatPF2e | SpellPF2e, filter: FeatFilters | SpellFilters): boolean {
    const { checkboxes, source, traits } = filter;
    const tab = game.pf2e.compendiumBrowser.tabs[item.type as "spell" | "feat"];
    const itemTraits = item.system.traits.value.map((t: string) => t.replace(/^hb_/, ""));

    if (
        !(tab as CompendiumBrowserFeatTab)["filterTraits"](
            itemTraits,
            traits.selected,
            traits.conjunction
        )
    ) {
        warning("interface.drop.error.wrongTraits");
        return false;
    }

    const filterRarity = checkboxes.rarity.selected as Rarity[];
    if (filterRarity.length && !filterRarity.includes(item.rarity)) {
        dropDataWarning(
            "rarity",
            filterRarity.map((x) => game.i18n.localize(CONFIG.PF2E.rarityTraits[x])),
            game.i18n.localize(CONFIG.PF2E.rarityTraits[item.rarity])
        );
        return false;
    }

    const filterSource = source.selected;
    if (filterSource.length) {
        const { system } = item._source as {
            system: { source?: { value: string }; publication?: { title: string } };
        };
        const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
        const sourceSlug = game.pf2e.system.sluggify(pubSource);

        if (!filterSource.includes(sourceSlug)) {
            dropDataWarning("source", "", pubSource);
            return false;
        }
    }

    return true;
}

export { onInterfaceDrop };
