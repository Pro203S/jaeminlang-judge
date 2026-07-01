import { APIErrorResponse } from "@/modules/apiError";
import {
    getDBProblemById,
    getDBUserById,
    getProblemsDatabase,
    recalculateScoresForProblemSolvers,
    removeProblemFromUsers,
    sortProblemsByDifficulty
} from "@/modules/database";
import { MakeApiProblem } from "@/modules/makeApiType";
import { canManageProblem, createProblemAuthor, normalizeDBProblem } from "@/modules/problemAuthor";
import { normalizeProblemRuntimeFiles } from "@/modules/problemRuntimeFiles";
import { decodeProxyAuthUser } from "@/modules/proxyAuth";
import { normalizeRequiredKeywords } from "@/modules/requiredKeywords";
import { CompareTier } from "@/modules/tier";
import { PATCHApiProblemsId } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";

type Params = { "params": Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const problem = getDBProblemById(Number(id));
        if (!problem) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 });

        const user = decodeProxyAuthUser(req.headers);
        const canManage = canManageProblem(problem, user);
        const savedCode = user
            ? getDBUserById(user.id)?.drafts?.[String(problem.id)]
            : undefined;
        return NextResponse.json(MakeApiProblem(problem, {
            savedCode,
            "includeCases": canManage,
            "includeRuntimeFiles": canManage,
            "viewer": user ?? undefined
        }));
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: Params) {
    try {
        const id = Number((await params).id);
        const parsed = PATCHApiProblemsId.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({
            "code": "type_mismatch",
            "message": parsed.error.message
        }, { "status": 400 });

        const user = decodeProxyAuthUser(req.headers);
        if (!user) return NextResponse.json({
            "code": "unauthorized",
            "message": "로그인이 필요합니다."
        } satisfies APIErrorResponse, { "status": 401 });

        const database = getProblemsDatabase().get("problems");
        const originIndex = database.findIndex(v => v.id === id);
        if (originIndex === -1) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 });
        const origin = normalizeDBProblem(database.get(originIndex).value());
        database.get(originIndex).set(origin);

        if (!canManageProblem(origin, user)) return NextResponse.json({
            "code": "forbidden",
            "message": "작성자나 관리자만 문제를 관리할 수 있습니다."
        }, { "status": 403 });

        const { input, output, requireKeyword, runtimeFiles, ...updates } = parsed.data;
        const nextAuthor = origin.author.id === user.id
            ? createProblemAuthor(user)
            : origin.author;
        const prob: DBProblem = {
            ...origin,
            "author": nextAuthor,
            "requireKeyword": origin.requireKeyword ?? [],
            "runtimeFiles": origin.runtimeFiles ?? [],
            ...updates
        };
        if ("requireKeyword" in parsed.data && requireKeyword) {
            prob.requireKeyword = normalizeRequiredKeywords(requireKeyword);
        }
        if ("input" in parsed.data) {
            if (input === null) delete prob.input;
            else if (input !== undefined) prob.input = input;
        }
        if ("output" in parsed.data) {
            if (output === null) delete prob.output;
            else if (output !== undefined) prob.output = output;
        }
        if ("runtimeFiles" in parsed.data && runtimeFiles) {
            prob.runtimeFiles = normalizeProblemRuntimeFiles(runtimeFiles);
        }

        database.get(originIndex).set(prob);
        const sortedProblems = sortProblemsByDifficulty(database.value().map((problem) => normalizeDBProblem(problem)));
        database.set(sortedProblems);

        if (CompareTier(origin.tier, prob.tier) !== 0) {
            recalculateScoresForProblemSolvers(prob.id, sortedProblems);
        }

        return NextResponse.json(null);
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        const id = Number((await params).id);
        const user = decodeProxyAuthUser(req.headers);
        if (!user) return NextResponse.json({
            "code": "unauthorized",
            "message": "로그인이 필요합니다."
        } satisfies APIErrorResponse, { "status": 401 });

        const database = getProblemsDatabase().get("problems");
        const originIndex = database.findIndex(v => v.id === id);
        if (originIndex === -1) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 });

        const origin = normalizeDBProblem(database.get(originIndex).value());
        if (!canManageProblem(origin, user)) return NextResponse.json({
            "code": "forbidden",
            "message": "작성자나 관리자만 문제를 관리할 수 있습니다."
        }, { "status": 403 });

        database.remove(originIndex);
        const remainingProblems = sortProblemsByDifficulty(database.value().map((problem) => normalizeDBProblem(problem)));
        database.set(remainingProblems);
        removeProblemFromUsers(id, remainingProblems);

        return NextResponse.json(null);
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}
