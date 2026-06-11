import { APIErrorResponse } from "@/modules/apiError";
import { getDatabase } from "@/modules/database";
import { MakeApiProblem } from "@/modules/makeApiType";
import { Pro203SSessionError, attachSessionCookies, getCurrentSession } from "@/modules/pro203sAuth";
import { PATCHApiProblemsId } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";

type Params = { "params": Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const database = getDatabase();
        const problem = database.get("problems").find(v => v.id === Number(id))?.value?.();
        if (!problem) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 });

        return NextResponse.json(MakeApiProblem(problem));
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

export async function PATCH(req: NextRequest, { params }: Params) {
    try {
        const id = Number((await params).id);
        const parsed = PATCHApiProblemsId.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({
            "code": "type_mismatch",
            "message": "어쩔"
        }, { "status": 400 });

        const session = await getCurrentSession(req);
        if (session.user.id !== "pro203s") return attachSessionCookies(NextResponse.json({
            "code": "forbidden",
            "message": "관리자만 문제를 관리할 수 있습니다."
        }, { "status": 403 }), session);

        const database = getDatabase().get("problems");
        const originIndex = database.findIndex(v => v.id === id);
        if (originIndex === -1) return attachSessionCookies(NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 }), session);
        const origin = database.get(originIndex).value();

        const prob: DBProblem = {
            ...origin,
            ...parsed.data
        };

        database.get(originIndex).set(prob);

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

export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        const id = Number((await params).id);
        const session = await getCurrentSession(req);
        if (session.user.id !== "pro203s") return attachSessionCookies(NextResponse.json({
            "code": "forbidden",
            "message": "관리자만 문제를 관리할 수 있습니다."
        }, { "status": 403 }), session);

        const database = getDatabase().get("problems");
        const originIndex = database.findIndex(v => v.id === id);
        if (originIndex === -1) return attachSessionCookies(NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 }), session);

        database.remove(originIndex);

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
