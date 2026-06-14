import { NextRequest, NextResponse } from "next/server";
import { upsertOAuthUser } from "@/modules/database";

import {
    OAUTH_STATE_COOKIE,
    authErrorRedirect,
    clearOAuthStateCookie,
    decodeOAuthState,
    fetchCurrentUser,
    getAuthConfig,
    requestToken,
    setTokenCookies,
} from "@/modules/discordAuth";
import { createAPIErrorResponse } from "@/modules/apiError";
import type { AuthCallbackResponse } from "@/modules/discordAuthTypes";

export async function GET(request: NextRequest) {
    let config;

    try {
        config = getAuthConfig(request.url);
    } catch (error) {
        const payload: AuthCallbackResponse = createAPIErrorResponse(
            "server_misconfigured",
            error instanceof Error ? error.message : "OAuth 설정이 없습니다.",
        );

        return NextResponse.json(payload, { status: 500 });
    }

    const error = request.nextUrl.searchParams.get("error");
    const errorDescription = request.nextUrl.searchParams.get("error_description");

    if (error) {
        return NextResponse.redirect(
            authErrorRedirect(request.url, error, errorDescription ?? undefined),
        );
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = decodeOAuthState(
        request.cookies.get(OAUTH_STATE_COOKIE)?.value,
    );

    if (!code || !state || !storedState || state !== storedState.state) {
        const response = NextResponse.redirect(
            authErrorRedirect(request.url, "invalid_state"),
        );
        clearOAuthStateCookie(response);
        return response;
    }

    const tokenResult = await requestToken(config, {
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
    });

    if (!tokenResult.ok) {
        const response = NextResponse.redirect(
            authErrorRedirect(
                request.url,
                "token_exchange_failed",
                `${tokenResult.data.code}: ${tokenResult.data.message}`,
            ),
        );
        clearOAuthStateCookie(response);
        return response;
    }

    const userResult = await fetchCurrentUser(config, tokenResult.data.access_token);

    if (!userResult.ok) {
        const response = NextResponse.redirect(
            authErrorRedirect(request.url, "user_fetch_failed", userResult.data.message),
        );
        clearOAuthStateCookie(response);
        return response;
    }

    upsertOAuthUser(userResult.data);

    const response = NextResponse.redirect(new URL(storedState.next, request.url));
    setTokenCookies(response, tokenResult.data);
    clearOAuthStateCookie(response);

    return response;
}
