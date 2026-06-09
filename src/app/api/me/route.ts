import { NextRequest, NextResponse } from "next/server";

import {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    clearAuthCookies,
    fetchCurrentUser,
    getAuthConfig,
    requestToken,
    setTokenCookies,
} from "@/modules/pro203sAuth";
import { createAPIErrorResponse } from "@/modules/apiError";
import type {
    AuthConfigErrorResponse,
    AuthMeResponse,
    OAuthErrorResponse,
} from "@/modules/pro203sAuthTypes";

export async function GET(request: NextRequest) {
    let config;

    try {
        config = getAuthConfig(request.url);
    } catch (error) {
        const payload: AuthConfigErrorResponse = createAPIErrorResponse(
            "server_misconfigured",
            error instanceof Error ? error.message : "OAuth 설정이 없습니다.",
        );

        return NextResponse.json(payload, { status: 500 });
    }

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
        return unauthorizedResponse();
    }

    const userResult = await fetchCurrentUser(config, accessToken);

    if (userResult.ok) {
        const payload: AuthMeResponse = userResult.data;

        return NextResponse.json(payload);
    }

    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (userResult.status === 401 && refreshToken) {
        const refreshResult = await requestToken(config, {
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        });

        if (refreshResult.ok) {
            const refreshedUserResult = await fetchCurrentUser(
                config,
                refreshResult.data.access_token,
            );

            if (refreshedUserResult.ok) {
                const payload: AuthMeResponse = refreshedUserResult.data;
                const response = NextResponse.json(payload);

                setTokenCookies(response, refreshResult.data);

                return response;
            }

            const response = authFailureResponse(
                refreshedUserResult.status,
                refreshedUserResult.data,
            );

            setTokenCookies(response, refreshResult.data);
            clearAuthCookies(response);

            return response;
        }
    }

    const response = authFailureResponse(userResult.status, userResult.data);
    clearAuthCookies(response);

    return response;
}

function authFailureResponse(status: number, detail: OAuthErrorResponse) {
    if (status === 401) {
        return unauthorizedResponse(detail);
    }

    const responseStatus = status >= 200 && status < 300 ? 502 : status;

    return NextResponse.json(detail, { status: responseStatus });
}

function unauthorizedResponse(detail?: OAuthErrorResponse) {
    const payload = createAPIErrorResponse(
        "unauthorized",
        detail?.message ?? "로그인이 필요합니다.",
    );

    return NextResponse.json(payload, { status: 401 });
}
