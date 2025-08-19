/* eslint-disable */
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface SyncResult {
  success?: boolean;
  error?: string;
  summary?: {
    monthsProcessed: number;
    totalRevenueSynced: number;
    newRecords: number;
    updatedRecords: number;
    errors: number;
  };
  results?: Array<{
    month: string;
    ordersFound: number;
    daysWithRevenue: number;
    totalRevenue: number;
    newRecords: number;
    updatedRecords: number;
  }>;
  errors?: Array<{
    month: string;
    error: string;
  }>;
}

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch('/api/sync-missing-months', {
        method: 'GET',
      });

      const data = (await response.json()) as SyncResult;
      setResult(data);

      if (data.success) {
        console.log('Sync completed:', data);
      } else {
        console.error('Sync failed:', data);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync Missing Months'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
