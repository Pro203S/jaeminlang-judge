import { NextRequest, NextResponse } from "next/server";

import {
    createOAuthState,
    getAuthConfig,
    setOAuthStateCookie,
} from "@/modules/pro203sAuth";

export async function GET(request: NextRequest) {
    let config;

    try {
        config = getAuthConfig(request.url);
    } catch (error) {
        const payload: AuthLoginResponse = {
            error: "server_misconfigured",
            message: error instanceof Error ? error.message : "OAuth 설정이 없습니다.",
        };

        return NextResponse.json(payload, { status: 500 });
    }

    const next = request.nextUrl.searchParams.get("next") ?? "/";
    const oauthState = createOAuthState(next);
    const authorizeUrl = new URL(config.authorizeUrl);

    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizeUrl.searchParams.set("scope", config.scope);
    authorizeUrl.searchParams.set("state", oauthState.state);

    const response = NextResponse.redirect(authorizeUrl);
    setOAuthStateCookie(response, oauthState);

    return response;
}
