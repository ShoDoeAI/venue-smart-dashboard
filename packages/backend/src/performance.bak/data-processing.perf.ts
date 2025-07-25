import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';

// Performance utilities
class DataProcessingBenchmark {
  private startTime: number = 0;
  private startMemory: number = 0;

  start() {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  end(recordCount: number) {
    const duration = performance.now() - this.startTime;
    const memoryUsed = (process.memoryUsage().heapUsed - this.startMemory) / 1024 / 1024;
    
    return {
      duration,
      throughput: recordCount / (duration / 1000), // records per second
      memoryUsed,
      avgTimePerRecord: duration / recordCount,
    };
  }
}

// Mock data generators
const generateTransactions = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx-${i}`,
    amount: Math.random() * 1000,
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    type: ['sale', 'refund', 'void'][Math.floor(Math.random() * 3)],
    items: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, j) => ({
      id: `item-${j}`,
      name: `Product ${j}`,
      quantity: Math.floor(Math.random() * 5) + 1,
      price: Math.random() * 100,
    })),
  }));
};

const generateEvents = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `event-${i}`,
    name: `Event ${i}`,
    date: new Date(Date.now() + Math.random() * 30 * 86400000).toISOString(),
    capacity: Math.floor(Math.random() * 1000) + 100,
    ticketsSold: Math.floor(Math.random() * 800),
    revenue: Math.random() * 50000,
    categories: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => 
      ['Music', 'Sports', 'Theater', 'Comedy', 'Other'][j]
    ),
  }));
};

describe('Data Processing Performance Tests', () => {
  const benchmark = new DataProcessingBenchmark();

  describe('Transaction Processing Performance', () => {
    it('should process 1000 transactions efficiently', async () => {
      const transactions = generateTransactions(1000);
      
      benchmark.start();

      // Simulate transaction processing
      const processedTransactions = transactions.map(tx => {
        // Calculate totals
        const itemTotal = tx.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Apply business rules
        const tax = itemTotal * 0.08;
        const total = itemTotal + tax;
        
        // Transform data
        return {
          ...tx,
          itemTotal,
          tax,
          total,
          processed: true,
          processedAt: new Date().toISOString(),
        };
      });

      const metrics = benchmark.end(transactions.length);

      expect(processedTransactions).toHaveLength(1000);
      expect(metrics.duration).toBeLessThan(100); // Should process in under 100ms
      expect(metrics.throughput).toBeGreaterThan(10000); // At least 10k records/second
      
      console.log('Transaction processing metrics (1000 records):', {
        duration: `${metrics.duration.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(0)} records/sec`,
        avgTimePerRecord: `${metrics.avgTimePerRecord.toFixed(3)}ms`,
        memoryUsed: `${metrics.memoryUsed.toFixed(2)}MB`,
      });
    });

    it('should scale linearly with data size', async () => {
      const sizes = [100, 1000, 5000, 10000];
      const results: any[] = [];

      for (const size of sizes) {
        const transactions = generateTransactions(size);
        
        benchmark.start();

        // Process transactions
        const processed = transactions.map(tx => ({
          ...tx,
          total: tx.amount * 1.08,
          status: 'processed',
        }));

        const metrics = benchmark.end(size);
        results.push({ size, ...metrics });
      }

      // Check if processing scales linearly
      const scalingFactor = results[results.length - 1].avgTimePerRecord / results[0].avgTimePerRecord;
      
      expect(scalingFactor).toBeLessThan(2); // Should not degrade significantly
      
      console.log('Scaling analysis:');
      results.forEach(r => {
        console.log(`  ${r.size} records: ${r.duration.toFixed(2)}ms (${r.avgTimePerRecord.toFixed(3)}ms/record)`);
      });
    });
  });

  describe('KPI Calculation Performance', () => {
    it('should calculate KPIs for large datasets quickly', async () => {
      const transactions = generateTransactions(10000);
      
      benchmark.start();

      // Calculate various KPIs
      const kpis = {
        totalRevenue: transactions.reduce((sum, tx) => sum + tx.amount, 0),
        transactionCount: transactions.length,
        avgTransactionValue: 0,
        topSellingItems: new Map<string, number>(),
        revenueByType: new Map<string, number>(),
        hourlyRevenue: new Array(24).fill(0),
      };

      // Calculate average
      kpis.avgTransactionValue = kpis.totalRevenue / kpis.transactionCount;

      // Calculate top items
      transactions.forEach(tx => {
        tx.items.forEach(item => {
          const current = kpis.topSellingItems.get(item.name) || 0;
          kpis.topSellingItems.set(item.name, current + item.quantity);
        });

        // Revenue by type
        const typeRevenue = kpis.revenueByType.get(tx.type) || 0;
        kpis.revenueByType.set(tx.type, typeRevenue + tx.amount);

        // Hourly revenue
        const hour = new Date(tx.timestamp).getHours();
        kpis.hourlyRevenue[hour] += tx.amount;
      });

      // Sort top items
      const topItems = Array.from(kpis.topSellingItems.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const metrics = benchmark.end(transactions.length);

      expect(kpis.totalRevenue).toBeGreaterThan(0);
      expect(metrics.duration).toBeLessThan(200); // Should complete in under 200ms
      
      console.log('KPI calculation metrics (10k transactions):', {
        duration: `${metrics.duration.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(0)} records/sec`,
        memoryUsed: `${metrics.memoryUsed.toFixed(2)}MB`,
        kpisCalculated: Object.keys(kpis).length,
      });
    });
  });

  describe('Data Aggregation Performance', () => {
    it('should aggregate multi-source data efficiently', async () => {
      // Generate data from multiple sources
      const dataSources = {
        transactions: generateTransactions(5000),
        events: generateEvents(200),
        customers: Array.from({ length: 1000 }, (_, i) => ({
          id: `customer-${i}`,
          totalSpent: Math.random() * 10000,
          visitCount: Math.floor(Math.random() * 100),
        })),
      };

      benchmark.start();

      // Perform complex aggregation
      const aggregatedData = {
        summary: {
          totalRevenue: dataSources.transactions.reduce((sum, tx) => sum + tx.amount, 0),
          eventRevenue: dataSources.events.reduce((sum, event) => sum + event.revenue, 0),
          customerLifetimeValue: dataSources.customers.reduce((sum, c) => sum + c.totalSpent, 0),
        },
        insights: {
          avgTransactionValue: 0,
          avgEventRevenue: 0,
          avgCustomerValue: 0,
          topRevenueHour: 0,
          busiestEvent: null as any,
        },
      };

      // Calculate averages
      aggregatedData.insights.avgTransactionValue = 
        aggregatedData.summary.totalRevenue / dataSources.transactions.length;
      aggregatedData.insights.avgEventRevenue = 
        aggregatedData.summary.eventRevenue / dataSources.events.length;
      aggregatedData.insights.avgCustomerValue = 
        aggregatedData.summary.customerLifetimeValue / dataSources.customers.length;

      // Find busiest event
      aggregatedData.insights.busiestEvent = dataSources.events.reduce((busiest, event) => 
        event.ticketsSold > (busiest?.ticketsSold || 0) ? event : busiest
      );

      const metrics = benchmark.end(
        dataSources.transactions.length + 
        dataSources.events.length + 
        dataSources.customers.length
      );

      expect(aggregatedData.summary.totalRevenue).toBeGreaterThan(0);
      expect(metrics.duration).toBeLessThan(300);
      
      console.log('Multi-source aggregation metrics:', {
        duration: `${metrics.duration.toFixed(2)}ms`,
        totalRecords: dataSources.transactions.length + dataSources.events.length + dataSources.customers.length,
        throughput: `${metrics.throughput.toFixed(0)} records/sec`,
        memoryUsed: `${metrics.memoryUsed.toFixed(2)}MB`,
      });
    });
  });

  describe('Data Validation Performance', () => {
    const TransactionSchema = z.object({
      id: z.string(),
      amount: z.number().positive(),
      timestamp: z.string().datetime(),
      type: z.enum(['sale', 'refund', 'void']),
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })).min(1),
    });

    it('should validate data efficiently with Zod', async () => {
      const transactions = generateTransactions(1000);
      
      benchmark.start();

      let validCount = 0;
      let invalidCount = 0;

      // Validate each transaction
      transactions.forEach(tx => {
        try {
          TransactionSchema.parse(tx);
          validCount++;
        } catch (error) {
          invalidCount++;
        }
      });

      const metrics = benchmark.end(transactions.length);

      expect(validCount).toBe(1000); // All should be valid
      expect(metrics.duration).toBeLessThan(100); // Validation should be fast
      
      console.log('Data validation metrics (1000 records):', {
        duration: `${metrics.duration.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(0)} validations/sec`,
        avgTimePerValidation: `${metrics.avgTimePerRecord.toFixed(3)}ms`,
        validCount,
        invalidCount,
      });
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process data in batches efficiently', async () => {
      const totalRecords = 50000;
      const batchSize = 1000;
      const transactions = generateTransactions(totalRecords);
      
      benchmark.start();

      const results: any[] = [];
      
      // Process in batches
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        // Simulate batch processing
        const batchResult = {
          batchIndex: i / batchSize,
          processed: batch.length,
          totalAmount: batch.reduce((sum, tx) => sum + tx.amount, 0),
          avgAmount: 0,
        };
        
        batchResult.avgAmount = batchResult.totalAmount / batchResult.processed;
        results.push(batchResult);
        
        // Simulate async operation
        if (i % 10000 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      const metrics = benchmark.end(totalRecords);

      expect(results).toHaveLength(Math.ceil(totalRecords / batchSize));
      expect(metrics.throughput).toBeGreaterThan(50000); // Should process >50k records/sec
      
      console.log('Batch processing metrics (50k records):', {
        duration: `${metrics.duration.toFixed(2)}ms`,
        throughput: `${metrics.throughput.toFixed(0)} records/sec`,
        batchCount: results.length,
        avgTimePerBatch: `${(metrics.duration / results.length).toFixed(2)}ms`,
        memoryUsed: `${metrics.memoryUsed.toFixed(2)}MB`,
      });
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle concurrent data processing efficiently', async () => {
      const concurrentTasks = 10;
      const recordsPerTask = 1000;
      
      benchmark.start();

      // Create concurrent processing tasks
      const tasks = Array.from({ length: concurrentTasks }, async (_, taskIndex) => {
        const taskData = generateTransactions(recordsPerTask);
        
        // Simulate processing with some CPU-intensive work
        const processed = taskData.map(tx => {
          // Simulate complex calculation
          let hash = 0;
          for (const char of tx.id) {
            hash = ((hash << 5) - hash) + char.charCodeAt(0);
            hash = hash & hash;
          }
          
          return {
            ...tx,
            processed: true,
            hash,
            taskIndex,
          };
        });
        
        return {
          taskIndex,
          recordsProcessed: processed.length,
          success: true,
        };
      });

      const results = await Promise.all(tasks);
      const metrics = benchmark.end(concurrentTasks * recordsPerTask);

      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.recordsProcessed === recordsPerTask)).toBe(true);
      
      console.log('Concurrent processing metrics:', {
        duration: `${metrics.duration.toFixed(2)}ms`,
        totalRecords: concurrentTasks * recordsPerTask,
        throughput: `${metrics.throughput.toFixed(0)} records/sec`,
        concurrentTasks,
        parallelEfficiency: `${((recordsPerTask / metrics.avgTimePerRecord) / concurrentTasks * 100).toFixed(1)}%`,
        memoryUsed: `${metrics.memoryUsed.toFixed(2)}MB`,
      });
    });
  });
});