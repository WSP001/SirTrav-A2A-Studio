/**
 * Tracing Module - Simplified for Local Development
 * 
 * Full OpenTelemetry tracing is available in production via:
 * - @opentelemetry/resources
 * - @opentelemetry/sdk-trace-node
 * - @opentelemetry/exporter-trace-otlp-proto
 * - @traceloop/instrumentation-openai
 * 
 * For local dev, we use console-based tracing that's always available.
 */

declare global {
  // eslint-disable-next-line no-var
  var tracingInitialized: boolean | undefined;
}

export interface TraceSpan {
  success: (metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
  addEvent: (name: string, attributes?: Record<string, unknown>) => void;
}

/**
 * Initialize tracing for a service
 * In production, this would set up OpenTelemetry
 * For local dev, we just log a message
 */
export function initTracing(serviceName: string): void {
  if (process.env.TRACING_ENABLED !== 'true') {
    return;
  }

  if (global.tracingInitialized) {
    return;
  }

  console.log(`[Tracing] Initialized for service: ${serviceName}`);
  global.tracingInitialized = true;
}

/**
 * Create a trace span for an operation
 * Returns a span object with success/error methods
 */
export function trace(operationName: string): TraceSpan {
  const startTime = Date.now();
  const spanId = Math.random().toString(36).substring(2, 10);

  if (process.env.TRACING_ENABLED === 'true') {
    console.log(`[Trace:${spanId}] START: ${operationName}`);
  }

  return {
    success: (metadata?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      if (process.env.TRACING_ENABLED === 'true') {
        console.log(`[Trace:${spanId}] SUCCESS: ${operationName} (${duration}ms)`, metadata || '');
      }
    },
    error: (message: string, metadata?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      console.error(`[Trace:${spanId}] ERROR: ${operationName} (${duration}ms): ${message}`, metadata || '');
    },
    addEvent: (name: string, attributes?: Record<string, unknown>) => {
      if (process.env.TRACING_ENABLED === 'true') {
        console.log(`[Trace:${spanId}] EVENT: ${name}`, attributes || '');
      }
    },
  };
}

export default { initTracing, trace };
