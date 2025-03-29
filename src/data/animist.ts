import {
    createHTMLElement,
    getActorMaxRank,
    getFlag,
    getUuidFromInlineMatch,
    htmlQuery,
    ItemPF2e,
    localize,
    R,
    setFlagProperty,
    SpellSource,
    splitListString,
} from "module-helpers";
import { getAnimistConfigs } from "../api";
import { HomebrewDailies } from "../apps/homebrew";
import { createDaily } from "../daily";
import { DailyConfigCheckbox } from "../types";
import { utils } from "../utils";

const LORE_STRIP_REGEX = /^(.+?) Lore$/;

const UUID_REGEX = /@(uuid|compendium)\[([a-z0-9\._-]+)\]/gi;

const AVATAR_UUID = "Compendium.pf2e.spells-srd.Item.ckUOoqOM7Kg7VqxB";
const HEAL_UUID = "Compendium.pf2e.spells-srd.Item.rfZpqmj0AIIdkVIs";
const HARM_UUID = "Compendium.pf2e.spells-srd.Item.wdA52JJnsuQWeyqz";
const ANIMAL_FORM_UUID = "Compendium.pf2e.spells-srd.Item.wp09USMB3GIW1qbp";

// level 1 to 20 / rank 1 to 9
const SPELLS_SLOTS = [
    [1, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 0, 0, 0, 0],
    [2, 2, 2, 1, 1, 0, 0, 0, 0],
    [2, 2, 2, 2, 1, 1, 0, 0, 0],
    [2, 2, 2, 2, 1, 1, 0, 0, 0],
    [2, 2, 2, 2, 2, 1, 1, 0, 0],
    [2, 2, 2, 2, 2, 1, 1, 0, 0],
    [2, 2, 2, 2, 2, 2, 1, 1, 0],
    [2, 2, 2, 2, 2, 2, 1, 1, 0],
    [2, 2, 2, 2, 2, 2, 2, 1, 1],
    [2, 2, 2, 2, 2, 2, 2, 1, 1],
    [2, 2, 2, 2, 2, 2, 2, 2, 1],
    [2, 2, 2, 2, 2, 2, 2, 2, 1],
] as const;

const animist = createDaily({
    key: "animist",
    items: [
        {
            slug: "attunement", // Apparition Attunement
            uuid: "Compendium.pf2e.classfeatures.Item.AHMjKkIx21AoMc9W",
            required: true,
        },
        {
            slug: "third", // Third Apparition
            uuid: "Compendium.pf2e.classfeatures.Item.bRAjde9LlavcOUuM",
        },
        {
            slug: "fourth", // Fourth Apparition
            uuid: "Compendium.pf2e.classfeatures.Item.avLo2Jl3mNWssp0W",
        },
        {
            slug: "supreme", // Supreme Incarnation
            uuid: "Compendium.pf2e.classfeatures.Item.1MHXjNczVZfVvDP6",
        },
        {
            slug: "balance", // Embodiment of the Balance
            uuid: "Compendium.pf2e.feats-srd.Item.8Y9DCalsSnXHDCeV",
        },
        {
            slug: "walk", // Walk the Wilds
            uuid: "Compendium.pf2e.feats-srd.Item.zKUtZxlQw5jWnX9z",
        },
        {
            slug: "medium", // Medium
            uuid: "Compendium.pf2e.classfeatures.Item.k6c2gesVQ8QuEWGm",
        },
        {
            slug: "spirit", // Circle of Spirits
            uuid: "Compendium.pf2e.feats-srd.Item.M8jbV0il124Ve5oV",
        },
    ],
    label: (actor, items) => items.attunement.name,
    rows: async (actor, items) => {
        const pack = game.packs.get("pf2e.classfeatures");
        if (!pack) return [];

        const uniqueId = foundry.utils.randomID();
        const nbPrimary = items.medium && actor.level >= 9 ? 2 : 1;
        const index = await pack.getIndex({ fields: ["system.traits.otherTags"] });
        const apparitions = index.filter((entry) =>
            entry.system.traits.otherTags?.includes("animist-apparition")
        );
        const options = R.pipe(
            apparitions,
            R.map(({ name, uuid }) => ({ value: uuid, label: name })),
            R.sortBy(R.prop("label"))
        );

        for (const { entry } of HomebrewDailies.getEntries("animist")) {
            options.push({
                value: entry.uuid,
                label: entry.name,
            });
        }

        let nbApparitions = 2;
        if (items.third) nbApparitions += 1;
        if (items.fourth) nbApparitions += 1;

        return R.range(1, nbApparitions + 1).map((i) => {
            const labelKey = i <= nbPrimary ? (nbPrimary > 1 ? "primary" : "first") : "other";

            return {
                type: "select",
                slug: `apparition${i}`,
                label: localize(`label.apparition.${labelKey}`, { nb: i }),
                unique: uniqueId,
                options: options,
            };
        });
    },
    process: async ({ actor, rows, messages, items, addItem, addFeat, addRule }) => {
        const parent = items.attunement;
        const actorLevel = actor.level;
        const maxRank = getActorMaxRank(actor);
        const loreRank = actorLevel >= 16 ? 3 : actorLevel >= 8 ? 2 : 1;
        const spellsToAdd: { source: SpellSource; uuid: string }[] = [];
        const vesselsToAdd: { source: SpellSource; uuid: string }[] = [];
        const spellsIdentifier = "animist-spontaneous";
        const vesselsIdentifier = "animist-focus";
        const animistConfig = getAnimistConfigs(actor);
        const nbPrimary = items.medium && actor.level >= 9 ? 2 : 1;

        messages.addGroup("apparition", undefined, 100);

        const addSpell = async (uuid: string, signature: boolean) => {
            const source = await utils.createSpellSource(uuid, {
                identifier: spellsIdentifier,
                signature: animistConfig.signatures || signature,
            });

            if (source.system.level.value > maxRank) return;

            spellsToAdd.push({ source, uuid });
        };

        let nbApparitions = 0;
        let nbActualPrimary = 0;

        await Promise.all(
            Object.values(rows).map(async (value, index) => {
                const item = await fromUuid<ItemPF2e>(value);
                if (!item?.isOfType("feat")) return;

                nbApparitions++;

                const itemSource = item.toObject();
                addFeat(itemSource, parent);

                const descriptionEl = createHTMLElement("div", { innerHTML: item.description });

                const loresEl = htmlQuery(descriptionEl, "hr + p");
                const lores = splitListString(loresEl?.childNodes[1].textContent?.trim() ?? "");
                const filteredLores = R.filter(lores, R.isTruthy);
                for (const lore of filteredLores) {
                    const name = animistConfig.lore ? lore.replace(LORE_STRIP_REGEX, "$1") : lore;
                    const loreSource = utils.createLoreSource({ name, rank: loreRank });

                    addItem(loreSource);

                    if (animistConfig.lores) {
                        messages.add("skills", { label: name });
                    }
                }

                const spellsEl = htmlQuery(descriptionEl, "ul");
                if (spellsEl) {
                    UUID_REGEX.lastIndex = 0;

                    const text = spellsEl.textContent ?? "";
                    const uuids = Array.from(text.matchAll(UUID_REGEX)).map(getUuidFromInlineMatch);

                    await Promise.all(uuids.map((uuid) => addSpell(uuid, false)));
                }

                const isPrimary = index < nbPrimary;

                if (isPrimary) {
                    nbActualPrimary++;
                }

                const vesselEl = spellsEl?.nextElementSibling as HTMLElement | undefined;
                if (vesselEl) {
                    UUID_REGEX.lastIndex = 0;

                    const match = UUID_REGEX.exec(vesselEl.textContent ?? "");
                    const uuid = match ? getUuidFromInlineMatch(match) : null;

                    if (uuid) {
                        const source = await utils.createSpellSource(uuid, {
                            identifier: vesselsIdentifier,
                        });

                        setFlagProperty(source, "isPrimary", isPrimary);

                        vesselsToAdd.push({ source, uuid });
                    }
                }

                messages.add("apparition", { uuid: item });
            })
        );

        const extraSpells: string[] = [];

        if (items.supreme) extraSpells.push(AVATAR_UUID);
        if (items.balance) extraSpells.push(HEAL_UUID, HARM_UUID);
        if (items.walk) extraSpells.push(ANIMAL_FORM_UUID);

        // add extraSpells
        await Promise.all(extraSpells.map((uuid) => addSpell(uuid, uuid !== AVATAR_UUID)));

        const attribute = actor.classDC?.attribute ?? "wis";

        const vessels = R.uniqueBy(vesselsToAdd, R.prop("uuid"));
        if (vessels.length) {
            const spellsEntry = utils.createSpellcastingEntrySource({
                category: "focus",
                identifier: vesselsIdentifier,
                name: localize("animist.spellcasting.focus"),
                tradition: "divine",
                attribute,
                showSlotlessRanks: false,
            });

            addItem(spellsEntry);

            for (const { source, uuid } of vessels) {
                addItem(source);

                if (animistConfig.spells) {
                    messages.add("spells", { uuid });
                }
            }
        }

        const spells = R.uniqueBy(spellsToAdd, R.prop("uuid"));
        if (spells.length) {
            const spellsEntry = utils.createSpellcastingEntrySource({
                category: "spontaneous",
                identifier: spellsIdentifier,
                name: parent.name,
                tradition: "divine",
                attribute,
                showSlotlessRanks: false,
            });

            const maxSlotsRank = Math.min(maxRank, 9);
            const levelSlots = SPELLS_SLOTS[actorLevel - 1];

            for (let i = 1; i <= maxSlotsRank; i++) {
                const slots = levelSlots[i - 1];

                foundry.utils.setProperty(spellsEntry, `system.slots.slot${i}`, {
                    value: slots,
                    max: slots,
                });
            }

            if (items.supreme && actorLevel >= 19) {
                foundry.utils.setProperty(spellsEntry, "system.slots.slot10", {
                    value: 1,
                    max: 1,
                });
            }

            addItem(spellsEntry);

            for (const { source, uuid } of spells) {
                addItem(source);

                if (animistConfig.spells) {
                    messages.add("spells", { uuid });
                }
            }
        }

        const focusPoints = items.spirit ? nbApparitions : items.medium ? nbActualPrimary : 1;

        if (vessels.length > focusPoints) {
            addRule(parent, {
                key: "ActiveEffectLike",
                mode: "subtract",
                path: "system.resources.focus.max",
                priority: 9,
                value: vessels.length - focusPoints,
            });
        }
    },
    afterItemAdded: async ({ addedItems, setExtraFlags }) => {
        const primaryVessels = R.pipe(
            addedItems,
            R.filter((item) => item.isOfType("spell") && !!getFlag(item, "isPrimary")),
            R.map((item) => item.id)
        );

        setExtraFlags({ primaryVessels });
    },
    config: (actor) => {
        return R.pipe(
            R.entries(getAnimistConfigs(actor)),
            R.map(([name, value]): DailyConfigCheckbox => {
                return {
                    type: "checkbox",
                    name,
                    value,
                    label: localize("config.animist", name),
                };
            })
        );
    },
});

export { animist };
