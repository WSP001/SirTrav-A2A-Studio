#!/usr/bin/env node
// File: scripts/validate-weekly-pulse.mjs
// Owner: Antigravity (AG-011)
// Purpose: Validates weekly-harvest.json and weekly-pulse-analysis.json
//          against their JSON Schema contracts in artifacts/contracts/
// Pattern: No Fake Success — if schemas are missing or invalid, exit 1
// Usage: node scripts/validate-weekly-pulse.mjs [--harvest <file>] [--analysis <file>] [--dry-run]

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Configuration ──────────────────────────────────────────────────
const SCHEMAS = {
    harvest: {
        schemaPath: 'artifacts/contracts/weekly-harvest.schema.json',
        defaultDataPath: 'output/weekly-harvest.json',
        label: 'Weekly Harvest',
    },
    analysis: {
        schemaPath: 'artifacts/contracts/weekly-pulse-analysis.schema.json',
        defaultDataPath: 'output/weekly-pulse-analysis.json',
        label: 'Weekly Pulse Analysis',
    },
};

// ─── CLI Arg Parsing ────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const harvestOverride = args.includes('--harvest') ? args[args.indexOf('--harvest') + 1] : null;
const analysisOverride = args.includes('--analysis') ? args[args.indexOf('--analysis') + 1] : null;

// ─── Minimal JSON Schema Validator (no dependencies) ────────────────
// Validates required fields, types, enums, patterns, and min/max
// For production, swap with Ajv — this covers 90% of contract checks
function validateAgainstSchema(data, schema, path = '') {
    const errors = [];

    if (!schema || typeof schema !== 'object') return errors;

    // Type check
    if (schema.type) {
        const actual = Array.isArray(data) ? 'array' : typeof data;
        if (schema.type === 'integer') {
            if (typeof data !== 'number' || !Number.isInteger(data)) {
                errors.push(`${path || 'root'}: expected integer, got ${typeof data}`);
                return errors;
            }
        } else if (schema.type === 'array') {
            if (!Array.isArray(data)) {
                errors.push(`${path || 'root'}: expected array, got ${actual}`);
                return errors;
            }
        } else if (actual !== schema.type) {
            errors.push(`${path || 'root'}: expected ${schema.type}, got ${actual}`);
            return errors;
        }
    }

    // Const check
    if (schema.const !== undefined && data !== schema.const) {
        errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
    }

    // Enum check
    if (schema.enum && !schema.enum.includes(data)) {
        errors.push(`${path}: value "${data}" not in enum [${schema.enum.join(', ')}]`);
    }

    // Pattern check
    if (schema.pattern && typeof data === 'string') {
        if (!new RegExp(schema.pattern).test(data)) {
            errors.push(`${path}: value "${data}" doesn't match pattern ${schema.pattern}`);
        }
    }

    // Min/Max for numbers
    if (schema.minimum !== undefined && typeof data === 'number' && data < schema.minimum) {
        errors.push(`${path}: ${data} < minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && typeof data === 'number' && data > schema.maximum) {
        errors.push(`${path}: ${data} > maximum ${schema.maximum}`);
    }

    // MinLength/MaxLength for strings
    if (schema.minLength !== undefined && typeof data === 'string' && data.length < schema.minLength) {
        errors.push(`${path}: string length ${data.length} < minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && typeof data === 'string' && data.length > schema.maxLength) {
        errors.push(`${path}: string length ${data.length} > maxLength ${schema.maxLength}`);
    }

    // Required fields
    if (schema.required && schema.type === 'object' && typeof data === 'object') {
        for (const req of schema.required) {
            if (data[req] === undefined) {
                errors.push(`${path}: missing required field "${req}"`);
            }
        }
    }

    // Properties (recurse)
    if (schema.properties && typeof data === 'object' && !Array.isArray(data)) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (data[key] !== undefined) {
                const resolved = resolveRef(propSchema, schema);
                errors.push(...validateAgainstSchema(data[key], resolved, `${path}.${key}`));
            }
        }
    }

    // Array items
    if (schema.items && Array.isArray(data)) {
        if (schema.minItems !== undefined && data.length < schema.minItems) {
            errors.push(`${path}: array length ${data.length} < minItems ${schema.minItems}`);
        }
        if (schema.maxItems !== undefined && data.length > schema.maxItems) {
            errors.push(`${path}: array length ${data.length} > maxItems ${schema.maxItems}`);
        }
        const itemSchema = resolveRef(schema.items, schema);
        data.forEach((item, i) => {
            errors.push(...validateAgainstSchema(item, itemSchema, `${path}[${i}]`));
        });
    }

    // additionalProperties check
    if (schema.additionalProperties === false && schema.properties && typeof data === 'object' && !Array.isArray(data)) {
        const allowed = new Set(Object.keys(schema.properties));
        for (const key of Object.keys(data)) {
            if (!allowed.has(key)) {
                errors.push(`${path}: unexpected property "${key}" (additionalProperties: false)`);
            }
        }
    }

    return errors;
}

// ─── $ref resolver (supports local #/$defs/ only) ────────────────
let rootSchema = null;

function resolveRef(schema, parent) {
    if (!schema) return schema;
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/$defs/', '');
        const root = rootSchema || parent;
        if (root.$defs && root.$defs[refPath]) {
            return root.$defs[refPath];
        }
        return schema; // Can't resolve, return as-is
    }
    return schema;
}

// ─── Runner ─────────────────────────────────────────────────────────
console.log('🔍 Weekly Pulse Contract Validation (Antigravity AG-011)');
console.log('─'.repeat(55));

let totalChecks = 0;
let passed = 0;
let failed = 0;

function validateContract(key, dataPathOverride) {
    const config = SCHEMAS[key];
    const schemaFile = join(ROOT, config.schemaPath);

    console.log(`\n📋 ${config.label}`);
    console.log(`   Schema: ${config.schemaPath}`);

    // Step 1: Schema file exists
    totalChecks++;
    if (!existsSync(schemaFile)) {
        console.log(`   ❌ Schema file NOT FOUND`);
        failed++;
        return;
    }
    console.log(`   ✅ Schema file exists`);
    passed++;

    // Step 2: Schema is valid JSON
    totalChecks++;
    let schema;
    try {
        schema = JSON.parse(readFileSync(schemaFile, 'utf-8'));
        console.log(`   ✅ Schema is valid JSON`);
        passed++;
    } catch (e) {
        console.log(`   ❌ Schema JSON parse error: ${e.message}`);
        failed++;
        return;
    }

    // Step 3: Schema has required meta fields
    totalChecks++;
    const metaFields = ['$schema', '$id', 'title', 'type'];
    const missingMeta = metaFields.filter(f => !schema[f]);
    if (missingMeta.length > 0) {
        console.log(`   ❌ Schema missing meta fields: ${missingMeta.join(', ')}`);
        failed++;
    } else {
        console.log(`   ✅ Schema meta fields present ($schema, $id, title, type)`);
        passed++;
    }

    // Step 4: Schema has examples
    totalChecks++;
    if (schema.examples && schema.examples.length > 0) {
        console.log(`   ✅ Schema includes ${schema.examples.length} example(s)`);
        passed++;
    } else {
        console.log(`   ⚠️  Schema has no examples (non-blocking)`);
        passed++; // Non-blocking
    }

    // Step 5: Validate examples against schema
    if (schema.examples && schema.examples.length > 0) {
        rootSchema = schema;
        for (let i = 0; i < schema.examples.length; i++) {
            totalChecks++;
            const example = schema.examples[i];
            const errors = validateAgainstSchema(example, schema);
            if (errors.length === 0) {
                console.log(`   ✅ Example ${i + 1} validates against schema`);
                passed++;
            } else {
                console.log(`   ❌ Example ${i + 1} has ${errors.length} error(s):`);
                errors.forEach(e => console.log(`      - ${e}`));
                failed++;
            }
        }
        rootSchema = null;
    }

    // Step 6: Validate data file if present
    const dataFile = dataPathOverride
        ? join(ROOT, dataPathOverride)
        : join(ROOT, config.defaultDataPath);

    if (existsSync(dataFile)) {
        totalChecks++;
        try {
            const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
            rootSchema = schema;
            const errors = validateAgainstSchema(data, schema);
            rootSchema = null;
            if (errors.length === 0) {
                console.log(`   ✅ Data file validates: ${dataFile}`);
                passed++;
            } else {
                console.log(`   ❌ Data file has ${errors.length} error(s):`);
                errors.slice(0, 5).forEach(e => console.log(`      - ${e}`));
                if (errors.length > 5) console.log(`      ... and ${errors.length - 5} more`);
                failed++;
            }
        } catch (e) {
            console.log(`   ❌ Data file parse error: ${e.message}`);
            failed++;
        }
    } else if (dryRun) {
        console.log(`   ⚪ Data file not present (dry-run mode — schema-only validation)`);
    } else {
        console.log(`   ⚪ No data file yet at ${config.defaultDataPath}`);
    }
}

// Run both validations
validateContract('harvest', harvestOverride);
validateContract('analysis', analysisOverride);

// Also check social-post schema (existing contract)
console.log('\n📋 Existing Contracts (regression check)');
const socialSchema = join(ROOT, 'artifacts/contracts/social-post.schema.json');
const costingSchema = join(ROOT, 'artifacts/data/job-costing.schema.json');

totalChecks++;
if (existsSync(socialSchema)) {
    try {
        JSON.parse(readFileSync(socialSchema, 'utf-8'));
        console.log('   ✅ social-post.schema.json — valid JSON');
        passed++;
    } catch (e) {
        console.log(`   ❌ social-post.schema.json — ${e.message}`);
        failed++;
    }
} else {
    console.log('   ❌ social-post.schema.json — NOT FOUND');
    failed++;
}

totalChecks++;
if (existsSync(costingSchema)) {
    try {
        JSON.parse(readFileSync(costingSchema, 'utf-8'));
        console.log('   ✅ job-costing.schema.json — valid JSON');
        passed++;
    } catch (e) {
        console.log(`   ❌ job-costing.schema.json — ${e.message}`);
        failed++;
    }
} else {
    console.log('   ❌ job-costing.schema.json — NOT FOUND');
    failed++;
}

// ─── Summary ────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(55));
console.log(`📊 Results: ${passed}/${totalChecks} passed, ${failed} failed`);

if (failed > 0) {
    console.log('❌ Contract validation FAILED');
    process.exit(1);
} else {
    console.log('✅ All contracts valid — Weekly Pulse schemas enforced!');
    process.exit(0);
}
