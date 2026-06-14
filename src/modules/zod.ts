import z from "zod";

import { getDuplicateProblemRuntimeFileNames, isProblemRuntimeFileName } from "./problemRuntimeFiles";

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

export const ZodTags = z.array(z.string());
export const ZodRequireKeyword = z.array(z.string());
export const ZodProblemRuntimeFiles = z.array(z.object({
    "name": z.string()
        .trim()
        .min(1, "파일 이름을 입력해주세요.")
        .refine(isProblemRuntimeFileName, "파일 이름에 사용할 수 없는 문자가 있습니다."),
    "content": z.string()
})).superRefine((value, ctx) => {
    for (const name of getDuplicateProblemRuntimeFileNames(value)) {
        ctx.addIssue({
            "code": "custom",
            "message": `중복된 런타임 파일 이름입니다: ${name}`
        });
    }
});

export const POSTApiProblems = z.object({
    "tier": ZodTier,
    "tags": ZodTags,
    "requireKeyword": ZodRequireKeyword.default([]),
    "name": z.string(),
    "description": z.string(),
    "input": z.optional(ZodIO),
    "output": z.optional(ZodIO),
    "cases": z.array(ZodCase),
    "runtimeFiles": ZodProblemRuntimeFiles.default([])
});

export const PATCHApiProblemsId = z.object({
    "tier": z.optional(ZodTier),
    "tags": z.optional(ZodTags),
    "requireKeyword": z.optional(ZodRequireKeyword),
    "name": z.optional(z.string()),
    "description": z.optional(z.string()),
    "input": z.optional(z.nullable(ZodIO)),
    "output": z.optional(z.nullable(ZodIO)),
    "cases": z.optional(z.array(ZodCase)),
    "runtimeFiles": z.optional(ZodProblemRuntimeFiles)
});

export const POSTApiProblemsIdSubmit = z.object({
    "code": z.string()
});
