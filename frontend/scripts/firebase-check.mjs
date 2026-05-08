import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'daysync-f4b1e';
const RETRY_DELAY_MS = 1500;
const reportMode = process.argv.includes('--report');
const reportPath = 'firebase-check-report.txt';
const reportLines = [];

const checks = [
  ['firebase', ['--version'], 'Firebase CLI version'],
  ['firebase', ['login:list'], 'Authenticated Firebase accounts'],
  ['firebase', ['projects:list'], 'Accessible Firebase projects'],
  ['firebase', ['use', '--project', projectId], 'Active Firebase project'],
  ['firebase', ['hosting:channel:list', '--project', projectId], 'Hosting channels'],
];
const endpointChecks = [
  ['https://serviceusage.googleapis.com', 'Google Service Usage API reachability'],
  ['https://firebase.googleapis.com', 'Firebase Management API reachability'],
  ['https://firebasehosting.googleapis.com', 'Firebase Hosting API reachability'],
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function log(message = '') {
  console.log(message);
  reportLines.push(message);
}

function error(message = '') {
  console.error(message);
  reportLines.push(message);
}

function classifyFailure(output) {
  const text = output.toLowerCase();

  if (
    text.includes('timed out') ||
    text.includes('failed to make request') ||
    text.includes('unable to fetch') ||
    text.includes('serviceusage.googleapis.com') ||
    text.includes('failed to list firebase projects') ||
    text.includes('unexpected error has occurred')
  ) {
    return 'network';
  }

  if (
    text.includes('credentials are no longer valid') ||
    text.includes('please run firebase login') ||
    text.includes('authentication error')
  ) {
    return 'auth';
  }

  if (
    text.includes('project exists and your account has permission') ||
    text.includes('failed to get firebase project')
  ) {
    return 'permissions';
  }

  return 'unknown';
}

function suggestFixes(type) {
  if (type === 'network') {
    return [
      'Check VPN/proxy/firewall and retry in 1-2 minutes.',
      'Try: firebase projects:list --debug',
      'If on corporate network, allow Google APIs used by Firebase CLI.',
    ];
  }

  if (type === 'auth') {
    return [
      'Reauthenticate: firebase login --reauth',
      'Confirm account: firebase login:list',
    ];
  }

  if (type === 'permissions') {
    return [
      `Verify project ID is correct: ${projectId}`,
      'Confirm your Google account has access in Firebase Console IAM.',
      'Try opening Hosting in Firebase Console once, then rerun checks.',
    ];
  }

  return [
    'Open firebase-debug.log and inspect the latest error details.',
    'Retry with --debug to get full API trace.',
  ];
}

function runCheck(command, args, label) {
  return new Promise((resolve) => {
    const prettyCommand = `${command} ${args.join(' ')}`;
    log(`\n=== ${label} ===`);
    log(`$ ${prettyCommand}`);

    const child = spawn(command, args, { shell: true, env: process.env });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (stdout.trim()) log(stdout.trim());
      if (stderr.trim()) error(stderr.trim());

      const output = `${stdout}\n${stderr}`;
      const failureType = code === 0 ? null : classifyFailure(output);

      if (code === 0) {
        log('Status: OK');
      } else {
        log(`Status: FAILED (exit ${code ?? 'unknown'})`);
      }

      resolve({ code, label, failureType, output });
    });
  });
}

async function main() {
  log(`Running Firebase diagnostics for project: ${projectId}`);
  if (reportMode) {
    log(`Report mode: ON (${reportPath})`);
  }
  const results = [];

  for (const [command, args, label] of checks) {
    // Keep checks sequential for readable output.
    // This also avoids hitting Firebase APIs in bursts.
    let attempt = 1;
    const maxAttempts = label === 'Firebase CLI version' ? 1 : 2;
    let result;

    while (attempt <= maxAttempts) {
      // eslint-disable-next-line no-await-in-loop
      result = await runCheck(command, args, `${label}${attempt > 1 ? ` (retry ${attempt})` : ''}`);
      if (result.code === 0) break;

      const retryable = result.failureType === 'network';
      const hasAnotherAttempt = attempt < maxAttempts;
      if (!retryable || !hasAnotherAttempt) break;

      log(`Retrying after ${RETRY_DELAY_MS}ms due to transient network/API error...`);
      // eslint-disable-next-line no-await-in-loop
      await sleep(RETRY_DELAY_MS);
      attempt += 1;
    }

    results.push({ ...result, label });
  }

  const failed = results.filter((r) => r.code !== 0);
  const endpointResults = [];

  log('\n=== API Reachability ===');
  for (const [url, label] of endpointChecks) {
    try {
      // A non-network HTTP response (including 401/403/404) means endpoint is reachable.
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url, { method: 'GET' });
      log(`- ${label}: REACHABLE (HTTP ${response.status})`);
      endpointResults.push({ label, ok: true, status: response.status });
    } catch (err) {
      log(`- ${label}: UNREACHABLE (${String(err)})`);
      endpointResults.push({ label, ok: false, error: String(err) });
    }
  }

  log('\n=== Summary ===');
  log(`Checks passed: ${results.length - failed.length}/${results.length}`);
  const unreachableEndpoints = endpointResults.filter((r) => !r.ok);
  log(`API endpoints reachable: ${endpointResults.length - unreachableEndpoints.length}/${endpointResults.length}`);

  if (failed.length > 0) {
    log('Failed checks:');
    for (const failure of failed) {
      log(`- ${failure.label}`);
      const hints = suggestFixes(failure.failureType);
      for (const hint of hints) {
        log(`  -> ${hint}`);
      }
    }
    process.exitCode = 1;
  }

  if (unreachableEndpoints.length > 0) {
    log('Unreachable API endpoints detected:');
    for (const endpoint of unreachableEndpoints) {
      log(`- ${endpoint.label}`);
    }
    log('  -> This strongly suggests a local network/proxy/firewall issue.');
    process.exitCode = 1;
  }

  if (reportMode) {
    await writeFile(reportPath, `${reportLines.join('\n')}\n`, 'utf8');
    log(`Report written to ${reportPath}`);
  }
}

main().catch((err) => {
  error(`Unexpected firebase check error: ${String(err)}`);
  process.exitCode = 1;
});
