import { APIErrorResponse } from "@/modules/apiError";
import { ADMIN_ID } from "@/modules/constants";
import { getProblemsDatabase, sortProblemsByDifficulty } from "@/modules/database";
import { MakeApiProblem } from "@/modules/makeApiType";
import { normalizeProblemRuntimeFiles } from "@/modules/problemRuntimeFiles";
import { decodeProxyAuthUser } from "@/modules/proxyAuth";
import { normalizeRequiredKeywords } from "@/modules/requiredKeywords";
import { POSTApiProblems } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const problems = getProblemsDatabase().get("problems").value();
        return NextResponse.json(sortProblemsByDifficulty(problems).map((problem) => MakeApiProblem(problem)));
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const parsed = POSTApiProblems.safeParse(await req.json());
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
            "message": "관리자만 문제를 만들 수 있습니다."
        }, { "status": 403 });
        
        const database = getProblemsDatabase().get("problems");
        const problems = database.value();
        const prob: DBProblem = {
            "id": Math.max(0, ...problems.map((problem) => problem.id)) + 1,
            ...parsed.data,
            "requireKeyword": normalizeRequiredKeywords(parsed.data.requireKeyword),
            "runtimeFiles": normalizeProblemRuntimeFiles(parsed.data.runtimeFiles)
        };

        database.set(sortProblemsByDifficulty([...problems, prob]));

        return NextResponse.json(null);
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}
