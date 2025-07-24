const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Vercel deployment configuration...\n');

// Check vercel.json
try {
  const vercelConfig = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));
  console.log('✅ vercel.json found');
  console.log('   - Build command:', vercelConfig.buildCommand);
  console.log('   - Output directory:', vercelConfig.outputDirectory);
  console.log('   - Functions config:', JSON.stringify(vercelConfig.functions, null, 2));
} catch (error) {
  console.log('❌ Error reading vercel.json:', error.message);
}

console.log('\n📁 Checking API directory...');
// Check API directory
const apiDir = './api';
if (fs.existsSync(apiDir)) {
  const files = fs.readdirSync(apiDir);
  console.log(`✅ Found ${files.length} files in /api directory:`);
  files.forEach(file => {
    const stat = fs.statSync(path.join(apiDir, file));
    if (stat.isFile() && file.endsWith('.js')) {
      console.log(`   - ${file} (${stat.size} bytes)`);
    }
  });
} else {
  console.log('❌ /api directory not found!');
}

console.log('\n📦 Checking package structure...');
// Check if this is a monorepo
if (fs.existsSync('./packages')) {
  console.log('✅ Monorepo structure detected');
  if (fs.existsSync('./packages/backend/api')) {
    console.log('   ⚠️  Found /packages/backend/api - this might cause confusion');
  }
}

console.log('\n🔧 Recommendations:');
console.log('1. The API files in /api/*.js should be deployed automatically by Vercel');
console.log('2. Make sure you have committed all changes: git add . && git commit -m "Add API endpoints"');
console.log('3. Deploy with: vercel --prod');
console.log('4. If still failing, try: vercel --prod --force');