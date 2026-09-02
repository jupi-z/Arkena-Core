import { spawnSync } from 'node:child_process';

const supportedFilePattern = /\.(c|m)?(j|t)sx?$|\.json$/;
const ignoredFiles = new Set(['package-lock.json']);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options
  });

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function resolveBaseRef() {
  const hasParent = spawnSync('git', ['rev-parse', '--verify', 'HEAD^'], {
    stdio: 'ignore'
  });

  return hasParent.status === 0 ? 'HEAD^' : '--root';
}

const baseRef = resolveBaseRef();
const diffArgs =
  baseRef === '--root'
    ? ['diff-tree', '--no-commit-id', '--name-only', '--diff-filter=ACMR', '-r', 'HEAD']
    : ['diff', '--name-only', '--diff-filter=ACMR', baseRef, 'HEAD'];

const changedFiles = run('git', diffArgs)
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file) => supportedFilePattern.test(file))
  .filter((file) => !ignoredFiles.has(file));

if (changedFiles.length === 0) {
  console.log('No changed files require Biome formatting.');
  process.exit(0);
}

const result = spawnSync('npx', ['biome', 'format', '--no-errors-on-unmatched', ...changedFiles], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(result.status ?? 1);
