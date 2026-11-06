/** Provider-neutral contract so another LLM provider can be added without touching the AI service. */

export type ProviderFunctionCall = { name: string; args: Record<string, unknown> };

export type ProviderPart = {
  text?: string;
  functionCall?: ProviderFunctionCall;
  functionResponse?: { name: string; response: Record<string, unknown> };
  inlineData?: { mimeType: string; data: string };
  [key: string]: unknown;
};

export type ProviderContent = { role: 'user' | 'model'; parts: ProviderPart[] };

/** JSON-schema subset accepted by function-calling providers. */
export type ToolParameterSchema = {
  type: 'object';
  properties: Record<
    string,
    {
      type: 'string' | 'integer' | 'number' | 'boolean';
      description?: string;
      enum?: string[];
      minimum?: number;
      maximum?: number;
    }
  >;
  required?: string[];
};

export type ProviderToolDeclaration = {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
};

export type GenerateRequest = {
  model: string;
  system: string;
  contents: ProviderContent[];
  tools?: ProviderToolDeclaration[];
  /** NONE keeps tools declared (required when history has function calls) but forces a text answer. */
  toolMode?: 'AUTO' | 'NONE';
  temperature?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number | null;
};

export type ProviderUsage = { inputTokens: number; outputTokens: number; totalTokens: number };

export type GenerateResult = {
  text: string;
  functionCalls: ProviderFunctionCall[];
  /** The model turn exactly as returned (needed to continue function-calling conversations). */
  content: ProviderContent;
  usage: ProviderUsage;
  finishReason: string | null;
  model: string;
};

export type EmbedTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export type ProviderErrorCategory =
  | 'invalid_credentials'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'unavailable'
  | 'invalid_request'
  | 'invalid_response'
  | 'blocked';

export class AIProviderError extends Error {
  category: ProviderErrorCategory;
  status: number | null;
  retryable: boolean;
  constructor(category: ProviderErrorCategory, message: string, status: number | null = null) {
    super(message);
    this.category = category;
    this.status = status;
    this.retryable = category === 'rate_limited' || category === 'unavailable' || category === 'network' || category === 'timeout';
  }
}

export interface AIProvider {
  readonly name: string;
  generate(request: GenerateRequest): Promise<GenerateResult>;
  embed(texts: string[], options: { model: string; task: EmbedTask; dimensions: number }): Promise<{
    vectors: number[][];
    usage: ProviderUsage;
  }>;
  /** Extract plain text from a binary document (e.g. PDF) using the model. */
  extractText(
    file: { mimeType: string; base64: string },
    options: { model: string; maxOutputTokens: number }
  ): Promise<{ text: string; usage: ProviderUsage }>;
}
