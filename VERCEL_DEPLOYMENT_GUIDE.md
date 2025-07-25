# Comprehensive Vercel Deployment Guide for VenueSync

## Problem Summary

The current deployment has a critical issue where:
1. The cron job at `/api/cron/fetch-data` returns only `{ ok: true }` without fetching any data
2. The proper TypeScript code exists in `packages/backend/api/cron/fetch-data.ts`
3. The JavaScript files in `/api` directory are outdated/incorrect
4. Toast credentials are in the database but never used because the cron job is empty

## Root Cause

Vercel is serving the old JavaScript files from the `/api` directory instead of the compiled TypeScript files from `packages/backend/api/`. The build process is only building the frontend, not the backend TypeScript code.

## Solution: Complete Deployment Process

### Step 1: Clean Up Old Files

First, back up and remove the old JavaScript API files:

```bash
# Create backup directory
mkdir -p api-backup

# Move all JS files to backup (keep the directory structure)
find api -name "*.js" -exec sh -c 'mkdir -p api-backup/$(dirname {}); mv {} api-backup/{}' \;

# Verify the api directory only has directories, no JS files
find api -name "*.js" | wc -l  # Should output 0
```

### Step 2: Update Build Configuration

Update `vercel.json` to properly build and serve TypeScript backend:

```json
{
  "buildCommand": "pnpm build:all",
  "outputDirectory": "packages/frontend/dist",
  "installCommand": "npm install -g pnpm && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --no-frozen-lockfile",
  "framework": null,
  "functions": {
    "packages/backend/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/packages/backend/api/:path*"
    },
    {
      "source": "/ai",
      "destination": "/index.html"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "crons": [
    {
      "path": "/api/cron/fetch-data",
      "schedule": "*/3 * * * *"
    }
  ]
}
```

### Step 3: Create Build Script

Add a new build script to root `package.json`:

```json
{
  "scripts": {
    "build:all": "pnpm build:shared && pnpm build:backend && pnpm build:frontend && pnpm postbuild",
    "postbuild": "node scripts/copy-api-files.js"
  }
}
```

### Step 4: Create API Files Copy Script

Create `scripts/copy-api-files.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Ensure api directory exists
const apiDir = path.join(__dirname, '..', 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Copy TypeScript files from packages/backend/api to root api directory
const sourceDir = path.join(__dirname, '..', 'packages', 'backend', 'api');
const targetDir = apiDir;

function copyRecursive(source, target) {
  if (!fs.existsSync(source)) {
    console.error(`Source directory ${source} does not exist`);
    return;
  }

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyRecursive(sourcePath, targetPath);
    } else if (file.endsWith('.ts')) {
      console.log(`Copying ${sourcePath} to ${targetPath}`);
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

console.log('Copying API files...');
copyRecursive(sourceDir, targetDir);
console.log('API files copied successfully');
```

### Step 5: Update Backend tsconfig.json

Update `packages/backend/tsconfig.json` to compile for Vercel:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "./dist",
    "composite": true,
    "declaration": true,
    "noEmit": false,
    "module": "commonjs",
    "moduleResolution": "node",
    "target": "ES2020",
    "lib": ["ES2020"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*", "api/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
  "references": [
    { "path": "../shared" }
  ]
}
```

### Step 6: Environment Variables

Set up all required environment variables in Vercel:

```bash
# Connect to Vercel project
npx vercel link

# Pull existing environment variables
npx vercel env pull .env.production

# Add each required variable
npx vercel env add SUPABASE_URL production
npx vercel env add SUPABASE_SERVICE_KEY production
npx vercel env add SUPABASE_ANON_KEY production
npx vercel env add ANTHROPIC_API_KEY production
npx vercel env add CRON_SECRET production
npx vercel env add TOAST_CLIENT_ID production
npx vercel env add TOAST_CLIENT_SECRET production
npx vercel env add TOAST_LOCATION_ID production
npx vercel env add EVENTBRITE_API_TOKEN production
npx vercel env add OPENDATE_CLIENT_ID production
npx vercel env add OPENDATE_CLIENT_SECRET production
```

### Step 7: Deploy Process

1. **Test build locally:**
   ```bash
   # Clean everything
   pnpm clean
   rm -rf api/*.js api/**/*.js
   
   # Install dependencies
   pnpm install
   
   # Build everything
   pnpm build:all
   
   # Verify API files were copied
   ls -la api/cron/
   # Should see fetch-data.ts
   ```

2. **Deploy to preview:**
   ```bash
   npx vercel
   ```

3. **Test the preview deployment:**
   ```bash
   # Get the preview URL from Vercel output
   PREVIEW_URL="https://your-preview-url.vercel.app"
   
   # Test the cron endpoint
   curl -X POST "$PREVIEW_URL/api/cron/fetch-data" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. **Deploy to production:**
   ```bash
   npx vercel --prod
   ```

### Step 8: Verify Deployment

1. **Check Vercel Functions tab:**
   - Go to your Vercel dashboard
   - Navigate to Functions tab
   - You should see `/api/cron/fetch-data` listed
   - Check the function logs

2. **Test the cron job manually:**
   ```bash
   # Production URL
   PROD_URL="https://your-app.vercel.app"
   
   # Test with proper auth
   curl -X POST "$PROD_URL/api/cron/fetch-data" \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json"
   ```

3. **Check Supabase for data:**
   - Look in `cron_logs` table for execution logs
   - Check `analytics_snapshots` table for fetched data
   - Verify `api_sync_status` is being updated

### Step 9: Alternative Approach (If Above Doesn't Work)

If Vercel still doesn't recognize TypeScript files, use a build step to compile to JavaScript:

1. **Update backend build script** in `packages/backend/package.json`:
   ```json
   {
     "scripts": {
       "build": "tsc && node scripts/prepare-vercel-functions.js"
     }
   }
   ```

2. **Create prepare script** at `packages/backend/scripts/prepare-vercel-functions.js`:
   ```javascript
   const fs = require('fs');
   const path = require('path');
   
   const distApiDir = path.join(__dirname, '..', 'dist', 'api');
   const rootApiDir = path.join(__dirname, '..', '..', '..', 'api');
   
   function copyCompiledFiles(source, target) {
     if (!fs.existsSync(source)) return;
     
     if (!fs.existsSync(target)) {
       fs.mkdirSync(target, { recursive: true });
     }
     
     const files = fs.readdirSync(source);
     
     files.forEach(file => {
       const sourcePath = path.join(source, file);
       const targetPath = path.join(target, file);
       
       if (fs.statSync(sourcePath).isDirectory()) {
         copyCompiledFiles(sourcePath, targetPath);
       } else if (file.endsWith('.js')) {
         console.log(`Copying compiled ${sourcePath} to ${targetPath}`);
         fs.copyFileSync(sourcePath, targetPath);
       }
     });
   }
   
   console.log('Preparing Vercel functions...');
   copyCompiledFiles(distApiDir, rootApiDir);
   console.log('Vercel functions prepared');
   ```

3. **Update vercel.json** to use JavaScript files:
   ```json
   {
     "functions": {
       "api/**/*.js": {
         "maxDuration": 30
       }
     }
   }
   ```

### Step 10: Troubleshooting

If the cron job still doesn't work:

1. **Check Function Logs:**
   ```bash
   npx vercel logs api/cron/fetch-data.js --follow
   ```

2. **Verify Environment Variables:**
   ```bash
   npx vercel env ls production
   ```

3. **Test Toast Connection:**
   Create `api/test-toast-connection.js`:
   ```javascript
   export default async function handler(req, res) {
     const vars = {
       TOAST_CLIENT_ID: !!process.env.TOAST_CLIENT_ID,
       TOAST_CLIENT_SECRET: !!process.env.TOAST_CLIENT_SECRET,
       TOAST_LOCATION_ID: !!process.env.TOAST_LOCATION_ID,
       SUPABASE_URL: !!process.env.SUPABASE_URL,
       SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
     };
     
     return res.json({
       envVarsPresent: vars,
       timestamp: new Date().toISOString()
     });
   }
   ```

4. **Check Vercel Build Output:**
   - In Vercel dashboard, go to Deployments
   - Click on a deployment
   - Check the build logs for any errors

### Success Criteria

Your deployment is successful when:

1. ✅ `/api/cron/fetch-data` returns detailed success/failure info, not just `{ ok: true }`
2. ✅ `cron_logs` table in Supabase shows execution records
3. ✅ `analytics_snapshots` table receives Toast POS data every 3 minutes
4. ✅ Function logs in Vercel show data fetching activity
5. ✅ The frontend dashboard displays real revenue data

### Common Issues and Solutions

1. **"Module not found" errors:**
   - Ensure all imports use correct paths
   - Check that `@venuesync/shared` is built before backend

2. **"Unauthorized" errors:**
   - Verify CRON_SECRET matches in Vercel env and cron configuration
   - Check Toast credentials are correct

3. **No data appearing:**
   - Verify venue has `is_active = true` in database
   - Check `api_credentials` table has valid Toast credentials
   - Look at `api_sync_status` for error messages

4. **Build failures:**
   - Run `pnpm typecheck` locally to catch TypeScript errors
   - Ensure all dependencies are in correct package.json files

## Next Steps After Successful Deployment

1. Monitor the cron job executions in Vercel Functions tab
2. Set up alerts for failed cron executions
3. Configure proper API rate limiting
4. Set up database backups in Supabase
5. Enable Vercel Analytics for performance monitoring