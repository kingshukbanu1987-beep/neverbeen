export declare function geminiGenerateContentUrl(model: string): string;
export declare function geminiHeaders(key: string): Record<string, string>;
export declare function logGeminiFailure(
  scope: string,
  model: string,
  response: Response,
): Promise<void>;
