#!/bin/bash

echo "🚀 VenueSync Deployment Script"
echo "=============================="

# Check if vercel is available
if ! command -v vercel &> /dev/null && ! npx vercel --version &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Function to prompt for environment variables
setup_env_vars() {
    echo ""
    echo "📋 Setting up environment variables..."
    echo "Please have the following ready:"
    echo "- Supabase project URL and keys"
    echo "- Toast POS credentials"
    echo "- Eventbrite API token"
    echo "- OpenDate.io OAuth credentials"
    echo "- Anthropic API key"
    echo ""
    echo "You'll need to add these in the Vercel dashboard after deployment."
}

# Main deployment flow
main() {
    echo ""
    echo "1️⃣  First, login to Vercel:"
    echo "   Run: npx vercel login"
    echo ""
    echo "2️⃣  Link this project to Vercel:"
    echo "   Run: npx vercel link"
    echo "   - Choose 'Link to existing project' if you have one"
    echo "   - Or create a new project"
    echo ""
    echo "3️⃣  Deploy to preview:"
    echo "   Run: npx vercel"
    echo "   This will create a preview deployment"
    echo ""
    echo "4️⃣  Set environment variables:"
    echo "   Run: npx vercel env pull"
    echo "   Then add each variable:"
    echo "   - npx vercel env add SUPABASE_URL"
    echo "   - npx vercel env add SUPABASE_SERVICE_KEY"
    echo "   - (repeat for all variables in .env.production.example)"
    echo ""
    echo "5️⃣  Deploy to production:"
    echo "   Run: npx vercel --prod"
    echo ""
    echo "6️⃣  Verify deployment:"
    echo "   - Check your production URL"
    echo "   - Test API endpoints"
    echo "   - Monitor cron jobs in Vercel dashboard"
    
    setup_env_vars
}

# Run main function
main

echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo "❓ Need help? Check TROUBLESHOOTING.md or open a GitHub issue"