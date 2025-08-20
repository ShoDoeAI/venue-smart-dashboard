/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SyncStatus {
  totalMonths: number;
  completedMonths: number;
  currentMonth: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  estimatedCompletion: string;
  results: Record<string, any>;
}

export function ComprehensiveSyncButton() {
  const [isStarting, setIsStarting] = useState(false);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for status updates
  useEffect(() => {
    if (!syncId || syncStatus?.status === 'completed') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sync-toast-comprehensive?syncId=${syncId}`);
        if (response.ok) {
          const status = await response.json();
          setSyncStatus(status);
        }
      } catch (err) {
        console.error('Failed to fetch sync status:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [syncId, syncStatus?.status]);

  const startSync = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('/api/sync-toast-comprehensive', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      const data = await response.json();
      setSyncId(data.syncId);
      
      // Initial status
      setSyncStatus({
        totalMonths: data.totalMonths,
        completedMonths: 0,
        currentMonth: '',
        status: 'running',
        startTime: new Date().toISOString(),
        estimatedCompletion: '',
        results: {},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsStarting(false);
    }
  };

  const getProgressPercentage = () => {
    if (!syncStatus) return 0;
    return Math.round((syncStatus.completedMonths / syncStatus.totalMonths) * 100);
  };

  const getTimeRemaining = () => {
    if (!syncStatus?.estimatedCompletion) return '';
    const remaining = new Date(syncStatus.estimatedCompletion).getTime() - Date.now();
    if (remaining <= 0) return 'Almost done...';
    const minutes = Math.ceil(remaining / 60000);
    return `~${minutes} minutes remaining`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl">
      <h3 className="text-xl font-bold mb-4">24-Month Data Sync</h3>
      
      {!syncId && !syncStatus && (
        <div>
          <p className="text-gray-600 mb-4">
            This will sync 24 months of historical Toast data (Sep 2023 - Aug 2025).
            The process may take 2-4 hours depending on data volume.
          </p>
          
          <button
            onClick={startSync}
            disabled={isStarting}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isStarting ? 'animate-spin' : ''}`} />
            {isStarting ? 'Starting Sync...' : 'Start 24-Month Sync'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {syncStatus && (
        <div className="space-y-4">
          {syncStatus.status === 'running' && (
            <>
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-medium">
                  Syncing {syncStatus.currentMonth || 'Starting...'}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {syncStatus.completedMonths} of {syncStatus.totalMonths} months
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {getTimeRemaining()}
                </span>
              </div>
            </>
          )}

          {syncStatus.status === 'completed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Sync Completed!</span>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Summary:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Synced {syncStatus.completedMonths} months</li>
                  <li>• Duration: {
                    Math.round((Date.now() - new Date(syncStatus.startTime).getTime()) / 60000)
                  } minutes</li>
                </ul>
              </div>

              {Object.keys(syncStatus.results).length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    View detailed results
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(syncStatus.results, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}