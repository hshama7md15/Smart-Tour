export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId?: string | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

