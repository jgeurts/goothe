import { COGNITO_CLIENT_ID, COGNITO_ENDPOINT } from "@/lib/defaults";
import type { BookingUserState } from "./types";

const COGNITO_KEY_PREFIX = `CognitoIdentityServiceProvider.${COGNITO_CLIENT_ID}`;

/** Read the Cognito refresh token from localStorage */
export function getRefreshToken(): string | null {
  const lastUser = localStorage.getItem(`${COGNITO_KEY_PREFIX}.LastAuthUser`);
  if (!lastUser) return null;
  return localStorage.getItem(`${COGNITO_KEY_PREFIX}.${lastUser}.refreshToken`);
}

/** Read the current access token from localStorage */
export function getAccessToken(): string | null {
  const lastUser = localStorage.getItem(`${COGNITO_KEY_PREFIX}.LastAuthUser`);
  if (!lastUser) return null;
  return localStorage.getItem(`${COGNITO_KEY_PREFIX}.${lastUser}.accessToken`);
}

/** Decode a JWT payload (not verified — just parsed) */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/** Check if an access token is expired or expiring within bufferSeconds */
export function isTokenExpired(token: string, bufferSeconds = 300): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp - bufferSeconds;
}

/** Call Cognito InitiateAuth to refresh tokens */
async function callCognitoRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; idToken: string } | null> {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const result = data.AuthenticationResult;
  if (!result?.AccessToken || !result?.IdToken) return null;

  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
  };
}

/** Update localStorage with new tokens */
function updateStoredTokens(accessToken: string, idToken: string): void {
  const lastUser = localStorage.getItem(`${COGNITO_KEY_PREFIX}.LastAuthUser`);
  if (!lastUser) return;

  const prefix = `${COGNITO_KEY_PREFIX}.${lastUser}`;
  localStorage.setItem(`${prefix}.accessToken`, accessToken);
  localStorage.setItem(`${prefix}.idToken`, idToken);

  // Update BookingUserState.user.token (which uses the access token)
  const raw = localStorage.getItem("BookingUserState");
  if (raw) {
    try {
      const state: BookingUserState = JSON.parse(raw);
      state.user.token = accessToken;
      localStorage.setItem("BookingUserState", JSON.stringify(state));
    } catch {
      // ignore parse errors
    }
  }
}

export interface AuthResult {
  token: string;
  lupId: string;
  email: string;
}

/**
 * Ensure we have a valid access token.
 * Refreshes silently if expired. Returns null if login is required.
 */
export async function ensureAuth(): Promise<AuthResult | null> {
  // 1. Check for refresh token
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  // 2. Check current access token
  let accessToken = getAccessToken();
  if (accessToken && !isTokenExpired(accessToken)) {
    // Token is still valid — read lupId from BookingUserState
    const state = getBookingUserState();
    if (state) {
      return {
        token: accessToken,
        lupId: state.user.lupId,
        email: state.user.email,
      };
    }
  }

  // 3. Token expired or missing — refresh
  const newTokens = await callCognitoRefresh(refreshToken);
  if (!newTokens) return null;

  updateStoredTokens(newTokens.accessToken, newTokens.idToken);

  const state = getBookingUserState();
  if (!state) return null;

  return {
    token: newTokens.accessToken,
    lupId: state.user.lupId,
    email: state.user.email,
  };
}

/** Read BookingUserState from localStorage */
function getBookingUserState(): BookingUserState | null {
  try {
    const raw = localStorage.getItem("BookingUserState");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
