import { NextRequest, NextResponse } from "next/server";

import { createAPIErrorResponse } from "@/modules/apiError";
import { getDatabase, upsertOAuthUser } from "@/modules/database";
import { MakeApiUser } from "@/modules/makeApiType";
import type { AuthMeResponse } from "@/modules/discordAuthTypes";
import { decodeProxyAuthUser } from "@/modules/proxyAuth";

export async function GET(request: NextRequest) {
    try {
        const authUser = decodeProxyAuthUser(request.headers);
        if (!authUser) return unauthorizedResponse();

        const user = upsertOAuthUser(authUser);
        const payload: AuthMeResponse = MakeApiUser(user);

        return NextResponse.json(payload);
    } catch (error) {
        return NextResponse.json(
            createAPIErrorResponse(
                "internal_server_error",
                error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
            ),
            { status: 500 },
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const authUser = decodeProxyAuthUser(request.headers);
        if (!authUser) return unauthorizedResponse();

        const users = getDatabase().get("users");
        const userIndex = users.findIndex((value) => value.id === authUser.id);

        if (userIndex === -1) {
            return NextResponse.json(
                createAPIErrorResponse("not_found", "유저 정보를 찾지 못했습니다."),
                { status: 404 },
            );
        }

        users.remove(userIndex);

        return NextResponse.json(null);
    } catch (error) {
        return NextResponse.json(
            createAPIErrorResponse(
                "internal_server_error",
                error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
            ),
            { status: 500 },
        );
    }
}

function unauthorizedResponse() {
    return NextResponse.json(
        createAPIErrorResponse("unauthorized", "로그인이 필요합니다."),
        { "status": 401 },
    );
}
