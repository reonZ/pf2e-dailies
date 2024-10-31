import {
    createHTMLElement,
    getActorMaxRank,
    getUuidFromInlineMatch,
    htmlQuery,
    localize,
    R,
    splitListString,
} from "foundry-pf2e";
import { createDaily } from "../daily";
import { utils } from "../utils";
import { getAnimistConfigs } from "../api";

const LORE_STRIP_REGEX = /^(.+?) Lore$/;

const UUID_REGEX = /@(uuid|compendium)\[([a-z0-9\._-]+)\]/gi;

const AVATAR_UUID = "Compendium.pf2e.spells-srd.Item.ckUOoqOM7Kg7VqxB";
const HEAL_UUID = "Compendium.pf2e.spells-srd.Item.rfZpqmj0AIIdkVIs";
const HARM_UUID = "Compendium.pf2e.spells-srd.Item.wdA52JJnsuQWeyqz";

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

function getPack(): CompendiumCollection<FeatPF2e<null>> {
    return game.packs.get("pf2e.classfeatures")!;
}

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
    ],
    label: (actor, items) => items.attunement.name,
    rows: async (actor, items) => {
        const pack = getPack();
        const uniqueId = foundry.utils.randomID();
        const index = await pack.getIndex({ fields: ["system.traits.otherTags"] });
        const apparitions = index.filter((entry) =>
            entry.system.traits.otherTags?.includes("animist-apparition")
        );
        const options = R.pipe(
            apparitions,
            R.map(({ name, _id }) => ({ value: _id, label: name })),
            R.sortBy(R.prop("label"))
        );

        let nbApparitions = 2;
        if (items.third) nbApparitions += 1;
        if (items.fourth) nbApparitions += 1;

        return R.range(1, nbApparitions + 1).map((i) => {
            return {
                type: "select",
                slug: `apparition${i}`,
                label: localize(`label.apparition.${i === 1 ? "first" : "other"}`, { nb: i }),
                unique: uniqueId,
                options: options,
            };
        });
    },
    process: async ({ actor, rows, messages, items, addItem, addFeat }) => {
        const pack = getPack();
        const parent = items.attunement;
        const actorLevel = actor.level;
        const maxRank = getActorMaxRank(actor);
        const loreRank = actorLevel >= 16 ? 3 : actorLevel >= 8 ? 2 : 1;
        const spellsToAdd: { source: SpellSource; uuid: string }[] = [];
        const vesselsToAdd: { source: SpellSource; uuid: string }[] = [];
        const spellsIdentifier = "animist-spontaneous";
        const vesselsIdentifier = "animist-focus";
        const animistConfig = getAnimistConfigs(actor);

        messages.addGroup("apparition", undefined, 100);

        await Promise.all(
            Object.values(rows).map(async (value, index) => {
                const item = await pack.getDocument(value);
                if (!item) return;

                const itemSource = item.toObject();
                addFeat(itemSource, parent);

                const descriptionEl = createHTMLElement("div", { innerHTML: item.description });

                const loresEl = htmlQuery(descriptionEl, "hr + p");
                const lores = splitListString(loresEl?.childNodes[1].textContent?.trim() ?? "");
                const filteredLores = R.filter(lores, R.isTruthy);
                for (const lore of filteredLores) {
                    const name = lore.replace(LORE_STRIP_REGEX, "$1");
                    const loreSource = utils.createLoreSource({ name, rank: loreRank });

                    addItem(loreSource);

                    if (animistConfig.lores) {
                        messages.add("skills", { label: name });
                    }
                }

                const spellsEl = loresEl?.nextElementSibling as HTMLElement | undefined;
                if (spellsEl) {
                    UUID_REGEX.lastIndex = 0;

                    const text = spellsEl.textContent ?? "";
                    const uuids = Array.from(text.matchAll(UUID_REGEX)).map(getUuidFromInlineMatch);

                    const spellsSources = R.filter(
                        await Promise.all(
                            uuids.map(async (uuid) => {
                                const source = await utils.createSpellSource(uuid, {
                                    identifier: spellsIdentifier,
                                });
                                return { source, uuid };
                            })
                        ),
                        R.isTruthy
                    );

                    for (const { source, uuid } of spellsSources) {
                        if (source.system.level.value > maxRank) continue;
                        spellsToAdd.push({ source, uuid });
                    }
                }

                if (index === 0) {
                    const vesselEl = spellsEl?.nextElementSibling as HTMLElement | undefined;
                    if (vesselEl) {
                        UUID_REGEX.lastIndex = 0;

                        const match = UUID_REGEX.exec(vesselEl.textContent ?? "");
                        const uuid = match ? getUuidFromInlineMatch(match) : null;

                        if (uuid) {
                            const source = await utils.createSpellSource(uuid, {
                                identifier: vesselsIdentifier,
                            });
                            vesselsToAdd.push({ source, uuid });
                        }
                    }
                }

                messages.add("apparition", { uuid: item });
            })
        );

        const extraSpells: string[] = [];

        if (items.supreme) extraSpells.push(AVATAR_UUID);
        if (items.balance) extraSpells.push(HEAL_UUID, HARM_UUID);

        for (const uuid of extraSpells) {
            const source = await utils.createSpellSource(uuid, {
                identifier: spellsIdentifier,
                signature: uuid !== AVATAR_UUID,
            });
            spellsToAdd.push({ source, uuid });
        }

        const attribute = actor.classDC?.attribute ?? "wis";

        if (vesselsToAdd.length) {
            const spellsEntry = utils.createSpellcastingEntrySource({
                category: "focus",
                identifier: vesselsIdentifier,
                name: localize("animist.spellcasting.focus"),
                tradition: "divine",
                attribute,
                showSlotlessRanks: false,
            });

            addItem(spellsEntry);

            for (const { source, uuid } of vesselsToAdd) {
                addItem(source);

                if (animistConfig.spells) {
                    messages.add("spells", { uuid });
                }
            }
        }

        if (spellsToAdd.length) {
            const spellsEntry = utils.createSpellcastingEntrySource({
                category: "spontaneous",
                identifier: spellsIdentifier,
                name: items.attunement.name,
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

            for (const { source, uuid } of spellsToAdd) {
                addItem(source);

                if (animistConfig.spells) {
                    messages.add("spells", { uuid });
                }
            }
        }
    },
});

export { animist };
