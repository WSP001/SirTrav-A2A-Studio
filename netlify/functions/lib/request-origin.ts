import type { HandlerEvent } from '@netlify/functions';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function normalizeBaseUrl(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = trimTrailingSlash(value.trim());
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

export function getEventBaseUrl(event: Pick<HandlerEvent, 'headers'>): string {
  const forwardedProto = event.headers['x-forwarded-proto'];
  const forwardedHost = event.headers['x-forwarded-host'];
  const host = forwardedHost || event.headers.host;
  const normalizedHost = Array.isArray(host) ? host[0] : host;
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;

  if (normalizedHost) {
    return `${proto || 'https'}://${normalizedHost}`;
  }

  return normalizeBaseUrl(process.env.DEPLOY_PRIME_URL)
    || normalizeBaseUrl(process.env.DEPLOY_URL)
    || normalizeBaseUrl(process.env.URL)
    || 'http://localhost:8888';
}

export function buildFunctionUrl(baseUrl: string, functionName: string): string {
  return `${trimTrailingSlash(baseUrl)}/.netlify/functions/${functionName}`;
}
