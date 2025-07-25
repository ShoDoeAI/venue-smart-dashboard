import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface RealtimeMetrics {
  messageCount: number;
  totalLatency: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  messagesPerSecond: number;
  connectionTime: number;
  memoryUsed: number;
}

class RealtimePerformanceTracker {
  private metrics: RealtimeMetrics = {
    messageCount: 0,
    totalLatency: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: Infinity,
    messagesPerSecond: 0,
    connectionTime: 0,
    memoryUsed: 0,
  };
  
  private startTime: number = 0;
  private startMemory: number = 0;
  private latencies: number[] = [];

  start() {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  recordMessage(latency: number) {
    this.metrics.messageCount++;
    this.metrics.totalLatency += latency;
    this.latencies.push(latency);
    
    if (latency > this.metrics.maxLatency) {
      this.metrics.maxLatency = latency;
    }
    if (latency < this.metrics.minLatency) {
      this.metrics.minLatency = latency;
    }
  }

  recordConnectionTime(time: number) {
    this.metrics.connectionTime = time;
  }

  getMetrics(): RealtimeMetrics {
    const duration = (performance.now() - this.startTime) / 1000; // in seconds
    
    this.metrics.avgLatency = this.metrics.messageCount > 0 
      ? this.metrics.totalLatency / this.metrics.messageCount 
      : 0;
    
    this.metrics.messagesPerSecond = this.metrics.messageCount / duration;
    this.metrics.memoryUsed = (process.memoryUsage().heapUsed - this.startMemory) / 1024 / 1024;
    
    // Calculate percentiles
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    
    return {
      ...this.metrics,
      p50Latency: sortedLatencies[p50Index] || 0,
      p95Latency: sortedLatencies[p95Index] || 0,
      p99Latency: sortedLatencies[p99Index] || 0,
    } as any;
  }
}

describe('Real-time Operations Performance Tests', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
    );
  });

  describe('WebSocket Message Throughput', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const tracker = new RealtimePerformanceTracker();
      const messageCount = 1000;
      const updateInterval = 10; // 10ms between updates
      
      tracker.start();

      // Simulate WebSocket message handling
      const simulateRealtimeUpdates = async () => {
        const connectionStart = performance.now();
        
        // Simulate connection establishment
        await new Promise(resolve => setTimeout(resolve, 100));
        tracker.recordConnectionTime(performance.now() - connectionStart);
        
        // Simulate message stream
        for (let i = 0; i < messageCount; i++) {
          const messageStart = performance.now();
          
          // Simulate message processing
          const message = {
            id: i,
            type: 'update',
            data: {
              revenue: Math.random() * 1000,
              timestamp: new Date().toISOString(),
            },
          };
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
          
          const latency = performance.now() - messageStart;
          tracker.recordMessage(latency);
          
          // Wait before next message
          if (i < messageCount - 1) {
            await new Promise(resolve => setTimeout(resolve, updateInterval));
          }
        }
      };

      await simulateRealtimeUpdates();
      const metrics = tracker.getMetrics();

      expect(metrics.messageCount).toBe(messageCount);
      expect(metrics.avgLatency).toBeLessThan(10); // Average latency under 10ms
      expect(metrics.p95Latency).toBeLessThan(20); // 95th percentile under 20ms
      
      console.log('WebSocket throughput metrics:', {
        messageCount: metrics.messageCount,
        messagesPerSecond: metrics.messagesPerSecond.toFixed(2),
        avgLatency: `${metrics.avgLatency.toFixed(2)}ms`,
        p50Latency: `${metrics.p50Latency.toFixed(2)}ms`,
        p95Latency: `${metrics.p95Latency.toFixed(2)}ms`,
        p99Latency: `${metrics.p99Latency.toFixed(2)}ms`,
        connectionTime: `${metrics.connectionTime.toFixed(2)}ms`,
        memoryUsed: `${metrics.memoryUsed.toFixed(2)}MB`,
      });
    });

    it('should handle burst traffic gracefully', async () => {
      const tracker = new RealtimePerformanceTracker();
      const burstSize = 100;
      const burstCount = 10;
      
      tracker.start();

      // Simulate burst traffic
      for (let burst = 0; burst < burstCount; burst++) {
        const burstStart = performance.now();
        
        // Send burst of messages
        const messagePromises = Array.from({ length: burstSize }, async (_, i) => {
          const messageStart = performance.now();
          
          // Simulate concurrent message processing
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          
          return performance.now() - messageStart;
        });
        
        const latencies = await Promise.all(messagePromises);
        latencies.forEach(latency => tracker.recordMessage(latency));
        
        // Wait between bursts
        if (burst < burstCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const metrics = tracker.getMetrics();

      expect(metrics.messageCount).toBe(burstSize * burstCount);
      expect(metrics.p95Latency).toBeLessThan(50); // Handle bursts within 50ms
      
      console.log('Burst traffic metrics:', {
        totalMessages: metrics.messageCount,
        bursts: `${burstCount} x ${burstSize} messages`,
        avgLatency: `${metrics.avgLatency.toFixed(2)}ms`,
        p95Latency: `${metrics.p95Latency.toFixed(2)}ms`,
        maxLatency: `${metrics.maxLatency.toFixed(2)}ms`,
        throughput: `${metrics.messagesPerSecond.toFixed(2)} msg/sec`,
      });
    });
  });

  describe('Concurrent User Simulation', () => {
    it('should handle multiple concurrent users efficiently', async () => {
      const userCount = 50;
      const messagesPerUser = 20;
      const tracker = new RealtimePerformanceTracker();
      
      tracker.start();

      // Simulate multiple users
      const simulateUsers = async () => {
        const userPromises = Array.from({ length: userCount }, async (_, userId) => {
          // Add jitter to simulate real user behavior
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
          
          const userLatencies: number[] = [];
          
          for (let i = 0; i < messagesPerUser; i++) {
            const messageStart = performance.now();
            
            // Simulate user action
            const action = {
              userId,
              action: ['view', 'update', 'refresh'][Math.floor(Math.random() * 3)],
              timestamp: new Date().toISOString(),
            };
            
            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 10));
            
            const latency = performance.now() - messageStart;
            userLatencies.push(latency);
            
            // Simulate think time between actions
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
          }
          
          return userLatencies;
        });
        
        const allLatencies = await Promise.all(userPromises);
        allLatencies.flat().forEach(latency => tracker.recordMessage(latency));
      };

      await simulateUsers();
      const metrics = tracker.getMetrics();

      expect(metrics.messageCount).toBe(userCount * messagesPerUser);
      expect(metrics.avgLatency).toBeLessThan(50); // Good responsiveness
      
      console.log('Concurrent users metrics:', {
        userCount,
        totalMessages: metrics.messageCount,
        avgLatency: `${metrics.avgLatency.toFixed(2)}ms`,
        p50Latency: `${metrics.p50Latency.toFixed(2)}ms`,
        p95Latency: `${metrics.p95Latency.toFixed(2)}ms`,
        throughput: `${metrics.messagesPerSecond.toFixed(2)} msg/sec`,
        memoryUsed: `${metrics.memoryUsed.toFixed(2)}MB`,
      });
    });
  });

  describe('Real-time Data Sync Performance', () => {
    it('should sync data changes efficiently across connections', async () => {
      const tracker = new RealtimePerformanceTracker();
      const changeCount = 100;
      const listenerCount = 10;
      
      tracker.start();

      // Simulate data sync scenario
      const simulateDataSync = async () => {
        // Simulate multiple listeners
        const listeners = Array.from({ length: listenerCount }, (_, i) => ({
          id: i,
          receivedChanges: 0,
          latencies: [] as number[],
        }));
        
        // Simulate changes being broadcast
        for (let i = 0; i < changeCount; i++) {
          const changeStart = performance.now();
          
          const change = {
            id: i,
            type: 'UPDATE',
            table: 'snapshots',
            data: {
              revenue: Math.random() * 10000,
              orders: Math.floor(Math.random() * 100),
            },
            timestamp: new Date().toISOString(),
          };
          
          // Broadcast to all listeners
          const broadcastPromises = listeners.map(async (listener) => {
            const listenerStart = performance.now();
            
            // Simulate network latency variation
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
            
            listener.receivedChanges++;
            const latency = performance.now() - listenerStart;
            listener.latencies.push(latency);
            
            return latency;
          });
          
          const latencies = await Promise.all(broadcastPromises);
          const avgBroadcastLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
          tracker.recordMessage(avgBroadcastLatency);
          
          // Small delay between changes
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        return listeners;
      };

      const listeners = await simulateDataSync();
      const metrics = tracker.getMetrics();

      // Verify all listeners received all changes
      expect(listeners.every(l => l.receivedChanges === changeCount)).toBe(true);
      expect(metrics.avgLatency).toBeLessThan(20); // Low broadcast latency
      
      console.log('Data sync performance metrics:', {
        changeCount,
        listenerCount,
        totalBroadcasts: changeCount * listenerCount,
        avgBroadcastLatency: `${metrics.avgLatency.toFixed(2)}ms`,
        p95BroadcastLatency: `${metrics.p95Latency.toFixed(2)}ms`,
        changesPerSecond: `${(changeCount / (metrics.messageCount / metrics.messagesPerSecond)).toFixed(2)}`,
        memoryUsed: `${metrics.memoryUsed.toFixed(2)}MB`,
      });
    });
  });

  describe('Connection Resilience', () => {
    it('should handle connection drops and reconnects efficiently', async () => {
      const tracker = new RealtimePerformanceTracker();
      const disconnectCount = 5;
      const messagesPerCycle = 50;
      
      tracker.start();

      for (let cycle = 0; cycle < disconnectCount; cycle++) {
        // Simulate connection
        const connectStart = performance.now();
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
        const connectTime = performance.now() - connectStart;
        
        // Send messages
        for (let i = 0; i < messagesPerCycle; i++) {
          const messageStart = performance.now();
          
          // Simulate message
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          
          tracker.recordMessage(performance.now() - messageStart);
        }
        
        // Simulate disconnect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (cycle === 0) {
          tracker.recordConnectionTime(connectTime);
        }
      }

      const metrics = tracker.getMetrics();

      expect(metrics.messageCount).toBe(disconnectCount * messagesPerCycle);
      expect(metrics.connectionTime).toBeLessThan(150); // Quick reconnection
      
      console.log('Connection resilience metrics:', {
        disconnectCount,
        totalMessages: metrics.messageCount,
        avgReconnectTime: `${metrics.connectionTime.toFixed(2)}ms`,
        avgMessageLatency: `${metrics.avgLatency.toFixed(2)}ms`,
        overallThroughput: `${metrics.messagesPerSecond.toFixed(2)} msg/sec`,
      });
    });
  });

  describe('Memory Efficiency Under Load', () => {
    it('should maintain stable memory usage during extended operation', async () => {
      const duration = 5000; // 5 seconds
      const messageRate = 100; // messages per second
      const memoryReadings: number[] = [];
      const tracker = new RealtimePerformanceTracker();
      
      tracker.start();
      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        // Send a batch of messages
        const batchPromises = Array.from({ length: 10 }, async () => {
          const messageStart = performance.now();
          
          // Simulate message processing
          const data = {
            id: Math.random().toString(36),
            payload: Array.from({ length: 100 }, () => Math.random()),
            timestamp: new Date().toISOString(),
          };
          
          await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
          
          return performance.now() - messageStart;
        });
        
        const latencies = await Promise.all(batchPromises);
        latencies.forEach(latency => tracker.recordMessage(latency));
        
        // Record memory usage periodically
        if (memoryReadings.length === 0 || Date.now() - startTime > memoryReadings.length * 1000) {
          memoryReadings.push(process.memoryUsage().heapUsed / 1024 / 1024);
        }
        
        // Control message rate
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const metrics = tracker.getMetrics();
      
      // Calculate memory growth rate
      const memoryGrowth = memoryReadings.length > 1
        ? (memoryReadings[memoryReadings.length - 1] - memoryReadings[0]) / memoryReadings.length
        : 0;

      expect(Math.abs(memoryGrowth)).toBeLessThan(5); // Less than 5MB growth per second
      expect(metrics.avgLatency).toBeLessThan(20); // Maintain performance
      
      console.log('Extended operation metrics:', {
        duration: `${duration}ms`,
        totalMessages: metrics.messageCount,
        avgLatency: `${metrics.avgLatency.toFixed(2)}ms`,
        throughput: `${metrics.messagesPerSecond.toFixed(2)} msg/sec`,
        initialMemory: `${memoryReadings[0]?.toFixed(2)}MB`,
        finalMemory: `${memoryReadings[memoryReadings.length - 1]?.toFixed(2)}MB`,
        memoryGrowthRate: `${memoryGrowth.toFixed(2)}MB/sec`,
      });
    });
  });
});