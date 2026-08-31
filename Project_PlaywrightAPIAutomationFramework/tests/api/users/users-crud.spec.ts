import { test, expect } from '../../fixtures/api.fixture';
import { CreateUserRequest } from '../../../models/user.model';

test.describe('Users API - CRUD', () => {
  test('POST /users - should create, get, update, delete a user', async ({ usersApi }) => {
    const timestamp = Date.now();
    const newUser: CreateUserRequest = {
      email: `test-${timestamp}@example.com`,
      name: 'Test User',
      password: 'SecurePass123!',
      role: 'user',
    };

    const createResp = await usersApi.create(newUser);
    expect(createResp.status()).toBeGreaterThanOrEqual(200);
    expect(createResp.status()).toBeLessThan(300);
    const created = await createResp.json();
    expect(created.id).toBeTruthy();

    const getResp = await usersApi.getById(created.id);
    expect(getResp.status()).toBe(200);
    const fetched = await getResp.json();
    expect(fetched.email).toBe(newUser.email);

    const updateResp = await usersApi.update(created.id, { name: 'Updated Name' });
    expect(updateResp.status()).toBeGreaterThanOrEqual(200);
    const updated = await updateResp.json();
    expect(updated.name).toBe('Updated Name');

    const deleteResp = await usersApi.remove(created.id);
    expect([200, 204, 202]).toContain(deleteResp.status());
  });
});
