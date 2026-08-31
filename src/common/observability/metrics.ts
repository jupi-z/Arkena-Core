import type { Request, RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { getStartedAt } from '../runtime/state.js';

type RequestMetricKey = `${string} ${string} ${number}`;

const durationBucketsSeconds = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const requestCounts = new Map<RequestMetricKey, number>();
const requestDurationSums = new Map<string, number>();
const requestDurationBuckets = new Map<string, number[]>();

function sanitizeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function labels(values: Record<string, string | number>): string {
  return Object.entries(values)
    .map(([key, value]) => `${key}="${sanitizeLabel(String(value))}"`)
    .join(',');
}

function routeLabel(req: Request): string {
  if (req.route?.path) {
    return `${req.baseUrl}${String(req.route.path)}` || '/';
  }

  return req.path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id')
    .replace(/\bc[a-z0-9]{8,}\b/gi, ':id')
    .replace(/\b\d+\b/g, ':id');
}

function incrementMap(map: Map<string, number>, key: string, incrementBy = 1): void {
  map.set(key, (map.get(key) ?? 0) + incrementBy);
}

export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;
    const method = req.method;
    const route = routeLabel(req);
    const statusCode = res.statusCode;
    const countKey: RequestMetricKey = `${method} ${route} ${statusCode}`;
    const durationKey = `${method} ${route}`;

    incrementMap(requestCounts, countKey);
    incrementMap(requestDurationSums, durationKey, durationSeconds);

    const bucketCounts = requestDurationBuckets.get(durationKey) ?? Array(durationBucketsSeconds.length + 1).fill(0);
    const bucketIndex = durationBucketsSeconds.findIndex((bucket) => durationSeconds <= bucket);
    bucketCounts[bucketIndex === -1 ? durationBucketsSeconds.length : bucketIndex] += 1;
    requestDurationBuckets.set(durationKey, bucketCounts);
  });

  next();
};

export function renderMetrics(): string {
  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - getStartedAt().getTime()) / 1000);
  const lines: string[] = [
    '# HELP arkena_process_start_time_seconds Unix timestamp when the API process started.',
    '# TYPE arkena_process_start_time_seconds gauge',
    `arkena_process_start_time_seconds ${Math.floor(getStartedAt().getTime() / 1000)}`,
    '# HELP arkena_process_uptime_seconds API process uptime in seconds.',
    '# TYPE arkena_process_uptime_seconds gauge',
    `arkena_process_uptime_seconds ${uptimeSeconds}`,
    '# HELP arkena_nodejs_memory_rss_bytes Resident memory size in bytes.',
    '# TYPE arkena_nodejs_memory_rss_bytes gauge',
    `arkena_nodejs_memory_rss_bytes ${memory.rss}`,
    '# HELP arkena_http_requests_total Total HTTP requests by method, route and status code.',
    '# TYPE arkena_http_requests_total counter'
  ];

  for (const [key, count] of [...requestCounts.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const [method, route, statusCode] = key.split(' ');
    lines.push(`arkena_http_requests_total{${labels({ method, route, status_code: statusCode })}} ${count}`);
  }

  lines.push(
    '# HELP arkena_http_request_duration_seconds HTTP request duration histogram in seconds.',
    '# TYPE arkena_http_request_duration_seconds histogram'
  );

  for (const [key, bucketCounts] of [...requestDurationBuckets.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const [method, route] = key.split(' ');
    let cumulative = 0;

    durationBucketsSeconds.forEach((bucket, index) => {
      cumulative += bucketCounts[index] ?? 0;
      lines.push(`arkena_http_request_duration_seconds_bucket{${labels({ method, route, le: bucket })}} ${cumulative}`);
    });

    cumulative += bucketCounts[durationBucketsSeconds.length] ?? 0;
    lines.push(`arkena_http_request_duration_seconds_bucket{${labels({ method, route, le: '+Inf' })}} ${cumulative}`);
    lines.push(`arkena_http_request_duration_seconds_sum{${labels({ method, route })}} ${requestDurationSums.get(key) ?? 0}`);
    lines.push(`arkena_http_request_duration_seconds_count{${labels({ method, route })}} ${cumulative}`);
  }

  return `${lines.join('\n')}\n`;
}

export const metricsAuthMiddleware: RequestHandler = (req, res, next) => {
  if (!env.METRICS_BEARER_TOKEN) {
    next();
    return;
  }

  const authorization = req.headers.authorization;
  if (authorization === `Bearer ${env.METRICS_BEARER_TOKEN}`) {
    next();
    return;
  }

  res.status(401).json({
    success: false,
    error: {
      code: 'METRICS_UNAUTHORIZED',
      message: 'Metrics endpoint requires a valid bearer token'
    }
  });
};
