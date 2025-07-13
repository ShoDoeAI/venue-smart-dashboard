import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Transaction {
  transaction_id: string;
  created_at: string;
  total_amount: number;
  customer_name: string | null;
  status: string;
  location_id: string;
}

interface Snapshot {
  id: string;
  created_at: string;
  status: string;
  transaction_count: number | null;
  total_revenue: number | null;
  toast_fetched: boolean;
}

interface DailySummary {
  summary_date: string;
  total_revenue: number;
  transaction_count: number;
  average_transaction: number;
  unique_customers: number;
}

export default function DataViewer() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'snapshots' | 'summaries'>('transactions');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'transactions':
          await fetchTransactions();
          break;
        case 'snapshots':
          await fetchSnapshots();
          break;
        case 'summaries':
          await fetchDailySummaries();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('toast_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data);
    }
  };

  const fetchSnapshots = async () => {
    const { data, error } = await supabase
      .from('venue_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setSnapshots(data);
    }
  };

  const fetchDailySummaries = async () => {
    const { data, error } = await supabase
      .from('daily_summaries')
      .select('*')
      .order('summary_date', { ascending: false })
      .limit(30);

    if (!error && data) {
      setDailySummaries(data);
    }
  };

  const triggerFetch = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/test-toast');
      const result = await response.json();
      
      if (result.success) {
        alert(`Data fetch ${result.mode === 'mock' ? '(Mock Mode)' : ''} completed!\n\nStats:\n- Transactions: ${result.stats.transactionCount}\n- Revenue: $${result.stats.totalRevenue.toFixed(2)}`);
        // Refresh current view
        await fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to trigger fetch: ${error}`);
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">VenueSync Data Viewer</h1>
            <button
              onClick={triggerFetch}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? 'Fetching...' : 'Fetch Toast Data'}
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('snapshots')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'snapshots'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Snapshots
              </button>
              <button
                onClick={() => setActiveTab('summaries')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'summaries'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Daily Summaries
              </button>
            </nav>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading data...</p>
            </div>
          ) : (
            <>
              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                            No transactions found. Click "Fetch Toast Data" to load data.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((tx) => (
                          <tr key={tx.transaction_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {tx.transaction_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(tx.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(tx.total_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {tx.customer_name || 'Guest'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Snapshots Tab */}
              {activeTab === 'snapshots' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Snapshot ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          APIs
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {snapshots.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            No snapshots found.
                          </td>
                        </tr>
                      ) : (
                        snapshots.map((snapshot) => (
                          <tr key={snapshot.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {snapshot.id.slice(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(snapshot.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                snapshot.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : snapshot.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {snapshot.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {snapshot.transaction_count || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {snapshot.total_revenue ? formatCurrency(snapshot.total_revenue) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {snapshot.toast_fetched && '✓ Toast'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Daily Summaries Tab */}
              {activeTab === 'summaries' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dailySummaries.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      No daily summaries found.
                    </div>
                  ) : (
                    dailySummaries.map((summary) => (
                      <div key={summary.summary_date} className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {new Date(summary.summary_date).toLocaleDateString()}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-semibold">{formatCurrency(summary.total_revenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transactions:</span>
                            <span className="font-semibold">{summary.transaction_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Transaction:</span>
                            <span className="font-semibold">{formatCurrency(summary.average_transaction)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Unique Customers:</span>
                            <span className="font-semibold">{summary.unique_customers}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}