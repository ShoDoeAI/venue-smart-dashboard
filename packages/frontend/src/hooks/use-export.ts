import { useCallback } from 'react';

interface ExportOptions {
  filename?: string;
  format?: 'csv' | 'json' | 'xlsx';
}

export function useExport() {
  const exportToCSV = useCallback((data: any[], options: ExportOptions = {}) => {
    const { filename = 'export' } = options;
    
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const exportToJSON = useCallback((data: any, options: ExportOptions = {}) => {
    const { filename = 'export' } = options;
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const exportChart = useCallback((chartElement: HTMLElement, options: ExportOptions = {}) => {
    const { filename = 'chart' } = options;
    
    // Use html2canvas if available
    if (typeof window !== 'undefined' && (window as any).html2canvas) {
      (window as any).html2canvas(chartElement).then((canvas: HTMLCanvasElement) => {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    } else {
      console.warn('html2canvas not available for chart export');
    }
  }, []);

  return {
    exportToCSV,
    exportToJSON,
    exportChart,
  };
}