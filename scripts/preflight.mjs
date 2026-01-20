import fs from 'fs';
import path from 'path';

console.log('🚀 Preflight Check: Validating Environment...');

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

if (errors > 0) {
    console.error(`\n❌ Preflight Failed with ${errors} errors.`);
    process.exit(1);
} else {
    console.log('\n✅ Preflight Passed! System ready for lift-off.');
    process.exit(0);
}
