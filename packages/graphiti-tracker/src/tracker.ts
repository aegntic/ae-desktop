/**
 * Graphiti Tracker - Main tracking implementation
 */

import { EventEmitter } from 'events';
import { logger } from '@ui-tars/shared/logger';
import { GraphitiClient } from './client';
import type {
  UIAction,
  ActionResult,
  Session,
  GraphitiConfig,
  TrackerEvent,
} from './types';

export class GraphitiTracker extends EventEmitter {
  private client: GraphitiClient;
  private config: GraphitiConfig;
  private currentSession?: Session;
  private actionQueue: UIAction[] = [];
  private isProcessing = false;
  private isInitialized = false;

  constructor(config: GraphitiConfig) {
    super();
    this.config = config;
    this.client = new GraphitiClient(config);
  }

  async initialize(): Promise<void> {
    try {
      const isHealthy = await this.client.healthCheck();
      if (!isHealthy) {
        throw new Error('Graphiti service is not healthy');
      }
      
      this.isInitialized = true;
      logger.info('GraphitiTracker initialized successfully');
      
      // Start processing queue
      this.startQueueProcessor();
    } catch (error) {
      logger.error('Failed to initialize GraphitiTracker', error);
      throw error;
    }
  }

  async startSession(userId?: string, goal?: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Tracker not initialized');
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentSession = {
      session_id: sessionId,
      user_id: userId,
      start_time: new Date(),
      goal,
    };

    try {
      await this.client.startSession(this.currentSession);
      this.emit('session:start', this.currentSession);
      logger.info(`Started tracking session: ${sessionId}`);
      return sessionId;
    } catch (error) {
      logger.error('Failed to start session', error);
      throw error;
    }
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) {
      logger.warn('No active session to end');
      return;
    }

    try {
      await this.client.endSession(this.currentSession.session_id);
      this.emit('session:end', this.currentSession);
      logger.info(`Ended tracking session: ${this.currentSession.session_id}`);
      this.currentSession = undefined;
    } catch (error) {
      logger.error('Failed to end session', error);
      throw error;
    }
  }

  async trackAction(
    actionType: string,
    actionInputs: Record<string, any>,
    targetElement?: UIAction['target_element'],
    userIntent?: string
  ): Promise<string> {
    if (!this.currentSession) {
      logger.warn('No active session, starting new session');
      await this.startSession();
    }

    const action: UIAction = {
      action_type: actionType,
      action_inputs: actionInputs,
      target_element: targetElement,
      timestamp: new Date(),
      session_id: this.currentSession!.session_id,
      user_intent: userIntent,
    };

    // Add to queue for processing
    this.actionQueue.push(action);
    
    const actionId = `${action.session_id}_${action.timestamp.getTime()}`;
    
    // Emit event immediately
    this.emit('action:tracked', { action, actionId });
    
    return actionId;
  }

  async trackActionResult(
    actionId: string,
    success: boolean,
    executionTimeMs: number,
    errorMessage?: string,
    screenshotBefore?: string,
    screenshotAfter?: string
  ): Promise<void> {
    const result: ActionResult = {
      action_id: actionId,
      success,
      error_message: errorMessage,
      screenshot_before: screenshotBefore,
      screenshot_after: screenshotAfter,
      execution_time_ms: executionTimeMs,
    };

    try {
      await this.client.trackActionResult(result);
      this.emit('action:result', result);
      
      if (!success) {
        logger.error(`Action failed: ${actionId}`, errorMessage);
      }
    } catch (error) {
      logger.error('Failed to track action result', error);
    }
  }

  async query(query: string, limit: number = 10): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Tracker not initialized');
    }

    return await this.client.query({
      query,
      session_id: this.currentSession?.session_id,
      limit,
    });
  }

  private async startQueueProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.isProcessing || this.actionQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        // Process actions in batch
        const batch = this.actionQueue.splice(0, 10);
        
        for (const action of batch) {
          try {
            const { action_id } = await this.client.trackAction(action);
            logger.debug(`Tracked action: ${action_id}`);
          } catch (error) {
            logger.error('Failed to track action', error);
            // Re-queue failed action
            this.actionQueue.unshift(action);
          }
        }
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process queue every second
  }

  // Decorator function to automatically track actions
  static trackMethod(actionType: string) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const tracker = (this as any).tracker as GraphitiTracker;
        if (!tracker) {
          return originalMethod.apply(this, args);
        }

        const startTime = Date.now();
        let actionId: string | undefined;
        let screenshotBefore: string | undefined;

        try {
          // Extract action inputs from arguments
          const actionInputs = args[0] || {};
          
          // Track action start
          actionId = await tracker.trackAction(
            actionType,
            actionInputs,
            undefined,
            (this as any).currentUserIntent
          );

          // Execute original method
          const result = await originalMethod.apply(this, args);
          
          // Track success
          if (actionId) {
            await tracker.trackActionResult(
              actionId,
              true,
              Date.now() - startTime
            );
          }

          return result;
        } catch (error) {
          // Track failure
          if (actionId) {
            await tracker.trackActionResult(
              actionId,
              false,
              Date.now() - startTime,
              error instanceof Error ? error.message : String(error)
            );
          }
          throw error;
        }
      };

      return descriptor;
    };
  }
}

// Singleton instance
let trackerInstance: GraphitiTracker | null = null;

export function getGraphitiTracker(config?: GraphitiConfig): GraphitiTracker {
  if (!trackerInstance && config) {
    trackerInstance = new GraphitiTracker(config);
  }
  
  if (!trackerInstance) {
    throw new Error('GraphitiTracker not initialized. Please provide config.');
  }
  
  return trackerInstance;
}