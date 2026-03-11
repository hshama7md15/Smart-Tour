import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from './chatbot.service';
import { ChatMessage } from './chatbot.types';
import { FormatChatMessagePipe } from '../../shared/pipes/format-chat-message.pipe';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatChatMessagePipe],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css']
})
export class ChatbotWidgetComponent implements OnInit {
  isOpen = false;
  messages: ChatMessage[] = [];
  pending = false;
  inputValue = '';
  isRecording = false;
  supportsSpeech = false;
  private recognition: any = null;
  micError = '';

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    this.chatbotService.messages$.subscribe((messages) => {
      this.messages = messages;
    });

    // Initialize Web Speech API if available
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.supportsSpeech = true;
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'ar-EG';
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }
          // show interim + final in input
          this.inputValue = (this.inputValue || '') + final + interim;
        };

        this.recognition.onerror = (err: any) => {
          console.warn('Speech recognition error', err);
          this.micError = err?.message || 'Speech recognition error';
          this.isRecording = false;
        };

        this.recognition.onend = () => {
          this.isRecording = false;
          // auto-send if we have content
          const text = this.inputValue.trim();
          if (text) this.sendMessage();
        };
      } catch (e) {
        this.supportsSpeech = false;
        this.micError = 'Speech recognition not available';
      }
    }
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
  }

  openInNewTab(): void {
    if (typeof window !== 'undefined') {
      // export messages so the new tab can load them
      try {
        this.chatbotService.exportMessagesForSharing();
      } catch {
        // ignore
      }
      const origin = window.location?.origin || '';
      window.open(`${origin}/chat`, '_blank');
    }
  }

  sendMessage(): void {
    const trimmed = this.inputValue.trim();
    if (!trimmed || this.pending) {
      return;
    }

    this.inputValue = '';
    this.pending = true;
    this.chatbotService.sendMessage(trimmed).subscribe({
      next: () => {
        this.pending = false;
      },
      error: (err) => {
        console.error('Chatbot error', err);
        this.pending = false;
      }
    });
  }

  toggleRecording(): void {
    if (!this.supportsSpeech) return;
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording(): void {
    if (!this.recognition) return;
    try {
      this.micError = '';
      this.isRecording = true;
      // clear input for new capture
      this.inputValue = '';
      this.recognition.start();
    } catch (e: any) {
      console.error('startRecording error', e);
      this.micError = e?.message || 'Unable to start microphone';
      this.isRecording = false;
    }
  }

  stopRecording(): void {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e: any) {
      console.error('stopRecording error', e);
      this.isRecording = false;
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(rawEvent: Event): void {
    const event = rawEvent as KeyboardEvent;
    if (!this.isOpen) return;
    const target = event.target as HTMLElement | null;
    if (target && target.tagName.toLowerCase() === 'textarea') {
      if (!event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
    }
  }
}

