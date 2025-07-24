import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';
import { Calendar, RefreshCw, Database, AlertCircle } from 'lucide-react';

export default function ToastDataViewer() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Fetch Toast transactions
  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['toastTransactions', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('toast_transactions')
        .select('*')
        .gte('transaction_date', selectedDate)
        .lt('transaction_date', new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000).toISOString())
        .order('transaction_date', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch daily summary
  const { data: dailySummary } = useQuery({
    queryKey: ['dailySummary', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('summary_date', selectedDate)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Manual fetch mutation
  const fetchMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/manual-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c',
          startDate: dateRange.start,
          endDate: dateRange.end,
          apis: ['toast'],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch data');
      }

      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Calculate metrics
  const totalRevenue = transactions?.reduce((sum, tx) => sum + (tx.total_amount || 0), 0) || 0;
  const avgTransaction = transactions?.length ? totalRevenue / transactions.length : 0;
  const uniqueCustomers = new Set(transactions?.map(tx => tx.customer_id).filter(Boolean)).size;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Toast Data Viewer</h1>
        <p className="text-gray-600 mt-1">View and debug real Toast POS data</p>
      </div>

      {/* Manual Fetch Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fetch Historical Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => fetchMutation.mutate()}
              disabled={fetchMutation.isPending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {fetchMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Fetch Toast Data
                </>
              )}
            </button>
          </div>
        </div>
        {fetchMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              {fetchMutation.error?.message || 'Failed to fetch data'}
            </div>
          </div>
        )}
        {fetchMutation.isSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              Successfully fetched {fetchMutation.data?.result?.results?.toast?.recordCount || 0} transactions
            </p>
          </div>
        )}
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">View Date</h2>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue / 100)}</p>
            {dailySummary && (
              <p className="text-xs text-gray-500 mt-1">
                Summary: {formatCurrency(dailySummary.total_revenue / 100)}
              </p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{transactions?.length || 0}</p>
            {dailySummary && (
              <p className="text-xs text-gray-500 mt-1">
                Summary: {dailySummary.transaction_count}
              </p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Avg Transaction</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgTransaction / 100)}</p>
            {dailySummary && (
              <p className="text-xs text-gray-500 mt-1">
                Summary: {formatCurrency(dailySummary.average_transaction / 100)}
              </p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Unique Customers</p>
            <p className="text-2xl font-bold text-gray-900">{uniqueCustomers}</p>
            {dailySummary && (
              <p className="text-xs text-gray-500 mt-1">
                Summary: {dailySummary.unique_customers}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Toast Transactions</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading transactions...</p>
          </div>
        ) : transactions?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No transactions found for {selectedDate}</p>
            <p className="text-sm mt-1">Try fetching data using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Transaction ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Items</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Payment</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {new Date(tx.transaction_date).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {tx.transaction_id?.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4">
                      {tx.customer_name || tx.customer_email || 'Guest'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(tx.total_amount / 100)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {tx.item_count || 0}
                    </td>
                    <td className="py-3 px-4">
                      {tx.payment_details?.type || tx.source_type || 'Unknown'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        tx.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tx.status || 'COMPLETED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}