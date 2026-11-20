export interface ClientOptions { baseUrl?: string; timeout?: number; fetch?: typeof fetch; }
export interface SendResult { messageId: number; status: string; senderId: string; totalRecipients: number;
  segmentsPerMessage: number; creditsDeducted: number; balanceRemaining: number; raw: Record<string, unknown>; }
export interface MessageStatus { messageId: number; senderId: string; status: 'pending' | 'sent' | 'partial' | 'failed' | string;
  totalRecipients: number; successfulCount: number; failedCount: number; createdAt: string | null; sentAt: string | null; raw: Record<string, unknown>; }
export declare class Client {
  constructor(senderId: string, apiKey: string, options?: ClientOptions);
  send(to: string | string[], message: string): Promise<SendResult>;
  balance(): Promise<number>;
  messageStatus(messageId: number): Promise<MessageStatus>;
}
export declare function segments(text: string): number;
export declare const VERSION: string;
export declare class MacraSMSError extends Error { status: number; body: Record<string, any>; }
export declare class ApiError extends MacraSMSError {}
export declare class ValidationError extends MacraSMSError { readonly details: string[]; }
export declare class AuthenticationError extends MacraSMSError {}
export declare class InsufficientBalanceError extends MacraSMSError { readonly required: number | null; readonly available: number | null; readonly messageId: number | null; }
export declare class AccountSuspendedError extends MacraSMSError {}
export declare class NotFoundError extends MacraSMSError {}
export declare class RateLimitError extends MacraSMSError { readonly retryAfter: number | null; }
