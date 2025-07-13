// Test setup for frontend
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('NODE_ENV', 'test');