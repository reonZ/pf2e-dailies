import { z, zDocumentId, zTradition } from "foundry-helpers";

function zStatistic() {
    return z.object({
        slug: z.string().nonempty(),
        tradition: zTradition(),
    });
}

function zStaffData() {
    return z.object({
        charges: z.object({
            value: z.number(),
            max: z.number(),
        }),
        expended: z.boolean(),
        spells: z.array(z.record(z.string(), z.any())),
        staffId: zDocumentId(true),
        statistic: zStatistic().optional(),
    });
}

export { zStaffData };
