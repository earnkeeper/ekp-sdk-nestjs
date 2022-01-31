import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export function getAndHandle<T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  handleConfig?: { allow404?: boolean },
  axiosConfig?: AxiosRequestConfig<D>,
): Promise<R> {
  try {
    return axios.get(url, axiosConfig);
  } catch (error) {
    if (handleConfig?.allow404 === true && error.response?.status === 404) {
      return undefined;
    }
    throw error;
  }
}
