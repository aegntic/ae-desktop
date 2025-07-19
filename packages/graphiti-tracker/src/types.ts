/**
 * Type definitions for Graphiti tracker
 */

export interface UIAction {
  action_type: string;
  action_inputs: Record<string, any>;
  target_element?: {
    name?: string;
    type?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
  };
  timestamp: Date;
  session_id: string;
  user_intent?: string;
}

export interface ActionResult {
  action_id: string;
  success: boolean;
  error_message?: string;
  screenshot_before?: string;
  screenshot_after?: string;
  execution_time_ms: number;
}

export interface Session {
  session_id: string;
  user_id?: string;
  start_time: Date;
  end_time?: Date;
  goal?: string;
}

export interface QueryRequest {
  query: string;
  session_id?: string;
  limit?: number;
}

export interface GraphitiConfig {
  serviceUrl: string;
  apiKey?: string;
  neo4jUri?: string;
  neo4jUser?: string;
  neo4jPassword?: string;
  enableLogging?: boolean;
}

export interface TrackerEvent {
  type: 'action' | 'result' | 'session_start' | 'session_end' | 'error';
  data: any;
  timestamp: Date;
}