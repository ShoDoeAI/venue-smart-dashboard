import json
import subprocess
from datetime import datetime

# Fetch data
result = subprocess.run(['curl', '-s', 'https://venue-smart-dashboard.vercel.app/api/dashboard'], 
                       capture_output=True, text=True)
data = json.loads(result.stdout)

toast = data['snapshot']['api_data']['toast']['data']

print('TOAST DATA VERIFICATION')
print('='*50)
print(f'Data Date: {toast.get("dataDate")}')

# Parse the date to show day of week
date_str = toast.get('dataDate', '')
if date_str:
    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    day_name = date_obj.strftime('%A, %B %d, %Y')
    print(f'Full Date: {day_name}')

print(f'\nTOTALS FROM TOAST:')
print(f'Revenue: ${toast["todayRevenue"]:,}')
print(f'Transactions: {toast["todayTransactions"]}')
if toast["todayTransactions"] > 0:
    print(f'Average per transaction: ${toast["todayRevenue"] / toast["todayTransactions"]:.2f}')

print(f'\nHOURLY BREAKDOWN:')
print('Hour      Revenue     Trans')
print('-'*30)
hourly = data['hourlyData']
daily_total = 0
for h in hourly:
    if h['revenue'] > 0:
        print(f'{h["hour"]:>6} ${h["revenue"]:>8.2f}    {h["transactions"]:>3}')
        daily_total += h['revenue']

print('-'*30)
print(f'Total: ${daily_total:>8.2f}')