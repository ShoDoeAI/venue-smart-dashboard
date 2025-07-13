import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, CircuitState } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100, // 100ms for faster tests
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute function successfully in CLOSED state', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should open circuit after failure threshold', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // First 2 failures - circuit stays closed
    for (let i = 0; i < 2; i++) {
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    }
    
    // Third failure - circuit opens
    try {
      await circuitBreaker.execute(fn);
    } catch {
      // Expected
    }
    
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should reject calls when circuit is OPEN', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }
    }
    
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    
    // Try to execute when open
    const successFn = vi.fn().mockResolvedValue('success');
    await expect(circuitBreaker.execute(successFn)).rejects.toThrow('Circuit breaker is OPEN');
    expect(successFn).not.toHaveBeenCalled();
  });

  it('should transition to HALF_OPEN after reset timeout', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }
    }
    
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    
    // Wait for reset timeout
    vi.advanceTimersByTime(100);
    
    // Next call should transition to HALF_OPEN
    const successFn = vi.fn().mockResolvedValue('success');
    await circuitBreaker.execute(successFn);
    
    expect(successFn).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should close circuit on success in HALF_OPEN state', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }
    }
    
    // Wait for reset timeout
    vi.advanceTimersByTime(100);
    
    // Successful call should close circuit
    const successFn = vi.fn().mockResolvedValue('success');
    await circuitBreaker.execute(successFn);
    
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should reopen circuit on failure in HALF_OPEN state', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }
    }
    
    // Wait for reset timeout
    vi.advanceTimersByTime(100);
    
    // Failed call should reopen circuit
    try {
      await circuitBreaker.execute(fn);
    } catch {
      // Expected
    }
    
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should provide correct metrics', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    
    // One failure
    try {
      await circuitBreaker.execute(fn);
    } catch {
      // Expected
    }
    
    // One success
    await circuitBreaker.execute(fn);
    
    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.CLOSED);
    expect(metrics.failureCount).toBe(0); // Reset after success
    expect(metrics.successCount).toBe(0); // Only counted in HALF_OPEN
    expect(metrics.lastFailureTime).toBeDefined();
  });

  it('should reset circuit breaker', () => {
    circuitBreaker.reset();
    
    const metrics = circuitBreaker.getMetrics();
    expect(metrics.state).toBe(CircuitState.CLOSED);
    expect(metrics.failureCount).toBe(0);
    expect(metrics.successCount).toBe(0);
    expect(metrics.lastFailureTime).toBeUndefined();
  });
});