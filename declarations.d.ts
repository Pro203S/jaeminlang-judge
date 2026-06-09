declare global {
    type RestResult<T> =
        | {
            success: true;
            data: T;
        }
        | {
            success: false;
            status: number;
            data: unknown;
        };

    type Pro203sOAuthState = {
        state: string;
        next: string;
    };

    type Pro203sAuthConfig = {
        authBaseUrl: string;
        authorizeUrl: string;
        tokenUrl: string;
        revokeUrl: string;
        meUrl: string;
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        scope: string;
    };

    type Pro203sOAuthTokenResponse = {
        access_token: string;
        token_type?: "Bearer" | string;
        expires_in?: number;
        refresh_token?: string;
        refresh_expires_in?: number;
        scope?: string;
    };

    type Pro203sOAuthUserResponse = {
        id: string;
        username?: string;
        displayName?: string;
        profile?: string;
        email?: string;
    };

    type Pro203sOAuthErrorResponse = {
        error?: string;
        error_description?: string;
        code?: number;
        message?: string;
    };

    type Pro203sTokenResult =
        | {
            ok: true;
            data: Pro203sOAuthTokenResponse;
        }
        | {
            ok: false;
            data: Pro203sOAuthErrorResponse;
            status: number;
        };

    type Pro203sUserResult =
        | {
            ok: true;
            status: number;
            data: Pro203sOAuthUserResponse;
        }
        | {
            ok: false;
            status: number;
            data: Pro203sOAuthErrorResponse;
        };

    type AuthConfigErrorResponse = {
        error: "server_misconfigured";
        message: string;
    };

    type AuthLoginResponse = AuthConfigErrorResponse;

    type AuthCallbackResponse = AuthConfigErrorResponse;

    type AuthSessionResponse =
        | {
            authenticated: true;
            user: Pro203sOAuthUserResponse;
        }
        | {
            authenticated: false;
            error?: "server_misconfigured" | Pro203sOAuthErrorResponse;
            message?: string;
        };

    type AuthRefreshResponse =
        | {
            success: true;
        }
        | {
            success: false;
            error: "server_misconfigured";
            message: string;
        }
        | {
            success: false;
            error: "missing_refresh_token";
        }
        | {
            success: false;
            error: "refresh_failed";
            detail?: Pro203sOAuthErrorResponse;
        };

    type AuthLogoutResponse = {
        success: true;
    };

    type AuthApiResponseMap = {
        "/api/auth/login": AuthLoginResponse;
        "/api/auth/callback": AuthCallbackResponse;
        "/api/auth/session": AuthSessionResponse;
        "/api/auth/refresh": AuthRefreshResponse;
        "/api/auth/logout": AuthLogoutResponse;
    };

    type AuthApiResponse<Path extends keyof AuthApiResponseMap> =
        AuthApiResponseMap[Path];
}

export { };
