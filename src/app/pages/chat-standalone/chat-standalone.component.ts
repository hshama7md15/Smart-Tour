import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatbotService } from '../../features/chatbot/chatbot.service';
import { FormatChatMessagePipe } from '../../shared/pipes/format-chat-message.pipe';

@Component({
  selector: 'app-chat-standalone',
  standalone: true,
  imports: [CommonModule, FormatChatMessagePipe],
  templateUrl: './chat-standalone.component.html',
  styleUrls: ['./chat-standalone.component.css']
})
export class ChatStandaloneComponent implements OnInit {
  messages = [] as any[];

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    // try to hydrate from shared storage first
    try {
      this.chatbotService.hydrateFromSharedIfPresent();
    } catch {
      // ignore
    }

    this.chatbotService.messages$.subscribe((m) => (this.messages = m || []));
  }
}
