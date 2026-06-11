import z from "zod";

export const ZodTier = z.object({
    "category": z.enum(["bronze", "silver", "gold", "platinum", "diamond", "god"]),
    "stage": z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
});

export const ZodIO = z.object({
    "description": z.string(),
    "content": z.string()
});

export const ZodCase = z.object({
    "in": z.optional(z.string()),
    "out": z.string()
});

export const POSTApiProblems = z.object({
    "tier": ZodTier,
    "name": z.string(),
    "description": z.string(),
    "input": z.optional(ZodIO),
    "output": z.optional(ZodIO),
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
