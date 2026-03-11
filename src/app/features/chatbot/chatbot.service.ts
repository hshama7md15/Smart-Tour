import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, map, catchError, switchMap, forkJoin } from 'rxjs';
import { API_CONFIG } from '../../core/config/api.config';
import { ChatMessage, ChatSession } from './chatbot.types';
import { AuthService } from '../../services/auth.service';
import { PlacesService } from '../../services/places.service';
import { Place } from '../../models/place.model';
import { GovernorateService } from '../../services/governorate.service';
import { Governorate } from '../../models/governorate.model';

const STORAGE_KEY = 'smartTourChatSession';
const MESSAGES_MAP_KEY = 'smartTourChatSessionsMap';
const SHARED_KEY = 'smartTourChatShared';

type FireworksRole = 'system' | 'user' | 'assistant';

interface FireworksChatMessage {
  role: FireworksRole;
  content: string;
}

interface FireworksRequestBody {
  model: string;
  messages: FireworksChatMessage[];
  max_tokens: number;
  temperature: number;
}

interface FireworksResponse {
  choices: Array<{
    message: {
      role: FireworksRole;
      content: string;
    };
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private readonly endpoint = API_CONFIG.AI.endpoint;
  private readonly apiKey = API_CONFIG.AI.apiKey;
  // Fireworks serverless model – official docs use deepseek-v3p1
  private readonly modelId = 'accounts/fireworks/models/deepseek-v3p1';

  private session: ChatSession;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  private readonly baseSystemPrompt = [
    'You are "Egypt Tourism Guide", a professional Egyptian tourism guide AI assistant.',
    'Your job is to help tourists discover and understand Egyptian attractions, landmarks, temples, museums, historical cities, and cultural experiences.',
    'You answer ONLY questions related to tourism in Egypt.',
    'Provide: historical explanations, visiting tips, cultural information, opening hours when relevant, typical durations, and location references (city and governorate).',
    'If the user asks questions that are completely unrelated to Egyptian tourist attractions, or explicitly asks about a different country, respond exactly with: "I specialize only in Egyptian tourist attractions."',
    'Format your responses for readability: use **bold** for key terms, ## for section headers when listing multiple points, and - for bullet lists. Use line breaks between paragraphs.',
    '',
    '**IMPORTANT - Links when user asks for رابط or link:**',
    '1) If the attraction IS in Smart Tour, return a full absolute link to the place on this site using the site origin and coordinates, for example: http://localhost:4200/place/LAT&LNG (use the runtime origin, not a hard-coded host). Format the anchor as [Place Name](FULL_URL).',
    '2) If the attraction is NOT in Smart Tour but you know its coordinates, prefer the internal map page on the Smart Tour site using a full absolute link: [Link Text](FULL_MAP_URL), where FULL_MAP_URL is the site origin + /map?lat=LATITUDE&lng=LONGITUDE&name=PLACE_NAME.',
    '3) Use external links (Google Maps, Wikipedia, etc.) ONLY if the user explicitly asks for an external link or says "لينك خارجي".',
    'Never say "لا يمكنني توفير رابط" – always give either a Smart Tour /place/LAT&LNG link, an internal /map link, or (only when explicitly requested) an external link.'
  ].join('\n');

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private placesService: PlacesService,
    private governorateService: GovernorateService
  ) {
    this.session = this.loadSessionFromStorage();
    this.messagesSubject.next(this.session.messages);
    // react to auth state changes: on logout clear messages, on login load saved messages
    try {
      this.authService.currentUser$.subscribe((user) => {
        if (!user) {
          this.clearMessages();
        } else {
          this.loadMessagesFromStorage();
        }
      });
    } catch (e) {
      // ignore
    }
  }

  /**
   * Export current messages to localStorage so a new tab can hydrate them.
   */
  exportMessagesForSharing(): void {
    try {
      const data = JSON.stringify(this.session.messages || []);
      localStorage.setItem(SHARED_KEY, data);
    } catch (e) {
      // ignore
    }
  }

  /**
   * If another tab left shared messages in localStorage, hydrate the session
   * and clear the shared slot so it won't be reused accidentally.
   */
  hydrateFromSharedIfPresent(): void {
    try {
      const raw = localStorage.getItem(SHARED_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length) {
        this.session.messages = parsed;
        this.messagesSubject.next(this.session.messages);
      }
      localStorage.removeItem(SHARED_KEY);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Clear current session messages and local storage entry.
   */
  clearMessages(): void {
    try {
      this.session.messages = [];
      this.messagesSubject.next([]);
      // Do not remove STORAGE_KEY here — keep saved session so it can
      // be restored when the user logs in again.
    } catch (e) {
      // ignore
    }
  }

  /**
   * Load messages from storage (used after login to restore saved session)
   */
  loadMessagesFromStorage(): void {
    try {
      // Try to load per-user stored messages map and restore messages for
      // the currently logged-in user's email. Fall back to anonymous slot.
      const rawMap = localStorage.getItem(MESSAGES_MAP_KEY);
      if (!rawMap) return;
      const map = JSON.parse(rawMap) as Record<string, ChatMessage[]> | undefined;
      if (!map) return;

      const userEmail = this.authService.getCurrentUser()?.email ?? 'anonymous';
      const stored = map[userEmail] ?? map['anonymous'] ?? [];
      if (Array.isArray(stored) && stored.length) {
        // merge stored messages with current session (stored older first)
        const merged = [...stored, ...this.session.messages];
        // avoid simple duplicate ids (preserve order)
        const seen = new Set<string>();
        const deduped: ChatMessage[] = [];
        for (const m of merged) {
          if (!m || !m.id) continue;
          if (seen.has(m.id)) continue;
          seen.add(m.id);
          deduped.push(m);
        }
        this.session.messages = deduped;
        this.messagesSubject.next(this.session.messages);
      }
    } catch (e) {
      // ignore
    }
  }

  private transformResponseContent(content: string): Observable<string> {
    if (!content) return of(content);

    // 1) Handle markdown links first: [text](target)
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const latLngParamRegex = /[?&]lat=([+-]?\d{1,2}\.\d+)[^&]*&lng=([+-]?\d{1,3}\.\d+)/i;

    const mdMatches = Array.from(content.matchAll(mdLinkRegex));
    const mdLookups: Observable<{ original: string; replacement?: string }>[] = [];

    for (const m of mdMatches) {
      const full = m[0];
      const text = m[1];
      const inside = m[2];

      // inside may contain URL and extra text; take first token as URL
      const firstTokenMatch = inside.trim().match(/^(\S+)/);
      if (!firstTokenMatch) continue;
      const urlPart = firstTokenMatch[1];

      // 1) check for query params ?lat=...&lng=...
      const paramMatch = urlPart.match(latLngParamRegex);
      if (paramMatch) {
        const lat = paramMatch[1];
        const lng = paramMatch[2];
        const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:4200';
        mdLookups.push(of({ original: full, replacement: `[${text}](${origin}/place/${lat}&${lng})` }));
        continue;
      }

      // 2) check for path-style /place/{lat}&{lng}
      const pathMatch = urlPart.match(/\/place\/([+-]?\d{1,2}\.\d+)&([+-]?\d{1,3}\.\d+)/);
      if (pathMatch) {
        const lat = pathMatch[1];
        const lng = pathMatch[2];
        const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:4200';
        mdLookups.push(of({ original: full, replacement: `[${text}](${origin}/place/${lat}&${lng})` }));
        continue;
      }
    }

    // 2) Handle plain URLs (not inside markdown)
    const urlLatLngRegex = /(?:https?:\/\/[^\s"']+|\/[^\s"']+|http:\/\/localhost:[0-9]+\/[^\s"']+|https:\/\/localhost:[0-9]+\/[^\s"']+)(?:\?[^\s"']*)?/g;
    const mdRanges = mdMatches.map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
    const urlMatches = Array.from(content.matchAll(urlLatLngRegex)).map((m) => ({ url: m[0], index: m.index ?? 0 }));

    const plainLookups: Observable<{ original: string; replacement?: string }>[] = [];
    for (const u of urlMatches) {
      const insideMd = mdRanges.some((r) => u.index >= r.start && u.index < r.end);
      if (insideMd) continue;
      // check for query param style first
      const paramMatch = u.url.match(latLngParamRegex);
      if (paramMatch) {
        const lat = paramMatch[1];
        const lng = paramMatch[2];
        const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:4200';
        plainLookups.push(of({ original: u.url, replacement: `${origin}/place/${lat}&${lng}` }));
        continue;
      }

      // then check for path-style /place/{lat}&{lng}
      const pathMatch = u.url.match(/\/place\/([+-]?\d{1,2}\.\d+)&([+-]?\d{1,3}\.\d+)/);
      if (pathMatch) {
        const lat = pathMatch[1];
        const lng = pathMatch[2];
        const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:4200';
        plainLookups.push(of({ original: u.url, replacement: `${origin}/place/${lat}&${lng}` }));
        continue;
      }
    }

    const allLookups = [...mdLookups, ...plainLookups];
    if (!allLookups.length) return of(content);

    return forkJoin(allLookups).pipe(
      map((results) => {
        let transformed = content;
        for (const r of results) {
          if (r.replacement) transformed = transformed.split(r.original).join(r.replacement);
        }
        return transformed;
      }),
      catchError(() => of(content))
    );
  }

  private loadSessionFromStorage(): ChatSession {
    if (!this.authService.isLoggedIn()) {
      const now = new Date().toISOString();
      return {
        id: crypto.randomUUID(),
        userId: null,
        messages: [],
        createdAt: now,
        updatedAt: now
      };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as ChatSession;
      }
    } catch {
      // ignore and create a new session
    }

    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      userId: this.authService.getCurrentUser()?.id?.toString() ?? null,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
  }

  private persistSession(): void {
    // Always persist the session to localStorage so messages typed while
    // the user is not logged in are kept and can be restored after login.
    try {
      this.session.updatedAt = new Date().toISOString();
      // keep legacy session record for compatibility
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
      } catch {}

      // persist messages per-user by email (or anonymous)
      try {
        const rawMap = localStorage.getItem(MESSAGES_MAP_KEY);
        const map = rawMap ? (JSON.parse(rawMap) as Record<string, ChatMessage[]>) : {};
        const userEmail = this.authService.getCurrentUser()?.email ?? 'anonymous';
        map[userEmail] = this.session.messages || [];
        localStorage.setItem(MESSAGES_MAP_KEY, JSON.stringify(map));
      } catch {}
    } catch (e) {
      // ignore storage errors
    }
  }

  get currentMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  private buildSystemPrompt(places: Place[]): string {
    if (!places || places.length === 0) {
      return this.baseSystemPrompt;
    }

    const lines: string[] = [this.baseSystemPrompt, '', 'KNOWN SMART TOUR PLACES (for /place/LAT&LNG links):'];

    // نقتصر على أول 80 معلم لتقليل حجم البرومبت
    places.slice(0, 80).forEach((p) => {
      const gov = p.governorate || p.city || '';
      const lat = p.latitude ?? p.coordinates?.lat ?? '';
      const lng = p.longitude ?? p.coordinates?.lng ?? '';
      lines.push(`COORDS=${lat},${lng} | Name="${p.name}" | Governorate="${gov}"`);
    });

    lines.push(
      'When the user asks for a link to a place that matches one of the lines above, always use its coordinates with this format: [Place Name](/place/LAT&LNG).'
    );

    return lines.join('\n');
  }

  sendMessage(content: string): Observable<ChatMessage> {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };

    this.session.messages = [...this.session.messages, userMessage];
    this.messagesSubject.next(this.session.messages);
    this.persistSession();

    if (!this.endpoint || !this.apiKey) {
      const fallback: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'The AI assistant is not fully configured yet. Please ask about Egyptian attractions and landmarks after the Fireworks AI endpoint and API key are set in the configuration.',
        createdAt: new Date().toISOString()
      };

      this.session.messages = [...this.session.messages, fallback];
      this.messagesSubject.next(this.session.messages);
      this.persistSession();
      return of(fallback);
    }

    const wantsLink = /\b(لينك|رابط|link)\b/i.test(content);

    const aiFlow = (): Observable<ChatMessage> =>
      forkJoin({
        places: this.placesService.getAllPlaces().pipe(catchError(() => of<Place[]>([]))),
        govs: this.governorateService.getAllGovernorates().pipe(catchError(() => of<Governorate[]>([])))
      }).pipe(
        switchMap(({ places, govs }) => {
          const systemPrompt = this.buildSystemPrompt(places);

          const fwMessages: FireworksChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...this.session.messages.map<FireworksChatMessage>((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            }))
          ];

          const body: FireworksRequestBody = {
            model: this.modelId,
            messages: fwMessages,
            max_tokens: 700,
            temperature: 0.7
          };

          const headers = {
            Authorization: `Bearer ${this.apiKey}`
          };

          return this.http.post<FireworksResponse>(this.endpoint, body, { headers }).pipe(
            switchMap((res) => {
              const contentReply =
                res.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response right now.';

              return this.transformResponseContent(contentReply).pipe(
                map((transformed) => {
                  const reply: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: transformed,
                    createdAt: new Date().toISOString()
                  };

                  this.session.messages = [...this.session.messages, reply];
                  this.messagesSubject.next(this.session.messages);
                  this.persistSession();

                  return reply;
                })
              );
            })
          );
        }),
        catchError((err) => {
          const errorMsg = err?.message || 'فشل الاتصال بالـ AI. تحقق من الاتصال بالإنترنت أو جرّب لاحقاً.';
          const fallback: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `عذراً، حدث خطأ: ${errorMsg}`,
            createdAt: new Date().toISOString()
          };
          this.session.messages = [...this.session.messages, fallback];
          this.messagesSubject.next(this.session.messages);
          this.persistSession();
          return of(fallback);
        })
      );

    if (wantsLink) {
      return this.placesService.findPlaceByQuery(content).pipe(
        switchMap((matched) => {
          if (matched) {
            const plat = matched.latitude ?? matched.coordinates?.lat;
            const plng = matched.longitude ?? matched.coordinates?.lng;
            const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:4200';
            const link = plat != null && plng != null ? `${origin}/place/${plat}&${plng}` : `${origin}/place/`;
            const reply: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              // return only the full URL string so the pipe can render it appropriately
              content: `${link}`,
              createdAt: new Date().toISOString()
            };

            this.session.messages = [...this.session.messages, reply];
            this.messagesSubject.next(this.session.messages);
            this.persistSession();
            return of(reply);
          }
          // no match — call AI flow to generate /map or external link
          return aiFlow();
        }),
        catchError(() => aiFlow())
      );
    }

    return aiFlow();
  }

  private findBestPlaceMatch(places: Place[], query: string, governorates: Governorate[] = []): Place | undefined {
    const q = query.toLowerCase();

    // 1) look for exact or substring matches on name
    let candidate = places.find((p) => p.name.toLowerCase() === q || q.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(q));
    if (candidate) return candidate;

    // 2) match by governorate (English or Arabic) or city name
    candidate = places.find((p) => (p.city || '').toLowerCase().includes(q));
    if (candidate) return candidate;

    // Try matching against governorates list (Arabic or English)
    const govMatch = governorates.find(
      (g) => q.includes((g.nameAr || '').toLowerCase()) || q.includes((g.nameEn || '').toLowerCase()) || (g.name || '').toLowerCase() === q
    );
    if (govMatch) {
      const govPlaces = places.filter((p) => (p.governorate || '').toLowerCase() === (govMatch.nameEn || govMatch.name).toLowerCase());
      if (govPlaces.length) {
        // choose the highest rated or first
        govPlaces.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        return govPlaces[0];
      }
    }

    // 3) if the query contains coordinates, find nearest place
    const coordMatch = query.match(/([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      let best: Place | undefined = undefined;
      let bestDist = Number.MAX_VALUE;
      for (const p of places) {
        if (p.latitude == null || p.longitude == null) continue;
        const d = this.distance(lat, lng, p.latitude, p.longitude);
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      }
      if (best) return best;
    }

    return undefined;
  }

  private distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  clearHistory(): void {
    const now = new Date().toISOString();
    this.session = {
      id: crypto.randomUUID(),
      userId: this.authService.getCurrentUser()?.id?.toString() ?? null,
      messages: [],
      createdAt: now,
      updatedAt: now
    };
    this.messagesSubject.next(this.session.messages);
    this.persistSession();
  }
}


