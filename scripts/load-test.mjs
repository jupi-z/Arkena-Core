import http from 'node:http';
import https from 'node:https';
import { performance } from 'node:perf_hooks';

const baseUrl = process.env.LOAD_TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const durationSeconds = Number(process.env.LOAD_TEST_DURATION_SECONDS ?? 20);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? 10);
const maxP95Ms = Number(process.env.LOAD_TEST_MAX_P95_MS ?? 500);
const maxErrorRate = Number(process.env.LOAD_TEST_MAX_ERROR_RATE ?? 0.01);
const targetPath = process.env.LOAD_TEST_PATH ?? '/health/ready';

const client = baseUrl.startsWith('https:') ? https : http;
const endAt = Date.now() + durationSeconds * 1000;
const latencies = [];
let completed = 0;
let failed = 0;

function requestOnce() {
  return new Promise((resolve) => {
    const started = performance.now();
    const req = client.get(`${baseUrl}${targetPath}`, (res) => {
      res.resume();
      res.on('end', () => {
        const latency = performance.now() - started;
        latencies.push(latency);
        completed += 1;
        if (res.statusCode < 200 || res.statusCode >= 400) {
          failed += 1;
        }
        resolve();
      });
    });

    req.setTimeout(10_000, () => {
      failed += 1;
      completed += 1;
      req.destroy();
      resolve();
    });

    req.on('error', () => {
      failed += 1;
      completed += 1;
      resolve();
    });
  });
}

async function worker() {
  while (Date.now() < endAt) {
    await requestOnce();
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

latencies.sort((left, right) => left - right);
const percentile = (value) => latencies[Math.max(0, Math.ceil((value / 100) * latencies.length) - 1)] ?? 0;
const p95 = percentile(95);
const errorRate = completed === 0 ? 1 : failed / completed;
const rps = completed / durationSeconds;

const summary = {
  baseUrl,
  path: targetPath,
  durationSeconds,
  concurrency,
  completed,
  failed,
  errorRate,
  rps,
  p50Ms: percentile(50),
  p95Ms: p95,
  p99Ms: percentile(99),
  thresholds: {
    maxP95Ms,
    maxErrorRate
  }
};

console.log(JSON.stringify(summary, null, 2));

if (p95 > maxP95Ms || errorRate > maxErrorRate) {
  process.exit(1);
}
