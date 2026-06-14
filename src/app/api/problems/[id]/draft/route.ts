import { NextRequest, NextResponse } from "next/server";
import z from "zod";

import { APIErrorResponse } from "@/modules/apiError";
import { createDefaultDBUser, getDatabase, getProblemsDatabase, normalizeDBUser } from "@/modules/database";
import { Pro203SSessionError, attachSessionCookies, getCurrentSession } from "@/modules/pro203sAuth";

type Params = { "params": Promise<{ id: string }> };

const DraftPayload = z.object({
    "code": z.string()
});

export async function POST(req: NextRequest, { params }: Params) {
    try {
        const parsed = DraftPayload.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({
            "code": "type_mismatch",
            "message": parsed.error.message
        } satisfies APIErrorResponse, { "status": 400 });

        const problemId = Number((await params).id);
        const problem = getProblemsDatabase().get("problems").find(v => v.id === problemId)?.value?.();
        if (!problem) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        } satisfies APIErrorResponse, { "status": 404 });

        const session = await getCurrentSession(req);
        const userNode = getOrCreateUserNode(session.user);
        const currentUser = normalizeDBUser(userNode.value());

        userNode.set({
            ...currentUser,
            "drafts": {
                ...(currentUser.drafts ?? {}),
                [String(problemId)]: parsed.data.code
            }
        });

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

function getOrCreateUserNode(user: Parameters<typeof createDefaultDBUser>[0]) {
    const users = getDatabase().get("users");
    const current = users.find(v => v.id === user.id);

    if (current) return current;

    users.add(createDefaultDBUser(user));

    const created = users.find(v => v.id === user.id);
    if (!created) {
        throw new Error("유저 DB 생성에 실패했습니다.");
    }

    return created;
}
