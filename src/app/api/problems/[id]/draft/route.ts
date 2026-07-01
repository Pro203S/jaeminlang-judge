import { NextRequest, NextResponse } from "next/server";
import z from "zod";

import { APIErrorResponse } from "@/modules/apiError";
import { createDefaultDBUser, getDatabase, getDBProblemById, normalizeDBUser } from "@/modules/database";
import { decodeProxyAuthUser } from "@/modules/proxyAuth";

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
        const problem = getDBProblemById(problemId);
        if (!problem) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        } satisfies APIErrorResponse, { "status": 404 });

        const user = decodeProxyAuthUser(req.headers);
        if (!user) return NextResponse.json({
            "code": "unauthorized",
            "message": "로그인이 필요합니다."
        } satisfies APIErrorResponse, { "status": 401 });

        const userNode = getOrCreateUserNode(user);
        const currentUser = normalizeDBUser(userNode.value());

        userNode.set({
            ...currentUser,
            "drafts": {
                ...(currentUser.drafts ?? {}),
                [String(problemId)]: parsed.data.code
            }
        });

        return NextResponse.json(null);
    } catch (err) {
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
