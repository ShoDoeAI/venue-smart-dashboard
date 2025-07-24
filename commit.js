const { execSync } = require('child_process');

const commitMessage = `feat: implement Meta Business Suite and OpenTable connectors

- Meta Business Suite connector with Facebook Graph API integration
  - Page insights, post performance, and audience demographics
  - Ad metrics and engagement tracking
  - Video and stories insights support
  - Comprehensive test coverage (13 tests)
  - Test script for API verification

- OpenTable connector (placeholder implementation)
  - Reservation management and guest profiles
  - Review aggregation with ratings
  - Restaurant analytics and waitlist tracking
  - Availability management and special events
  - Full test suite (19 tests) with mock data

- Updated connector exports and schemas
- Task list updated: 6 of 7 APIs integrated (119 total tests)

Note: OpenTable requires partnership API access, Meta requires app review

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

try {
  const result = execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, { 
    cwd: '/Users/sho/Code/venue-smart-dashboard',
    stdio: 'inherit'
  });
  console.log('Commit created successfully!');
} catch (error) {
  console.error('Error creating commit:', error.message);
}