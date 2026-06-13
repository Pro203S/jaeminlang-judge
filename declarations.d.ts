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
        "/api/ranking": Omit<APIUser, "problems" | "stat">[];
    };

    type RESTDynamicPath =
        | `/api/problems/${string}`
        | `/api/problems/${string}/draft`
        | `/api/problems/${string}/submit`;

    type RESTResponse<Path extends string> =
        Path extends `/api/problems/${string}/submit`
            ? APISubmitResponse
            : Path extends `/api/problems/${string}/draft`
                ? null
            : Path extends `/api/problems/${string}`
                ? APIProblem
                : Path extends keyof RESTResponseMap
                    ? RESTResponseMap[Path]
                    : never;

    type APISubmitResponse = {
        "correct": boolean,
        "error": boolean,
        "output": string
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
        "input"?: {
            "description": string,
            "content": string
        },
        "output"?: {
            "description": string,
            "content": string
        },
        "cases"?: {
            "in"?: string,
            "out": string,
        }[],
        "savedCode"?: string
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
        "problems": number[],
        "drafts": Record<string, string>,
        "incorrectProblems": number[]
    }

    type Database = {
        "users": DBUser[]
    };

    type ProblemsDatabase = {
        "problems": DBProblem[],
    };
    //#endregion
}

export { };
