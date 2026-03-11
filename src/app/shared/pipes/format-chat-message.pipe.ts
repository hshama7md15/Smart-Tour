import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'formatChatMessage', standalone: true })
export class FormatChatMessagePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string | null | undefined): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');
    const escaped = this.escapeHtml(text);
    const formatted = this.applyMarkdown(escaped);
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private applyMarkdown(s: string): string {
    let out = s
      // markdown links to place with coords or id (absolute or relative)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+\/place\/[+\-]?\d+\.\d+&[+\-]?\d+\.\d+|\/place\/[+\-]?\d+\.\d+&[+\-]?\d+\.\d+|\/place\/\d+)\)/g, (_, text, path) =>
        `<a href="${path}" class="chat-link">${text}</a>`
      )
      // markdown links to map (absolute or relative)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+\/map\?[^)]+|\/map\?[^)]+)\)/g, (_, text, path) =>
        `<a href="${path}" class="chat-link">${text}</a>`
      )
      // markdown links to any absolute http(s) URL
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, text, path) =>
        `<a href="${path}" class="chat-link" target="_blank" rel="noopener">${text}</a>`
      )
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h4 class="chat-h4">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="chat-h3">$1</h3>')
      .replace(/^# (.+)$/gm, '<h3 class="chat-h3">$1</h3>');
    out = out.replace(/(?:^- .+\n?)+/gm, (m) => {
      const items = m.trim().split('\n').filter(Boolean).map(line => line.replace(/^- /, ''));
      if (items.length === 0) return m;
      return '<ul class="chat-list">' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
    });
    // convert plain http(s) URLs into clickable links
    out = out.replace(/(https?:\/\/[^\s<]+)/g, function (m: string, ...args: any[]) {
      const str = args[args.length - 1] as string;
      const offset = args[args.length - 2] as number;
      // if the URL is inside an attribute or immediately follows = or " or ' or >, skip replacement
      if (offset > 0) {
        const prev = str[offset - 1];
        if (prev === '"' || prev === "'" || prev === '=' || prev === '>' || prev === '/') {
          return m;
        }
      }
      try {
        const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
        const isSameOrigin = origin && m.startsWith(origin);
        if (isSameOrigin) {
          return `<a href="${m}" class="chat-link">${m}</a>`;
        }
      } catch {
        // fallthrough
      }
      return `<a href="${m}" class="chat-link" target="_blank" rel="noopener">${m}</a>`;
    });
    return out
      .replace(/\n\n/g, '</p><p class="chat-p">')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p class="chat-p">')
      .replace(/$/, '</p>');
  }
}
