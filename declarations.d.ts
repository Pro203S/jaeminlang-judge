import { OAuthUserResult } from "@/modules/pro203sAuthTypes";
import { AuthLoginResponse, AuthCallbackResponse, AuthRefreshResponse, AuthLogoutResponse } from "@/modules/pro203sAuthTypes";

declare global {
    type RESTResponseMap = {
        "/api/auth/login": AuthLoginResponse;
        "/api/auth/callback": AuthCallbackResponse;
        "/api/auth/refresh": AuthRefreshResponse;
        "/api/auth/logout": AuthLogoutResponse;
        "/api/me": AuthMeResponse;
        "/api/problems": APIProblem[];

    };

    type APIUser = {
        "id": string,
        "displayName": string,
        "profile"?: string,
        "registerAt": number,
        "score": number,
        "stat": {
            "correct": number,
            "incorrect": number,
            "submits": number
        },
        "problems": APIProblem[]
    };

    type APIProblem = {
        "id": number,
        "tier": Tier,
        "tags": string[],
        "name": string,
        "description": string,
        "input": {
            "description": string,
            "content": string
        },
        "output": {
            "description": string,
            "content": string
        }
    };

    //#region DB Type
    type Tier = {
        "category": "bronze" | "silver" | "gold" | "platinum" | "diamond" | "god";
        "stage": 5 | 4 | 3 | 2 | 1;
    };

    type DBProblem = {
        "id": number,
        "tier": Tier,
        "tags": string[],
        "name": string,
        "description": string,
        "input"?: {
            "description": string,
            "content": string
        },
        "output"?: {
            "description": string,
            "content": string
        },
        "cases": {
            "in"?: string
            "out": string,
        }[]
    };

    type DBUser = {
        "id": string,
        "userData": OAuthUserResult,
        "registerAt": number,
        "score": number,
        "stat": {
            "correct": number,
            "incorrect": number,
            "submits": number
        },
        "problems": number[]
    }

    type Database = {
        "problems": DBProblem[],
        "users": DBUser[]
    };
    //#endregion
}

export { };
