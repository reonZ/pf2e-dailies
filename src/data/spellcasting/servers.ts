import { createDaily } from "daily";
import { getPreparedSpellcastingData, getSpellServers, isSpellServer, setSpecialStatisticData } from ".";
import { utils } from "utils";

const servers = createDaily({
    key: "servers",
    condition: (actor) => {
        return actor.itemTypes.equipment.some(isSpellServer);
    },
    prepare: (actor) => {
        const data = getPreparedSpellcastingData(actor);
        if (!data) return {};

        return {
            entries: actor.spellcasting.spellcastingFeatures,
            maxCharges: data.maxCharges,
            specialStatistic: data.specialStatistic,
        };
    },
    rows: (actor, _items, custom) => {
        if (!custom.entries) return [];

        const options = getSpellServers(actor).map((item) => {
            return { value: item.id, label: item.name };
        });

        return [
            {
                type: "select",
                slug: "server",
                empty: true,
                options,
            },
        ];
    },
    process: async ({ actor, custom, messages, rows, setExtraFlags }) => {
        const server = rows.server ? actor.inventory.get(rows.server) : null;
        if (!custom.entries || !server) return;

        const maxCharges = custom.maxCharges;
        const spells = await utils.getPhysicalItemSpells(server, maxCharges);
        if (!spells.length) return;

        const serverData: dailies.ActivationFlag = {
            charges: {
                value: maxCharges,
                max: maxCharges,
            },
            expended: false,
            spells,
            staffId: server.id,
        };

        setSpecialStatisticData(serverData, custom.specialStatistic);
        setExtraFlags(serverData);

        messages.add("servers", { uuid: server.uuid });
    },
});

export { servers };
