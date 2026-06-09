import { NextRequest, NextResponse } from "next/server";

import {
    REFRESH_TOKEN_COOKIE,
    clearAuthCookies,
    getAuthConfig,
    requestToken,
    setTokenCookies,
} from "@/modules/pro203sAuth";
import { createAPIErrorResponse } from "@/modules/apiError";
import type { AuthRefreshResponse } from "@/modules/pro203sAuthTypes";

export async function POST(request: NextRequest) {
    let config;

    try {
        config = getAuthConfig(request.url);
    } catch (error) {
        const payload = createAPIErrorResponse(
            "server_misconfigured",
            error instanceof Error ? error.message : "OAuth 설정이 없습니다.",
        );

        return NextResponse.json(payload, { status: 500 });
    }

    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
        const payload = createAPIErrorResponse(
            "missing_refresh_token",
            "갱신 토큰이 없습니다.",
        );

        return NextResponse.json(payload, { status: 401 });
    }

    const tokenResult = await requestToken(config, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });

    if (!tokenResult.ok) {
        const payload = createAPIErrorResponse(
            "refresh_failed",
            tokenResult.data.message,
        );
        const response = NextResponse.json(payload, { status: tokenResult.status });
        clearAuthCookies(response);

        return response;
    }

    const payload: AuthRefreshResponse = { success: true };
    const response = NextResponse.json(payload);
    setTokenCookies(response, tokenResult.data);

    return response;
}
