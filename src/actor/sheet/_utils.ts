import {
    ActorPF2e,
    addListener,
    CharacterPF2e,
    createHTMLElement,
    EquipAnnotationData,
    htmlQuery,
    NPCPF2e,
    render,
    SpellcastingEntryPF2eWithCharges,
} from "module-helpers";

async function renderChargesEntries(
    actor: CharacterPF2e | NPCPF2e,
    parentElement: HTMLElement,
    callback: (
        entryContainer: HTMLElement,
        chargesElement: HTMLElement,
        toggleElement: HTMLElement
    ) => void
) {
    const entries = actor.spellcasting.regular as SpellcastingEntryPF2eWithCharges[];
    const chargesEntries = entries.filter((entry) => entry.system.prepared.value === "charges");

    for (const entry of chargesEntries) {
        const entryContainer = htmlQuery(parentElement, `[data-container-id="${entry.id}"]`);
        if (!entryContainer) continue;

        const charges = entry.system.slots.slot1;
        const chargesElement = await createChargesElement(actor, charges, true);

        addListener(
            chargesElement,
            "[data-action='change-charges']",
            "change",
            (el: HTMLInputElement) => {
                const value = Math.clamp(el.valueAsNumber, 0, charges.max);
                entry.update({ "system.slots.slot1.value": value });
            }
        );

        addListener(
            chargesElement,
            "[data-action='change-max-charges']",
            "change",
            (el: HTMLInputElement) => {
                const value = Math.max(el.valueAsNumber, 0);
                entry.update({
                    "system.slots.slot1.max": value,
                    "system.slots.slot1.value": Math.min(value, charges.value),
                });
            }
        );

        addListener(chargesElement, "[data-action='reset-charges']", async () => {
            entry.update({ "system.slots.slot1.value": charges.max });
        });

        const classStr = entry.showSlotlessRanks ? "fa-solid" : "fa-regular";
        const toggleElement = createHTMLElement("a", {
            content: `<i class="${classStr} fa-fw fa-list-alt"></i>`,
            dataset: {
                action: "toggle-show-slotless-ranks",
                tooltip: "PF2E.ToggleSlotlessSpellLevelsTitle",
            },
        });

        callback?.(entryContainer, chargesElement, toggleElement);
    }
}

async function createChargesElement(
    actor: ActorPF2e,
    charges: { value: number; max: number },
    withMax: boolean,
    annotation?: EquipAnnotationData
) {
    if (annotation) {
        annotation.label = game.i18n.localize(annotation.label).replace(/\(.+?\)/, "");
    }

    const isOwner = actor.isOwner;
    const chargesTemplate = await render("charges", {
        isOwner,
        charges,
        withMax,
        annotation,
        i18n: "sheet.charges",
    });

    const classes = ["pf2e-dailies-charges"];

    if (withMax) {
        classes.push("double");
    }

    return createHTMLElement("div", {
        classes,
        content: chargesTemplate,
    });
}

export { createChargesElement, renderChargesEntries };
