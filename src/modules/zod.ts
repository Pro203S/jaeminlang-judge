import z from "zod";

export const ZodTier = z.object({
    "category": z.literal(["bronze", "silver", "gold", "platinum", "diamond", "god"]),
    "stage": z.literal([1,2,3,4,5])
});

export const ZodIO = z.object({
    "description": z.string(),
    "content": z.string()
});

export const ZodCase = z.object({
    "in": z.string(),
    "out": z.string()
});

export const POSTApiProblems = z.object({
    "tier": ZodTier,
    "name": z.string(),
    "description": z.string(),
    "input": ZodIO,
    "output": ZodIO,
    "cases": z.array(ZodCase)
});

export const PATCHApiProblemsId = z.object({
    "tier": z.optional(ZodTier),
    "name": z.optional(z.string()),
    "description": z.optional(z.string()),
    "input": z.optional(ZodIO),
    "output": z.optional(ZodIO),
    "cases": z.optional(z.array(ZodCase))
});
