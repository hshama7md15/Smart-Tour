import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { WeatherService, WeatherResponse } from './core/services/weather.service';
import { ChatbotWidgetComponent } from './features/chatbot/chatbot-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule, ChatbotWidgetComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('smart-tour');

  // Navbar weather/time state
  navbarWeather: { temp?: number; icon?: string; description?: string } | null = null;
  navbarTime = signal(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  showNavbarWeather = true;

  // Mobile menu & profile dropdown state
  menuOpen = false;
  profileOpen = false;

  private timeInterval: any;
  private routerSub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private weatherService: WeatherService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Update time every 30s
    this.timeInterval = setInterval(() => {
      this.navbarTime.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);

    // Hide navbar weather on chat route
    this.routerSub = this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        this.showNavbarWeather = !ev.urlAfterRedirects.startsWith('/chat');
        // Close menus on navigation
        this.menuOpen = false;
        this.profileOpen = false;
      }
    });

    // Try to get user location and fetch weather
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          this.weatherService.getCurrentWeatherByCoordinates(latitude, longitude).subscribe({
            next: (w: WeatherResponse) => {
              this.navbarWeather = {
                temp: Math.round(w.main.temp),
                icon: w.weather?.[0]?.icon
                  ? `https://openweathermap.org/img/wn/${w.weather[0].icon}@2x.png`
                  : undefined,
                description: w.weather?.[0]?.description
              };
            },
            error: () => {
              this.navbarWeather = null;
            }
          });
        },
        () => {
          // Permission denied or error — leave navbarWeather null
        },
        { maximumAge: 600000, timeout: 5000 }
      );
    }
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
    this.routerSub?.unsubscribe();
  }

  // ==================== MENU METHODS ====================

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.profileOpen = false;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  toggleProfile(event: Event): void {
    event.stopPropagation();
    this.profileOpen = !this.profileOpen;
    this.menuOpen = false;
  }

  closeProfile(): void {
    this.profileOpen = false;
  }

  // Close all menus when clicking outside
  onAppClick(event: Event): void {
    this.profileOpen = false;
    this.menuOpen = false;
  }

  // ==================== AUTH ====================

  get currentUser$() {
    return this.authService.currentUser$;
  }

  logout(): void {
    this.closeProfile();
    this.closeMenu();
    this.authService.logout();
  }
}