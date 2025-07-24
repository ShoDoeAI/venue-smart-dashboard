#!/bin/bash
curl -X POST https://ws-api.toasttab.com/authentication/v1/authentication/login \
  -H "Content-Type: application/json" \
  -d '{"clientId":"mT5Nsj9fT2XhQ9p0OvaONnqpt1IPkrh7","clientSecret":"-PvyQasB-AopTOeL1ogLmQ5s5ZH1AbvwKdv2Shbe0NghzbmPvWyQ5O56akh6VNn4","userAccessType":"TOAST_MACHINE_CLIENT"}' \
  | grep -o '"accessToken":"[^"]*"' || echo "Authentication failed"