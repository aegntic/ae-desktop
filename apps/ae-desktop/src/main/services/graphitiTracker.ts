/**
 * Graphiti Tracker Service for UI-AE Desktop
 */

import { logger } from '@main/logger';
import { getGraphitiTracker, GraphitiTracker } from '@ui-ae/graphiti-tracker';
import { SettingStore } from '@main/store/setting';
import type { UIAction } from '@ui-ae/graphiti-tracker';

export class GraphitiTrackerService {
  private static instance: GraphitiTrackerService;
  private tracker: GraphitiTracker | null = null;
  private isInitialized = false;
  private currentSessionId: string | null = null;

  private constructor() {}

  static getInstance(): GraphitiTrackerService {
    if (!GraphitiTrackerService.instance) {
      GraphitiTrackerService.instance = new GraphitiTrackerService();
    }
    return GraphitiTrackerService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const settings = SettingStore.getInstance();
      const graphitiEnabled = settings.get('graphitiEnabled', false);
      
      if (!graphitiEnabled) {
        logger.info('Graphiti tracking is disabled');
        return;
      }

      const serviceUrl = settings.get('graphitiServiceUrl', 'http://localhost:8100');
      const apiKey = settings.get('graphitiApiKey', '');

      this.tracker = getGraphitiTracker({
        serviceUrl,
        apiKey,
        enableLogging: true,
      });

      await this.tracker.initialize();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      logger.info('GraphitiTracker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GraphitiTracker', error);
      // Don't throw - tracking failure shouldn't break the app
    }
  }

  private setupEventListeners(): void {
    if (!this.tracker) return;

    this.tracker.on('session:start', (session) => {
      logger.info('Graphiti session started', session);
    });

    this.tracker.on('session:end', (session) => {
      logger.info('Graphiti session ended', session);
    });

    this.tracker.on('action:tracked', ({ action, actionId }) => {
      logger.debug('Action tracked', { actionId, type: action.action_type });
    });

    this.tracker.on('action:result', (result) => {
      if (!result.success) {
        logger.error('Action failed', result);
      }
    });
  }

  async startSession(userId?: string, goal?: string): Promise<string | null> {
    if (!this.isInitialized || !this.tracker) {
      return null;
    }

    try {
      this.currentSessionId = await this.tracker.startSession(userId, goal);
      return this.currentSessionId;
    } catch (error) {
      logger.error('Failed to start tracking session', error);
      return null;
    }
  }

  async endSession(): Promise<void> {
    if (!this.isInitialized || !this.tracker) {
      return;
    }

    try {
      await this.tracker.endSession();
      this.currentSessionId = null;
    } catch (error) {
      logger.error('Failed to end tracking session', error);
    }
  }

  async trackAction(
    actionType: string,
    actionInputs: Record<string, any>,
    targetElement?: UIAction['target_element'],
    userIntent?: string
  ): Promise<string | null> {
    if (!this.isInitialized || !this.tracker) {
      return null;
    }

    try {
      return await this.tracker.trackAction(
        actionType,
        actionInputs,
        targetElement,
        userIntent
      );
    } catch (error) {
      logger.error('Failed to track action', error);
      return null;
    }
  }

  async trackActionResult(
    actionId: string,
    success: boolean,
    executionTimeMs: number,
    errorMessage?: string,
    screenshotBefore?: string,
    screenshotAfter?: string
  ): Promise<void> {
    if (!this.isInitialized || !this.tracker || !actionId) {
      return;
    }

    try {
      await this.tracker.trackActionResult(
        actionId,
        success,
        executionTimeMs,
        errorMessage,
        screenshotBefore,
        screenshotAfter
      );
    } catch (error) {
      logger.error('Failed to track action result', error);
    }
  }

  async query(query: string, limit: number = 10): Promise<any> {
    if (!this.isInitialized || !this.tracker) {
      return null;
    }

    try {
      return await this.tracker.query(query, limit);
    } catch (error) {
      logger.error('Failed to query knowledge graph', error);
      return null;
    }
  }

  isActive(): boolean {
    return this.isInitialized && this.currentSessionId !== null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}