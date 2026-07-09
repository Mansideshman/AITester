import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api-client';
import { CreateUserRequest, UpdateUserRequest } from '../models/user.model';

export class UsersApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request, '/users');
  }

  async list(page = 1, pageSize = 10): Promise<APIResponse> {
    return this.get('', { page: String(page), pageSize: String(pageSize) });
  }

  async getById(id: string): Promise<APIResponse> {
    return this.get(`/${id}`);
  }

  async create(user: CreateUserRequest): Promise<APIResponse> {
    return this.post('', user);
  }

  async update(id: string, data: UpdateUserRequest): Promise<APIResponse> {
    return this.patch(`/${id}`, data);
  }

  async remove(id: string): Promise<APIResponse> {
    return this.delete(`/${id}`);
  }
}
