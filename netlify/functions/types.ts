export interface NetlifyEvent {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  httpMethod?: string;
}

export interface NetlifyContext {
  functionName?: string;
}

export interface NetlifyResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export type HandlerResult = NetlifyResult | Response;

export type Handler = (event: NetlifyEvent, context?: NetlifyContext) => Promise<HandlerResult> | HandlerResult;
