#!/usr/bin/env python3
import subprocess
import os

os.chdir('/Users/sho/Code/venue-smart-dashboard')

commit_message = """feat: implement Meta Business Suite and OpenTable connectors

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

Co-Authored-By: Claude <noreply@anthropic.com>"""

try:
    result = subprocess.run(['git', 'commit', '-m', commit_message], 
                          capture_output=True, text=True, check=True)
    print("Commit created successfully!")
    print(result.stdout)
except subprocess.CalledProcessError as e:
    print(f"Error creating commit: {e}")
    print(f"stderr: {e.stderr}")