import axios, { AxiosRequestConfig } from "axios";

export type RestResult<T> =
    | {
          success: true;
          data: T;
      }
    | {
          success: false;
          status: number;
          data: unknown;
      };

export default async function rest<T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<RestResult<T>> {
    const response = await axios.request<T>({
        url,
        withCredentials: true,
        validateStatus: () => true,
        ...config,
    });

    if (response.status < 200 || response.status >= 300) {
        return {
            success: false,
            status: response.status,
            data: response.data,
        };
    }

    return {
        success: true,
        data: response.data,
    };
}
