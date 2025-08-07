import {
    ActorPF2e,
    addListener,
    CharacterPF2e,
    createHTMLElement,
    EquipAnnotationData,
    getFlag,
    htmlQuery,
    localize,
    NPCPF2e,
    R,
    render,
    setFlag,
    SpellcastingEntryPF2eWithCharges,
    waitDialog,
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

function addRetrainBtn(
    actor: ActorPF2e,
    controls: Maybe<HTMLElement>,
    path: string,
    isOwner: boolean,
    selectedId: string,
    type: string
) {
    const btn = createHTMLElement(isOwner ? "a" : "span", {
        content: `<i class="fa-solid fa-retweet"></i>`,
        dataset: {
            action: "dailies-retrain",
            tooltip: localize("sheet.retrain", { type }),
        },
    });

    controls?.prepend(btn);

    if (isOwner) {
        btn.addEventListener("click", async (event) => {
            await retrain(actor, path, selectedId, type);
        });
    }
}

async function retrain(actor: ActorPF2e, path: string, selectedId: string, type: string) {
    const selected = actor.items.get(selectedId);
    const ids = getFlag<string[]>(actor, path) ?? [];
    if (!selected || !ids.length || ids.includes(selectedId)) return;

    const options = R.pipe(
        ids,
        R.map((id) => {
            const item = actor.items.get(id);
            if (!item) return;

            return {
                label: item.name,
                value: id,
            };
        }),
        R.filter(R.isTruthy),
        R.sortBy(R.prop("label"))
    );

    const result = await waitDialog<{ id: string }>({
        classes: ["pf2e-dailies-retrain"],
        content: "retrain",
        data: {
            name: actor.name,
            selected: selected.name,
            options,
            type,
        },
        i18n: "retrain",
        minWidth: "500px",
        yes: {
            icon: "fa-solid fa-retweet",
        },
    });

    if (!result || !ids.includes(result.id)) return;

    const newIds = ids.map((x) => (x === result.id ? selectedId : x));
    await setFlag(actor, path, newIds);

    const previous = actor.items.get(result.id);
    const ChatMessagePF2e = getDocumentClass("ChatMessage");

    let content = `<div class="pf2e-dailies-retrain">${localize("retrain.content", { type })}`;

    if (previous) {
        content += `<div class="previous">${previous.link}</div>`;
    }

    content += `<div class="new">${selected.link}</div></div>`;

    return ChatMessagePF2e.create({
        content,
        speaker: ChatMessagePF2e.getSpeaker({ actor }),
    });
}

export { addRetrainBtn, createChargesElement, renderChargesEntries };
