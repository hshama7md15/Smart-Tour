import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { RecommendationsComponent } from './pages/recommendations/recommendations.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'places',
    loadComponent: () =>
      import('./pages/places/places.component').then((m) => m.PlacesComponent)
  },
  {
    path: 'governorate/:name',
    loadComponent: () =>
      import('./pages/governorate-places/governorate-places.component').then(
        (m) => m.GovernoratePlacesComponent
      )
  },
  {
    path: 'place/:coords',
    loadComponent: () =>
      import('./pages/place-details/place-details.component').then(
        (m) => m.PlaceDetailsComponent
      )
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat-standalone/chat-standalone.component').then(m => m.ChatStandaloneComponent)
  },
  { path: 'recommendations', component: RecommendationsComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: '**', redirectTo: '' }
];
