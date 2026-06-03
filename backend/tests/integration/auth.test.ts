import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

describe('Auth API - Integration Tests', () => {
  const testUser = {
    email: `test_${Date.now()}@example.com`,
    username: `testuser_${Date.now()}`,
    password: 'Test@12345',
  };
  let accessToken = '';
  let refreshToken = '';

  it('POST /auth/register - valid data returns 201', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.user.id).toBeDefined();
    expect(data.data.tokens.accessToken).toBeDefined();
    expect(data.data.tokens.expiresIn).toBe(900);
    accessToken = data.data.tokens.accessToken;
    refreshToken = data.data.tokens.refreshToken;
  });

  it('POST /auth/login - wrong password returns 401 with INVALID_CREDENTIALS', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: 'WrongPassword1!' }),
    });
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /boards/:boardId/tasks - without auth returns 401', async () => {
    const res = await fetch(`${API_BASE}/boards/some-board-id/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test task' }),
    });
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});
