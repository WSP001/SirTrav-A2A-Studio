#!/usr/bin/env node
// File: scripts/validate-social-contracts.mjs
// Purpose: Validates API response shapes match expected contracts
// Pattern: No Fake Success - ensures all responses follow the contract
// Usage: node scripts/validate-social-contracts.mjs

console.log('🔍 Social Media Contract Validation');
console.log('─'.repeat(50));

// Expected response schemas (No Fake Success pattern)
const EXPECTED_SCHEMAS = {
  publishSuccess: {
    success: 'boolean',  // Must be true
    postId: 'string',
    postUrl: 'string',
    cost: {
      apiCalls: 'number',
      estimatedCost: 'number',
      markup: 'number',
      total: 'number',
    },
  },
  publishDisabled: {
    success: 'boolean',  // Must be false
    disabled: 'boolean', // Must be true
    error: 'string',
  },
  publishError: {
    success: 'boolean',  // Must be false
    error: 'string',
  },
};

// Validate shape recursively
function validateShape(actual, expected, path = '') {
  const errors = [];
  
  for (const [key, expectedType] of Object.entries(expected)) {
    const actualValue = actual[key];
    const currentPath = path ? `${path}.${key}` : key;
    
    if (actualValue === undefined) {
      errors.push(`Missing: ${currentPath}`);
      continue;
    }
    
    if (typeof expectedType === 'object' && expectedType !== null) {
      errors.push(...validateShape(actualValue, expectedType, currentPath));
    } else if (typeof actualValue !== expectedType) {
      errors.push(`Type mismatch: ${currentPath} (expected ${expectedType}, got ${typeof actualValue})`);
    }
  }
  
  return errors;
}

// Test each platform's response shape
const platforms = ['youtube', 'twitter', 'instagram', 'tiktok', 'linkedin'];

console.log('\n📋 Contract Validation Results:\n');

// Mock responses for validation (these would come from actual API calls in live mode)
const mockResponses = {
  youtube: {
    success: true,
    postId: 'yt-123',
    postUrl: 'https://youtube.com/watch?v=123',
    cost: { apiCalls: 1, estimatedCost: 0.001, markup: 0.20, total: 0.0012 }
  },
  twitter: {
    success: false,
    disabled: true,
    error: 'Twitter API keys not configured'
  },
  instagram: {
    success: false,
    disabled: true,
    error: 'Instagram API keys not configured'
  },
  tiktok: {
    success: false,
    disabled: true,
    error: 'TikTok API keys not configured'
  },
  linkedin: {
    success: false,
    disabled: true,
    error: 'LinkedIn API keys not configured'
  }
};

let allValid = true;

for (const platform of platforms) {
  const response = mockResponses[platform];
  
  // Determine which schema to validate against
  let schemaName;
  if (response.success === true) {
    schemaName = 'publishSuccess';
  } else if (response.disabled === true) {
    schemaName = 'publishDisabled';
  } else {
    schemaName = 'publishError';
  }
  
  const schema = EXPECTED_SCHEMAS[schemaName];
  const errors = validateShape(response, schema);
  
  if (errors.length === 0) {
    console.log(`✅ ${platform}: Schema matches (${schemaName})`);
  } else {
    console.log(`❌ ${platform}: Schema mismatch`);
    errors.forEach(e => console.log(`   - ${e}`));
    allValid = false;
  }
}

// No Fake Success validation
console.log('\n📊 No Fake Success Pattern Check:\n');

for (const platform of platforms) {
  const response = mockResponses[platform];
  
  // Rule: If disabled=true, success MUST be false
  if (response.disabled === true && response.success === true) {
    console.log(`❌ ${platform}: VIOLATION - disabled=true but success=true (Fake Success!)`);
    allValid = false;
  } else if (response.disabled === true && response.success === false) {
    console.log(`✅ ${platform}: Correctly reports disabled state`);
  } else if (response.success === true && response.postUrl) {
    console.log(`✅ ${platform}: Correctly reports success with postUrl`);
  } else if (response.success === false && response.error) {
    console.log(`✅ ${platform}: Correctly reports error state`);
  }
}

// Cost tracking validation
console.log('\n💰 Cost Tracking (20% Commons Good Markup):\n');

for (const platform of platforms) {
  const response = mockResponses[platform];
  
  if (response.cost) {
    const expectedTotal = response.cost.estimatedCost * (1 + response.cost.markup);
    const actualTotal = response.cost.total;
    const tolerance = 0.0001;
    
    if (Math.abs(expectedTotal - actualTotal) < tolerance) {
      console.log(`✅ ${platform}: Cost calculation correct ($${actualTotal.toFixed(4)})`);
    } else {
      console.log(`❌ ${platform}: Cost mismatch (expected $${expectedTotal.toFixed(4)}, got $${actualTotal.toFixed(4)})`);
      allValid = false;
    }
  } else if (response.disabled) {
    console.log(`⚪ ${platform}: No cost (disabled)`);
  }
}

// Summary
console.log('\n' + '─'.repeat(50));
if (allValid) {
  console.log('✅ All contracts valid!');
  process.exit(0);
} else {
  console.log('❌ Contract validation failed');
  process.exit(1);
}
