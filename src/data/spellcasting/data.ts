import { z, zDocumentId, zTradition } from "foundry-helpers";

function zStatistic() {
    return z.object({
        slug: z.string().nonempty(),
        tradition: zTradition(),
    });
}

function zStaffData() {
    return z.object({
        staffId: zDocumentId(true),
        charges: z.object({
            value: z.number(),
            max: z.number(),
        }),
        expended: z.boolean(),
        spells: z.array(z.record(z.string(), z.any())),
        statistic: zStatistic().optional(),
    });
}

export { zStaffData };
