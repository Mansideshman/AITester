import { test as base } from '@playwright/test';
import { UsersApiClient } from '../clients/users-api-client';

type ApiFixtures = {
  usersApi: UsersApiClient;
  authToken: string;
};

export const test = base.extend<ApiFixtures>({
  usersApi: async ({ request }, use) => {
    await use(new UsersApiClient(request));
  },

  authToken: async ({ request }, use) => {
    // default login; replace with real creds or env vars
    const response = await request.post('/auth/login', {
      data: { email: 'admin@example.com', password: 'AdminPass123!' },
    });
    const body = await response.json();
    await use(body.token as string);
  },
});

export { expect } from '@playwright/test';
