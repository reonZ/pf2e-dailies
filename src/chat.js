import { getFlag, localize, updateSourceFlag } from "module-api";
import { canPrepDailies } from "./actor";
import { openDailiesInterface } from "./api";

export function preCreateChatMessage(message, data, context) {
	if (context.restForTheNight) {
		updateSourceFlag(message, "restForTheNight", true);
	}
}

export function renderChatMessage(message, html) {
	if (getFlag(message, "restForTheNight")) {
		renderRestMessage(message, html);
	}
}

function renderRestMessage(message, html) {
	const actor = message.actor;
	if (!actor.isOwner) return;

	const canPrep = canPrepDailies(actor);
	const prepared = getFlag(message, "prepared");
	const label = localize(
		`message.dailiesRequest.${
			!canPrep && prepared === undefined
				? "cleaning"
				: canPrep
				  ? "button"
				  : "prepared"
		}`,
	);
	const btn = $(`<button type="button">${label}</button>`);

	html.find(".message-content").append(btn);

	if (canPrep) {
		btn.on("click", () => openDailiesInterface(actor, message));
	} else {
		btn.prop("disabled", true);
	}
}
