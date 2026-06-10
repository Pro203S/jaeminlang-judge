import type { APIErrorResponse } from "./apiError";

export type { APIErrorResponse } from "./apiError";

export type AuthConfig = {
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

export type OAuthState = {
    state: string;
    next: string;
};

export type OAuthTokenResponse = {
    access_token: string;
    token_type?: "Bearer" | string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
    scope?: string;
};

export type OAuthUserResponse = {
    id: string;
    username: string;
    displayName: string;
    profile?: string;
    email: string;
};

export type OAuthErrorResponse = APIErrorResponse;

export type OAuthTokenResult =
    | {
        ok: true;
        data: OAuthTokenResponse;
    }
    | {
        ok: false;
        data: OAuthErrorResponse;
        status: number;
    };

export type OAuthUserResult =
    | {
        ok: true;
        status: number;
        data: OAuthUserResponse;
    }
    | {
        ok: false;
        status: number;
        data: OAuthErrorResponse;
    };

export type AuthConfigErrorResponse = APIErrorResponse;

export type AuthLoginResponse = AuthConfigErrorResponse;

export type AuthCallbackResponse = AuthConfigErrorResponse;

export type AuthMeResponse = APIUser;

export type AuthRefreshResponse = {
    success: true;
};

export type AuthLogoutResponse = {
    success: true;
};
