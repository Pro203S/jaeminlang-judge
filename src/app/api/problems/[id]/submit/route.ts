import { APIErrorResponse } from "@/modules/apiError";
import { getDatabase, getProblemsDatabase } from "@/modules/database";
import { decodeProxyAuthUser } from "@/modules/proxyAuth";
import { POSTApiProblemsIdSubmit } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";
import { RunJaeminlang } from "@/modules/jaeminlang";
import { TierToScore } from "@/modules/tier";

export const runtime = "nodejs";

type Params = { "params": Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
    try {
        const user = decodeProxyAuthUser(req.headers);
        if (!user) return NextResponse.json({
            "code": "unauthorized",
            "message": "로그인이 필요합니다."
        } satisfies APIErrorResponse, { "status": 401 });

        const db = getDatabase();
        const userdb = db.get("users").find(v => v.id === user.id);
        if (!userdb) return NextResponse.json({
            "code": "not_found",
            "message": "유저를 DB에서 찾을 수 없습니다."
        } satisfies APIErrorResponse, { "status": 401 });

        const parsed = POSTApiProblemsIdSubmit.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({
            "code": "type_mismatch",
            "message": parsed.error.message
        } satisfies APIErrorResponse, { "status": 400 });
        const { code } = parsed.data;

        const { id } = await params;
        const problemId = Number(id);
        const problem = getProblemsDatabase().get("problems").find(v => v.id === problemId)?.value?.();

        if (!problem) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        } satisfies APIErrorResponse, { "status": 404 });

        const stat = userdb.get("stat");
        const submits = stat.get("submits").value() + 1;
        stat.get("submits").set(submits);

        let problemError = false;
        let problemErrorInOtherCase = false;
        let problemOutput = "";
        let problemCorrect = true;

        for (let i = 0; i < problem.requireKeyword.length; i++) {
            const keyword = problem.requireKeyword[i];
            if (code.includes(keyword)) continue;

            return NextResponse.json({
                "error": true,
                "correct": false,
                "output": `코드에 '${keyword}' 키워드가 들어가있지 않습니다.`
            } satisfies APISubmitResponse);
        }

        for (let i = 0; i < problem.cases.length; i++) {
            const problemCase = problem.cases[i];
            const result = await RunJaeminlang(code, {
                "libraries": (problem.runtimeFiles ?? []).map(v => ({
                    "code": v.content,
                    "filename": v.name
                })),
                "stdin": problemCase.in
            });

            if (!result.success || result.data !== problemCase.out) {
                problemError = true;
                problemErrorInOtherCase = i !== 0;
                problemOutput = result.data;
                problemCorrect = false;
                break;
            }

            problemOutput = result.data;
        }

        if (problemError) return NextResponse.json({
            "error": problemError,
            "errorInOtherCase": problemErrorInOtherCase,
            "correct": problemCorrect,
            "output": problemOutput
        } satisfies APISubmitResponse);

        const corrects = stat.get("corrects").value() + 1;
        stat.get("corrects").set(corrects);

        const problems = userdb.get("problems");
        const problemsValue = problems.value();
        if (!problemsValue.includes(problem.id)) {
            problems.add(problem.id);
            const score = userdb.get("score").value();
            userdb.get("score").set(score + TierToScore(problem.tier));
        }

        return NextResponse.json({
            "error": problemError,
            "correct": problemCorrect,
            "output": problemOutput
        } satisfies APISubmitResponse);
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}
