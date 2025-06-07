import {
    onActorPrepareEmbeddedDocuments,
    onCharacterPrepareData,
    onCharacterSheetGetData,
} from "actor";
import { registerWrapper } from "module-helpers";
import { restForTheNight } from "rest";
import {
    spellcastingEntryConsume,
    spellcastingEntryGetSheetData,
    spellcastingEntryPrepareSiblingData,
} from "spellcasting";

function registerInitWrappers() {
    registerWrapper(
        "WRAPPER",
        "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareData",
        onCharacterPrepareData
    );

    registerWrapper(
        "MIXED",
        "CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.prepareSiblingData",
        spellcastingEntryPrepareSiblingData
    );

    registerWrapper(
        "MIXED",
        "CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.consume",
        spellcastingEntryConsume
    );

    registerWrapper(
        "WRAPPER",
        "CONFIG.PF2E.Item.documentClasses.spellcastingEntry.prototype.getSheetData",
        spellcastingEntryGetSheetData
    );
}

function registerReadyWrappers() {
    registerWrapper("WRAPPER", "game.pf2e.actions.restForTheNight", restForTheNight);
    registerWrapper(
        "WRAPPER",
        "CONFIG.Actor.documentClass.prototype.prepareEmbeddedDocuments",
        onActorPrepareEmbeddedDocuments
    );
    registerWrapper(
        "WRAPPER",
        "CONFIG.Actor.sheetClasses.character['pf2e.CharacterSheetPF2e'].cls.prototype.getData",
        onCharacterSheetGetData
    );
}

export { registerInitWrappers, registerReadyWrappers };
