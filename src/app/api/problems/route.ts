import { APIErrorResponse } from "@/modules/apiError";
import { ADMIN_ID } from "@/modules/constants";
import { getProblemsDatabase, sortProblemsByDifficulty } from "@/modules/database";
import { MakeApiProblem } from "@/modules/makeApiType";
import { Pro203SSessionError, attachSessionCookies, getCurrentSession } from "@/modules/pro203sAuth";
import { normalizeRequiredKeywords } from "@/modules/requiredKeywords";
import { POSTApiProblems } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const problems = getProblemsDatabase().get("problems").value();
        return NextResponse.json(sortProblemsByDifficulty(problems).map((problem) => MakeApiProblem(problem)));
    } catch (err) {
        if (err instanceof Pro203SSessionError) {
            return NextResponse.json({
                "code": err.status === 401 ? "unauthorized" : err.detail.code,
                "message": err.detail.message
            } satisfies APIErrorResponse, { "status": err.status });
        }

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

        const session = await getCurrentSession(req);
        if (session.user.id !== ADMIN_ID) return attachSessionCookies(NextResponse.json({
            "code": "forbidden",
            "message": "관리자만 문제를 만들 수 있습니다."
        }, { "status": 403 }), session);
        
        const database = getProblemsDatabase().get("problems");
        const problems = database.value();
        const prob: DBProblem = {
            "id": Math.max(0, ...problems.map((problem) => problem.id)) + 1,
            ...parsed.data,
            "requireKeyword": normalizeRequiredKeywords(parsed.data.requireKeyword)
        };

        database.set(sortProblemsByDifficulty([...problems, prob]));

        return attachSessionCookies(new NextResponse(null, { "status": 204 }), session);
    } catch (err) {
        if (err instanceof Pro203SSessionError) {
            return NextResponse.json({
                "code": err.status === 401 ? "unauthorized" : err.detail.code,
                "message": err.detail.message
            } satisfies APIErrorResponse, { "status": err.status });
        }

        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}
