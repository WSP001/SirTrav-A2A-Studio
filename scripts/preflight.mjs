import fs from 'fs';
import path from 'path';

console.log('🚀 Preflight Check: Validating Environment...');

// 🎯 MG-P0-A: Ping healthcheck first to detect if netlify dev is running
const HEALTHCHECK_URL = process.env.HEALTHCHECK_URL || 'http://localhost:8888/.netlify/functions/healthcheck';
const SKIP_HEALTHCHECK = process.argv.includes('--skip-healthcheck');

async function pingHealthcheck() {
    if (SKIP_HEALTHCHECK) {
        console.log('\n🔄 Skipping healthcheck ping (--skip-healthcheck flag)');
        return true;
    }

    console.log('\n🔗 Pinging local runtime...');
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(HEALTHCHECK_URL, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            console.log(`  ✅ Local runtime is ${data.status} (v${data.version})`);
            if (data.env_snapshot) {
                console.log(`  📊 OpenAI: ${data.env_snapshot.openai ? '✅' : '❌'} | ElevenLabs: ${data.env_snapshot.elevenlabs ? '✅' : '❌'}`);
            }
            return true;
        } else {
            console.error(`  ⚠️ Healthcheck returned ${response.status}`);
            return true; // Still running, just degraded
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.name === 'AbortError' || error.cause?.code === 'ECONNREFUSED') {
            console.error('\n  ❌ ECONNREFUSED: Local runtime is NOT running!');
            console.error('  ');
            console.error('  💡 To fix, run this command in another terminal:');
            console.error('  ');
            console.error('     npm run dev');
            console.error('     # or: netlify dev');
            console.error('  ');
            console.error('  Then re-run preflight.');
            console.error('  ');
            return false;
        }
        console.error(`  ⚠️ Healthcheck error: ${error.message}`);
        return false;
    }
}

const REQUIRED_FILES = [
    'netlify/functions/start-pipeline.ts',
    'netlify/functions/run-pipeline-background.ts',
    'netlify/functions/lib/cost-manifest.ts',
    'netlify/functions/lib/quality-gate.ts',
    'netlify/functions/lib/publish.ts',
    'scripts/verify-golden-path.mjs',
    'scripts/verify-security.mjs',
    'package.json'
];

const REQUIRED_DIRS = [
    'netlify/functions',
    'scripts',
    'pipelines',
    'inputs',
    'output',
    'artifacts'
];

let errors = 0;

// 1. Check Files
console.log('\n📄 Checking Critical Files...');
REQUIRED_FILES.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ Found: ${file}`);
    } else {
        console.error(`  ❌ MISSING: ${file}`);
        errors++;
    }
});

// 2. Check Directories
console.log('\n📂 Checking Directories...');
REQUIRED_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`  ✅ Found: ${dir}/`);
    } else {
        console.error(`  ❌ MISSING: ${dir}/`);
        errors++;
    }
});

// 3. Check Env
console.log('\n🔐 Checking Environment...');
// Note: We can only check what's loaded or in process.env
// On Windows/Local, we often rely on .env.local usually loaded by frameworks, 
// but here we just check if npm/node has access to minimal vars if set.
// We'll skip stringent env check in preflight as .env.local handles it for Netlify.
if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    if (envContent.includes('OPENAI_API_KEY')) console.log('  ✅ OPENAI_API_KEY detected in .env.local');
    else console.warn('  ⚠️ OPENAI_API_KEY missing in .env.local');
}

// 🎯 MG-P0-A: Run healthcheck ping and then validate files
async function main() {
    const healthOk = await pingHealthcheck();

    if (!healthOk) {
        console.error(`\n❌ Preflight Failed: Local runtime not running.`);
        process.exit(1);
    }

    if (errors > 0) {
        console.error(`\n❌ Preflight Failed with ${errors} errors.`);
        process.exit(1);
    } else {
        console.log('\n✅ Preflight Passed! System ready for lift-off.');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Preflight error:', err);
    process.exit(1);
});
