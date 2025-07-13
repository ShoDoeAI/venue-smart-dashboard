#!/bin/bash

# Script to rename all Square references to Toast

echo "Starting Square to Toast migration..."

# Function to replace in files
replace_in_files() {
    local search="$1"
    local replace="$2"
    local path="${3:-/Users/sho/Code/venue-smart-dashboard}"
    
    find "$path" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.sql" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/dist/*" \
        -exec sed -i '' "s/${search}/${replace}/g" {} \;
}

# Replace class names and types
replace_in_files "SquareConnector" "ToastConnector"
replace_in_files "SquareLocation" "ToastLocation"
replace_in_files "SquarePayment" "ToastPayment"
replace_in_files "SquareOrder" "ToastOrder"
replace_in_files "SquareLineItem" "ToastLineItem"
replace_in_files "SquareCustomer" "ToastCustomer"
replace_in_files "SquareTeamMember" "ToastTeamMember"
replace_in_files "SquareListPaymentsResponse" "ToastListPaymentsResponse"
replace_in_files "SquareListOrdersResponse" "ToastListOrdersResponse"
replace_in_files "SquareListCustomersResponse" "ToastListCustomersResponse"
replace_in_files "SquareSearchTeamMembersResponse" "ToastSearchTeamMembersResponse"
replace_in_files "SquareError" "ToastError"
replace_in_files "TransformedSquareTransaction" "TransformedToastTransaction"
replace_in_files "SquareConnectorConfig" "ToastConnectorConfig"

# Replace schema names
replace_in_files "SquareMoneySchema" "ToastMoneySchema"
replace_in_files "SquareAddressSchema" "ToastAddressSchema"
replace_in_files "SquarePaymentSchema" "ToastPaymentSchema"
replace_in_files "SquareLineItemSchema" "ToastLineItemSchema"
replace_in_files "SquareOrderSchema" "ToastOrderSchema"
replace_in_files "SquareCustomerSchema" "ToastCustomerSchema"
replace_in_files "SquareTeamMemberSchema" "ToastTeamMemberSchema"
replace_in_files "SquareLocationSchema" "ToastLocationSchema"
replace_in_files "SquareCatalogItemSchema" "ToastCatalogItemSchema"
replace_in_files "SquarePaymentListResponseSchema" "ToastPaymentListResponseSchema"
replace_in_files "SquareOrderSearchResponseSchema" "ToastOrderSearchResponseSchema"
replace_in_files "SquareCustomerListResponseSchema" "ToastCustomerListResponseSchema"
replace_in_files "SquareTeamMemberSearchResponseSchema" "ToastTeamMemberSearchResponseSchema"
replace_in_files "SquareLocationListResponseSchema" "ToastLocationListResponseSchema"
replace_in_files "SquarePaymentUpdateSchema" "ToastPaymentUpdateSchema"
replace_in_files "SquareOrderUpdateSchema" "ToastOrderUpdateSchema"
replace_in_files "SquareCustomerUpdateSchema" "ToastCustomerUpdateSchema"
replace_in_files "SquareTeamMemberUpdateSchema" "ToastTeamMemberUpdateSchema"

# Replace variable names
replace_in_files "squareConfig" "toastConfig"
replace_in_files "square_transactions" "toast_transactions"
replace_in_files "square_fetched" "toast_fetched"
replace_in_files "fetchSquareData" "fetchToastData"

# Replace string literals
replace_in_files "'square'" "'toast'"
replace_in_files '"square"' '"toast"'
replace_in_files "Square API" "Toast API"
replace_in_files "Square POS" "Toast POS"
replace_in_files "Square connector" "Toast connector"
replace_in_files "Square credentials" "Toast credentials"
replace_in_files "Square account" "Toast account"
replace_in_files "Square locations" "Toast locations"
replace_in_files "Square transactions" "Toast transactions"
replace_in_files "Square data" "Toast data"
replace_in_files "Fetch Square Data" "Fetch Toast Data"

# Replace environment variables
replace_in_files "SQUARE_ACCESS_TOKEN" "TOAST_ACCESS_TOKEN"
replace_in_files "SQUARE_ENVIRONMENT" "TOAST_ENVIRONMENT"

# Replace file references
replace_in_files "\/square\/" "/toast/"
replace_in_files "\.\/square" "./toast"
replace_in_files "from '\.\.\/square" "from '../toast"
replace_in_files "test-square" "test-toast"
replace_in_files "fetch-square" "fetch-toast"

# Update constants
replace_in_files "SQUARE:" "TOAST:"

# Update URLs (we'll need to update these to actual Toast endpoints later)
replace_in_files "connect.squareupsandbox.com" "api.toasttab.com/sandbox"
replace_in_files "connect.squareup.com" "api.toasttab.com"
replace_in_files "Square-Version" "Toast-Restaurant-External-ID"

echo "Migration complete! Files have been updated."
echo ""
echo "Note: You'll need to:"
echo "1. Update the actual API endpoints to match Toast's API"
echo "2. Update authentication to use Toast's OAuth2 flow"
echo "3. Update data structures to match Toast's response formats"
echo "4. Rename any remaining files with 'square' in the name"