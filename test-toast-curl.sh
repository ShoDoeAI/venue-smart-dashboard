#!/bin/bash

echo "Testing Toast API with curl..."
echo ""

# Your credentials
CLIENT_ID="mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7"
CLIENT_SECRET="-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4"

# Test authentication
echo "Testing authentication endpoint..."
curl -X POST https://ws-api.toasttab.com/authentication/v1/authentication/login \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"clientSecret\": \"$CLIENT_SECRET\",
    \"userAccessType\": \"TOAST_MACHINE_CLIENT\"
  }" \
  -w "\nHTTP Status: %{http_code}\n" \
  -o toast-auth-response.json

echo ""
echo "Response saved to toast-auth-response.json"
echo ""

# Check if successful
if [ -f toast-auth-response.json ]; then
  echo "Response content:"
  cat toast-auth-response.json | python -m json.tool 2>/dev/null || cat toast-auth-response.json
fi