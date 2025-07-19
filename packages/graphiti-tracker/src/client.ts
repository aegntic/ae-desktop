/**
 * Graphiti Service Client
 */

import { logger } from '@ui-tars/shared/logger';
import type {
  UIAction,
  ActionResult,
  Session,
  QueryRequest,
  GraphitiConfig,
} from './types';

export class GraphitiClient {
  private config: GraphitiConfig;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: GraphitiConfig) {
    this.config = config;
    this.baseUrl = config.serviceUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    if (config.apiKey) {
      this.headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`Graphiti request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async trackAction(action: UIAction): Promise<{ action_id: string }> {
    const response = await this.request<any>('/actions/track', 'POST', {
      ...action,
      timestamp: action.timestamp.toISOString(),
    });
    return { action_id: response.action_id };
  }

  async trackActionResult(result: ActionResult): Promise<void> {
    await this.request('/actions/result', 'POST', result);
  }

  async startSession(session: Session): Promise<{ session_id: string }> {
    const response = await this.request<any>('/sessions/start', 'POST', {
      ...session,
      start_time: session.start_time.toISOString(),
      end_time: session.end_time?.toISOString(),
    });
    return { session_id: response.session_id };
  }

  async endSession(sessionId: string): Promise<void> {
    await this.request(`/sessions/end?session_id=${sessionId}`, 'POST');
  }

  async query(request: QueryRequest): Promise<any> {
    return await this.request('/query', 'POST', request);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request<any>('/health');
      return response.status === 'healthy';
    } catch {
      return false;
    }
  }
}