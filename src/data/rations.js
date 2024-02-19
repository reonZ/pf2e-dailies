import { createFancyLink, getItemWithSourceId, localize } from "module-api";

const RATION_UUID = "Compendium.pf2e.equipment-srd.Item.L9ZV076913otGtiB";

function getRations(actor) {
	return getItemWithSourceId(actor, RATION_UUID, "consumable");
}

export const rations = {
	key: "rations",
	item: {
		uuid: "Compendium.pf2e.equipment-srd.Item.L9ZV076913otGtiB",
	},
	rows: [
		{
			type: "select",
			slug: "rations",
			save: false,
			order: 200,
			options: ({ actor }) => {
				const rations = getRations(actor);
				const { value, max } = rations.uses;
				const quantity = rations.quantity;
				const remaining = (quantity - 1) * max + value;
				const last = remaining <= 1;

				return [
					{
						value: "false",
						label: localize("interface.rations.no"),
					},
					{
						value: "true",
						label: last
							? localize("interface.rations.last")
							: localize("interface.rations.yes", { nb: remaining }),
					},
				];
			},
		},
	],
	process: async ({ fields, updateItem, messages, actor }) => {
		if (fields.rations.value !== "true") return;

		const rations = getRations(actor);
		if (!rations?.uses.value) return;

		const quantity = rations.quantity;
		const { value, max } = rations.uses;

		if (value <= 1) {
			if (quantity <= 1) {
				rations.delete();
			} else {
				updateItem({
					_id: rations.id,
					"system.quantity": Math.max(rations.quantity - 1, 0),
					"system.uses.value": max,
				});
			}
		} else {
			updateItem({
				_id: rations.id,
				"system.uses.value": Math.max(value - 1, 0),
			});
		}

		const remaining = (quantity - 1) * max + value;
		const name =
			remaining <= 1
				? await createFancyLink(RATION_UUID, { label: rations.name })
				: await createFancyLink(rations);

		const message =
			remaining <= 1
				? localize("message.rations.last", { name })
				: remaining <= 3
				  ? localize("message.rations.almost", { name, nb: remaining - 1 })
				  : localize("message.rations.used", { name, nb: remaining - 1 });

		messages.addRaw(message, 200);
	},
};
