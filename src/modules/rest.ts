import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { toAPIErrorResponse } from "./apiError";
import type { APIErrorResponse } from "./apiError";
import type {
    AuthCallbackResponse,
    AuthLoginResponse,
    AuthLogoutResponse,
    AuthMeResponse,
    AuthRefreshResponse,
} from "./pro203sAuthTypes";

type RESTResponseMap = {
    "/api/auth/login": AuthLoginResponse;
    "/api/auth/callback": AuthCallbackResponse;
    "/api/auth/refresh": AuthRefreshResponse;
    "/api/auth/logout": AuthLogoutResponse;
    "/api/me": AuthMeResponse;
};

const AUTH_REFRESH_URL = "/api/auth/refresh";

let refreshRequest: Promise<AxiosResponse<AuthRefreshResponse>> | undefined;

export type RestResult<T> =
    | {
        success: true;
        data: T;
    }
    | {
        success: false;
        status: number;
        data: APIErrorResponse;
    };

export default function REST<Path extends keyof RESTResponseMap>(
    url: Path,
    config?: AxiosRequestConfig,
): Promise<RestResult<RESTResponseMap[Path]>>;
export default function REST<T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<RestResult<T>>;
export default async function REST<T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<RestResult<T>> {
    try {
        const response = await requestWithAuth<T>(url, config);

        if (response.status === 401 && !isRefreshRequest(url)) {
            const refreshResponse = await refreshAccessToken();

            if (isSuccessStatus(refreshResponse.status)) {
                return responseToResult(await requestWithAuth<T>(url, config));
            }

            return failureResponseToResult(refreshResponse);
        }

        return responseToResult(response);
    } catch (error) {
        return {
            success: false,
            status: axios.isAxiosError(error) ? error.response?.status ?? 0 : 0,
            data: toAPIErrorResponse(
                axios.isAxiosError(error) ? error.response?.data ?? error.message : error,
            ),
        };
    }
}

function requestWithAuth<T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
    return axios.request<T>({
        ...config,
        url,
        validateStatus: () => true,
        withCredentials: true,
    });
}

function refreshAccessToken() {
    refreshRequest ??= requestWithAuth<AuthRefreshResponse>(
        AUTH_REFRESH_URL,
        { method: "POST" },
    ).finally(() => {
        refreshRequest = undefined;
    });

    return refreshRequest;
}

function responseToResult<T>(response: AxiosResponse<T>): RestResult<T> {
    if (!isSuccessStatus(response.status)) {
        return failureResponseToResult(response);
    }

    return {
        success: true,
        data: response.data,
    };
}

function failureResponseToResult<T>(response: AxiosResponse<unknown>): RestResult<T> {
    return {
        success: false,
        status: response.status,
        data: toAPIErrorResponse(
            response.data,
            `http_${response.status}`,
            `요청에 실패했습니다. (${response.status})`,
        ),
    };
}

function isSuccessStatus(status: number) {
    return status >= 200 && status < 300;
}

function isRefreshRequest(url: string) {
    try {
        return new URL(url, "http://localhost").pathname === AUTH_REFRESH_URL;
    } catch {
        return url === AUTH_REFRESH_URL;
    }
}
