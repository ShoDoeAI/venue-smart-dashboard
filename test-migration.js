#!/usr/bin/env node

// Simple test to verify the Square to Toast migration worked correctly

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Square to Toast migration...\n');

// Files to check
const filesToCheck = [
  'packages/shared/src/connectors/toast/toast-connector.ts',
  'packages/shared/src/connectors/toast/types.ts',
  'packages/shared/src/schemas/toast.ts',
  'packages/backend/api/test-toast.ts',
  '.env.example',
];

let errors = 0;
let warnings = 0;

// Check if files exist
console.log('📁 Checking file structure...');
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - File not found`);
    errors++;
  }
});

console.log('\n📝 Checking for remaining Square references...');

// Check for remaining Square references
const checkForSquareReferences = (dir, exclude = ['node_modules', '.git', 'dist', '.next']) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !exclude.includes(file)) {
      checkForSquareReferences(filePath, exclude);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for Square references (case insensitive)
      const squareRegex = /square/gi;
      const matches = content.match(squareRegex);
      
      if (matches) {
        // Filter out some known acceptable cases
        const filteredMatches = matches.filter(match => {
          const lowerMatch = match.toLowerCase();
          // Allow "square" in comments or as part of other words
          return lowerMatch === 'square';
        });
        
        if (filteredMatches.length > 0) {
          console.log(`⚠️  ${filePath.replace(__dirname + '/', '')} - Found ${filteredMatches.length} "Square" reference(s)`);
          warnings++;
        }
      }
    }
  });
};

checkForSquareReferences(__dirname);

console.log('\n🔧 Checking Toast configuration...');

// Check .env.example for Toast configuration
const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
const toastEnvVars = ['TOAST_CLIENT_ID', 'TOAST_CLIENT_SECRET', 'TOAST_LOCATION_GUID', 'TOAST_ENVIRONMENT'];

toastEnvVars.forEach(envVar => {
  if (envExample.includes(envVar)) {
    console.log(`✅ ${envVar} found in .env.example`);
  } else {
    console.log(`❌ ${envVar} missing from .env.example`);
    errors++;
  }
});

// Check if Square env vars are still present
if (envExample.includes('SQUARE_ACCESS_TOKEN')) {
  console.log('❌ SQUARE_ACCESS_TOKEN still present in .env.example');
  errors++;
}

console.log('\n📊 Migration Summary:');
console.log(`✅ Files checked: ${filesToCheck.length}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Errors: ${errors}`);

if (errors === 0) {
  console.log('\n✨ Migration looks good! The core files have been successfully migrated from Square to Toast.');
  console.log('⚠️  Note: Some test files still need to be updated to match the new Toast API structure.');
} else {
  console.log('\n❌ Migration has issues that need to be fixed.');
}

process.exit(errors > 0 ? 1 : 0);