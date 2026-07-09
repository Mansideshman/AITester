import { APIRequestContext, APIResponse } from '@playwright/test';

export class BaseApiClient {
  protected readonly request: APIRequestContext;
  protected readonly basePath: string;

  constructor(request: APIRequestContext, basePath: string) {
    this.request = request;
    this.basePath = basePath;
  }

  protected async get(path: string, params?: Record<string, string>): Promise<APIResponse> {
    const url = params
      ? `${this.basePath}${path}?${new URLSearchParams(params)}`
      : `${this.basePath}${path}`;
    return this.request.get(url);
  }

  protected async post(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.post(`${this.basePath}${path}`, { data });
  }

  protected async put(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.put(`${this.basePath}${path}`, { data });
  }

  protected async patch(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.patch(`${this.basePath}${path}`, { data });
  }

  protected async delete(path: string): Promise<APIResponse> {
    return this.request.delete(`${this.basePath}${path}`);
  }
}
