import { NextRequest, NextResponse } from "next/server";

import { createAPIErrorResponse } from "@/modules/apiError";
import { getDatabase, upsertOAuthUser } from "@/modules/database";
import { MakeApiUser } from "@/modules/makeApiType";
import {
    Pro203SSessionError,
    clearAuthCookies,
    getCurrentSessionUser,
} from "@/modules/pro203sAuth";
import type { AuthMeResponse } from "@/modules/pro203sAuthTypes";

export async function GET(request: NextRequest) {
    try {
        const oauthUser = await getCurrentSessionUser(request);
        const database = getDatabase();
        const user = upsertOAuthUser(oauthUser);
        const payload: AuthMeResponse = MakeApiUser(
            user,
            database.get("problems").value(),
        );

        return NextResponse.json(payload);
    } catch (error) {
        if (error instanceof Pro203SSessionError) {
            return sessionErrorResponse(error);
        }

        return NextResponse.json(
            createAPIErrorResponse(
                "internal_server_error",
                error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
            ),
            { status: 500 },
        );
    }
}

function sessionErrorResponse(error: Pro203SSessionError) {
    const status = error.status === 401
        ? 401
        : error.status >= 200 && error.status < 300
            ? 502
            : error.status;
    const payload = status === 401
        ? createAPIErrorResponse(
            "unauthorized",
            error.detail.message || "로그인이 필요합니다.",
        )
        : error.detail;
    const response = NextResponse.json(payload, { status });

    if (status === 401) {
        clearAuthCookies(response);
    }

    return response;
}
