/**
 * Tests for Graphiti Tracker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GraphitiTracker } from './tracker';
import { GraphitiClient } from './client';
import type { UIAction, ActionResult, GraphitiConfig } from './types';

// Mock the client
vi.mock('./client', () => {
  return {
    GraphitiClient: vi.fn().mockImplementation(() => ({
      healthCheck: vi.fn().mockResolvedValue(true),
      trackAction: vi.fn().mockResolvedValue({ action_id: 'test-action-123' }),
      trackActionResult: vi.fn().mockResolvedValue(undefined),
      startSession: vi.fn().mockResolvedValue({ session_id: 'test-session-123' }),
      endSession: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ results: [] }),
    })),
  };
});

// Mock logger
vi.mock('@ui-tars/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('GraphitiTracker', () => {
  let tracker: GraphitiTracker;
  let mockClient: any;
  const config: GraphitiConfig = {
    serviceUrl: 'http://localhost:8100',
    apiKey: 'test-api-key',
    enableLogging: true,
  };

  beforeEach(() => {
    tracker = new GraphitiTracker(config);
    mockClient = (tracker as any).client;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully when service is healthy', async () => {
      await tracker.initialize();
      expect(mockClient.healthCheck).toHaveBeenCalled();
      expect((tracker as any).isInitialized).toBe(true);
    });

    it('should throw error when service is unhealthy', async () => {
      mockClient.healthCheck.mockResolvedValueOnce(false);
      await expect(tracker.initialize()).rejects.toThrow('Graphiti service is not healthy');
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await tracker.initialize();
    });

    it('should start a session', async () => {
      const sessionId = await tracker.startSession('user123', 'Test goal');
      expect(sessionId).toMatch(/^session_/);
      expect(mockClient.startSession).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user123',
          goal: 'Test goal',
        })
      );
    });

    it('should end a session', async () => {
      await tracker.startSession();
      await tracker.endSession();
      expect(mockClient.endSession).toHaveBeenCalled();
    });

    it('should handle ending session when no active session', async () => {
      await tracker.endSession();
      expect(mockClient.endSession).not.toHaveBeenCalled();
    });
  });

  describe('action tracking', () => {
    beforeEach(async () => {
      await tracker.initialize();
      await tracker.startSession();
    });

    it('should track an action', async () => {
      const actionId = await tracker.trackAction(
        'click',
        { x: 100, y: 200 },
        { name: 'button', type: 'submit' },
        'Submit form'
      );

      expect(actionId).toBeTruthy();
      expect(actionId).toContain('session_');
    });

    it('should start session automatically if none active', async () => {
      await tracker.endSession();
      
      const actionId = await tracker.trackAction('type', { text: 'hello' });
      
      expect(actionId).toBeTruthy();
      expect(mockClient.startSession).toHaveBeenCalledTimes(2); // Once in beforeEach, once here
    });

    it('should track action result', async () => {
      await tracker.trackActionResult(
        'test-action-123',
        true,
        150,
        undefined,
        'screenshot-before',
        'screenshot-after'
      );

      expect(mockClient.trackActionResult).toHaveBeenCalledWith({
        action_id: 'test-action-123',
        success: true,
        execution_time_ms: 150,
        error_message: undefined,
        screenshot_before: 'screenshot-before',
        screenshot_after: 'screenshot-after',
      });
    });

    it('should track failed action result', async () => {
      await tracker.trackActionResult(
        'test-action-123',
        false,
        500,
        'Element not found'
      );

      expect(mockClient.trackActionResult).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error_message: 'Element not found',
        })
      );
    });
  });

  describe('querying', () => {
    it('should query the knowledge graph', async () => {
      await tracker.initialize();
      const results = await tracker.query('recent actions', 5);
      
      expect(mockClient.query).toHaveBeenCalledWith({
        query: 'recent actions',
        session_id: undefined,
        limit: 5,
      });
    });

    it('should throw error when not initialized', async () => {
      await expect(tracker.query('test')).rejects.toThrow('Tracker not initialized');
    });
  });

  describe('decorator', () => {
    class TestOperator {
      tracker = tracker;
      currentUserIntent = 'Test intent';

      @GraphitiTracker.trackMethod('test_action')
      async performAction(params: any) {
        if (params.shouldFail) {
          throw new Error('Action failed');
        }
        return { success: true };
      }
    }

    beforeEach(async () => {
      await tracker.initialize();
      await tracker.startSession();
    });

    it('should track successful method execution', async () => {
      const operator = new TestOperator();
      const result = await operator.performAction({ test: true });

      expect(result).toEqual({ success: true });
      expect(mockClient.trackActionResult).toHaveBeenCalledWith(
        expect.any(String),
        true,
        expect.any(Number),
        undefined,
        undefined,
        undefined
      );
    });

    it('should track failed method execution', async () => {
      const operator = new TestOperator();
      
      await expect(operator.performAction({ shouldFail: true }))
        .rejects.toThrow('Action failed');
      
      expect(mockClient.trackActionResult).toHaveBeenCalledWith(
        expect.any(String),
        false,
        expect.any(Number),
        'Action failed',
        undefined,
        undefined
      );
    });
  });
});