import { Buffer } from 'node:buffer';
import type { LogEvent } from 'kysely';
import { logger } from '@ts-packages/logger';
import { asyncContext } from './traceAsyncContext';

export * from './traceAsyncContext';

function maskPII(value: unknown): string | unknown {
  if (typeof value === 'string' && looksSensitive(value)) {
    return '***';
  }
  return value;
}

function convertBufferToBase64(value: unknown): string | unknown {
  if (Buffer.isBuffer(value)) {
    return `${value.toString('base64')}`;
  }
  console.log('value', value);
  return value;
}

function looksSensitive(value: string): boolean {
  return value.includes('password'); // 密碼
  // value.includes('@') || // email
  // value.length > 50 ||   // 長字串（可能是 token）
  // value.match(/^(\d{4}[- ]?){4}\d{4}$/) // 簡單信用卡格式
}

export function createKyselyLogger(serviceName: string) {
  return (event: LogEvent) => {
    const traceId = asyncContext.getStore()?.traceId ?? 'no-trace-id';
    let formattedParams = event.query.parameters.map(convertBufferToBase64);
    formattedParams = formattedParams.map(maskPII);
    if (event.level === 'error') {
      logger.error(
        {
          durationMs: event.queryDurationMillis,
          error: event.error,
          sql: event.query.sql,
          params: formattedParams,
          traceId,
          serviceName,
        },
        `[${serviceName}] Query Failed`,
      );
    } else {
      logger.debug(
        {
          durationMs: event.queryDurationMillis,
          sql: event.query.sql,
          params: formattedParams,
          traceId,
          serviceName,
        },
        `[${serviceName}] Query Executed`,
      );
    }
  };
}
