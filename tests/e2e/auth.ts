import type { APIRequestContext, Page } from "@playwright/test";

/** Auth.js credentials sign-in with CSRF (client signIn can miss token in Playwright). */
export async function signInWithCredentials(
  request: APIRequestContext,
  baseURL: string,
  email: string,
  password: string,
): Promise<void> {
  const csrfRes = await request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const loginRes = await request.post(`${baseURL}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      email,
      password,
      callbackUrl: `${baseURL}/dashboard`,
      json: "true",
    },
  });
  if (!loginRes.ok() && loginRes.status() !== 302) {
    throw new Error(`E2E login failed: ${loginRes.status()} ${await loginRes.text()}`);
  }
}

export async function signInPage(
  page: Page,
  baseURL: string,
  email: string,
  password: string,
): Promise<void> {
  await signInWithCredentials(page.request, baseURL, email, password);
  await page.goto("/dashboard");
}
