import { APIErrorResponse } from "@/modules/apiError";
import { getDatabase } from "@/modules/database";
import { MakeApiProblem } from "@/modules/makeApiType";
import { Pro203SSessionError, attachSessionCookies, getCurrentSession } from "@/modules/pro203sAuth";
import { POSTApiProblems } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const database = getDatabase();
        const problems = database.get("problems").value();
        return NextResponse.json(problems.map(MakeApiProblem));
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
        if (session.user.id !== "ca51bc59-4f53-44b6-bd11-143cbd2115e5") return attachSessionCookies(NextResponse.json({
            "code": "forbidden",
            "message": "관리자만 문제를 만들 수 있습니다."
        }, { "status": 403 }), session);
        
        const database = getDatabase().get("problems");
        const prob: DBProblem = {
            "id": database.value().length + 1,
            ...parsed.data
        };

        database.add(prob);

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
