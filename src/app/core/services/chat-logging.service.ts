import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../config/api.config';
import { ChatSession } from '../../features/chatbot/chatbot.types';

@Injectable({
  providedIn: 'root'
})
export class ChatLoggingService {
  private readonly databaseUrl: string | null = API_CONFIG.FIREBASE.databaseURL || null;

  constructor(private http: HttpClient) {}

  saveSession(session: ChatSession) {
    const dbUrl = this.databaseUrl;
    if (!dbUrl) {
      return;
    }

    const url = `${dbUrl.replace(/\/$/, '')}/conversations.json`;
    return this.http.post(url, {
      userId: session.userId ?? null,
      messages: session.messages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      timestamp: new Date().toISOString()
    }).subscribe({
      error: (err) => {
        console.error('Failed to log chat session to Firebase', err);
      }
    });
  }
}

