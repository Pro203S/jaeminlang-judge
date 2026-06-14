import { APIErrorResponse } from "@/modules/apiError";
import { ADMIN_ID } from "@/modules/constants";
import { getDBUserById, getProblemsDatabase, recalculateScoresForProblemSolvers, sortProblemsByDifficulty } from "@/modules/database";
import { MakeApiProblem } from "@/modules/makeApiType";
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
        const problem = getProblemsDatabase().get("problems").find(v => v.id === Number(id))?.value?.();
        if (!problem) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 });

        const user = decodeProxyAuthUser(req.headers);
        const savedCode = user
            ? getDBUserById(user.id)?.drafts?.[String(problem.id)]
            : undefined;
        return NextResponse.json(MakeApiProblem(problem, {
            savedCode,
            "includeCases": user?.id === ADMIN_ID,
            "includeRuntimeFiles": user?.id === ADMIN_ID
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
        if (user.id !== ADMIN_ID) return NextResponse.json({
            "code": "forbidden",
            "message": "관리자만 문제를 관리할 수 있습니다."
        }, { "status": 403 });

        const database = getProblemsDatabase().get("problems");
        const originIndex = database.findIndex(v => v.id === id);
        if (originIndex === -1) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 });
        const origin = database.get(originIndex).value();

        const { input, output, requireKeyword, runtimeFiles, ...updates } = parsed.data;
        const prob: DBProblem = {
            ...origin,
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
        const sortedProblems = sortProblemsByDifficulty(database.value());
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
        if (user.id !== ADMIN_ID) return NextResponse.json({
            "code": "forbidden",
            "message": "관리자만 문제를 관리할 수 있습니다."
        }, { "status": 403 });

        const database = getProblemsDatabase().get("problems");
        const originIndex = database.findIndex(v => v.id === id);
        if (originIndex === -1) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 });

        database.remove(originIndex);

        return NextResponse.json(null);
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}
