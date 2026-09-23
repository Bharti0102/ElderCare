export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  suggestions?: string[];
}

export interface AITool {
  readonly name: string;
  readonly description: string;
  execute(userId: string, parameters: Record<string, any>): Promise<ToolExecutionResult>;
}
