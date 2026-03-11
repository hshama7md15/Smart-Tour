# Smart Tour - Angular Application

A complete Angular project for exploring and managing travel destinations with user authentication, place details, recommendations, and admin management features.

## Project Structure

```
src/
├── app/
│   ├── models/                 # Data models
│   │   ├── place.model.ts
│   │   ├── user.model.ts
│   │   └── recommendation.model.ts
│   │
│   ├── services/              # API services
│   │   ├── auth.service.ts
│   │   ├── places.service.ts
│   │   └── recommendation.service.ts
│   │
│   ├── interceptors/          # HTTP interceptors
│   │   └── auth.interceptor.ts
│   │
│   ├── pages/                 # Page components
│   │   ├── home/
│   │   │   ├── home.component.ts
│   │   │   ├── home.component.html
│   │   │   └── home.component.css
│   │   ├── login/
│   │   ├── register/
│   │   ├── places/
│   │   ├── place-details/
│   │   ├── recommendations/
│   │   └── admin-dashboard/
│   │
│   ├── app.ts                # Main app component
│   ├── app.html              # App template
│   ├── app.css               # App styles
│   ├── app.routes.ts         # Routing configuration
│   └── app.config.ts         # App configuration
│
├── index.html
├── main.ts
├── styles.css               # Global styles

```

## Features

### 1. **Authentication** 
- User login and registration with reactive forms
- JWT token management
- User state management with observables

### 2. **Places Management**
- Browse all places with filtering by category
- View detailed information about each place
- Location on Google Maps
- Audio explanation of places using Web Speech API

### 3. **User Recommendations**
- Get personalized place recommendations based on interests
- Remove unwanted recommendations

### 4. **Admin Dashboard**
- Add, edit, and delete places
- Manage place categories
- Full CRUD operations with validation forms

### 5. **Responsive Design**
- Mobile-first design
- Modern gradient backgrounds
- Card-based layouts
- Smooth transitions and animations

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- Angular CLI 18+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Developer Server
```bash
ng serve
# or
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload when you change any of the source files.

### Step 3: Configure API URL
Update the API URL in your services (default is `https://localhost:5001/api`):

**In `src/app/services/auth.service.ts`:**
```typescript
private apiUrl = 'https://your-api-url/api';
```

**In `src/app/services/places.service.ts`:**
```typescript
private apiUrl = 'https://your-api-url/api/places';
```

**In `src/app/services/recommendation.service.ts`:**
```typescript
private apiUrl = 'https://your-api-url/api/recommendations';
```

## Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomeComponent | Landing page with hero section |
| `/login` | LoginComponent | User login page |
| `/register` | RegisterComponent | User registration page |
| `/places` | PlacesComponent | Browse all places with filters |
| `/place/:id` | PlaceDetailsComponent | Detailed view of a place |
| `/recommendations` | RecommendationsComponent | User's personalized recommendations |
| `/admin` | AdminDashboardComponent | Admin management panel |

## Services

### AuthService
- `register(email, password, firstName, lastName)` - Register new user
- `login(email, password)` - Login existing user
- `logout()` - Logout current user
- `getCurrentUser()` - Get current user info
- `isLoggedIn()` - Check if user is logged in
- `setCurrentUser(user, token)` - Set current user with token
- `getAuthToken()` - Get current auth token

### PlacesService
- `getAllPlaces()` - Get all places
- `getPlaceById(id)` - Get specific place details
- `createPlace(place)` - Create new place (admin)
- `updatePlace(id, place)` - Update place (admin)
- `deletePlace(id)` - Delete place (admin)
- `getPlacesByCategory(category)` - Filter places by category

### RecommendationService
- `getRecommendations(userId)` - Get user's recommendations
- `createRecommendation(recommendation)` - Add recommendation (admin)
- `deleteRecommendation(id)` - Remove recommendation

## API Requirements

Your backend API should implement the following endpoints:

### Authentication
```
POST /api/auth/register
POST /api/auth/login
```

### Places
```
GET /api/places
GET /api/places/{id}
POST /api/places
PUT /api/places/{id}
DELETE /api/places/{id}
GET /api/places/category/{category}
```

### Recommendations
```
GET /api/recommendations/user/{userId}
POST /api/recommendations
DELETE /api/recommendations/{id}
```

## Models

### Place
```typescript
{
  id: number;
  name: string;
  city: string;
  description: string;
  historicalInfo: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  visitorsPerYear: number;
}
```

### User
```typescript
{
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'User' | 'Admin';
  interests: string[];
  createdAt: Date;
}
```

### Recommendation
```typescript
{
  id: number;
  userId: number;
  place: Place;
  score: number;
  reason: string;
}
```

## Components Overview

### Home Component
- Hero section with gradient background
- Feature cards highlighting app capabilities
- Call-to-action button to explore places

### Login Component
- Email and password validation
- Error messaging
- Link to register page
- Reactive forms with FormBuilder

### Register Component
- First name, last name, email, password fields
- Password confirmation validation
- Error handling
- Link to login page

### Places Component
- Grid layout of place cards
- Category filtering system
- Place cards with images, ratings, and description
- Navigate to place details

### Place Details Component
- Full place information display
- Google Maps embed with coordinates
- Web Speech API for audio explanation
- Back navigation button

### Recommendations Component
- Grid of recommended places
- Percentage match score
- Remove recommendation functionality
- Navigate to place details

### Admin Dashboard Component
- Add/Edit/Delete places form
- Form validation for all fields
-Places management table
- Modal form overlay
- Category management
- Image URL, coordinates, and visitor count inputs

## Styling

The app uses:
- **Gradient backgrounds**: Linear gradients (purple to blue)
- **Card layouts**: Box shadows and hover effects
- **Responsive grid**: CSS Grid and Flexbox
- **Animations**: Smooth transitions and transforms
- **Color scheme**: 
  - Primary: #667eea (Indigo)
  - Secondary: #764ba2 (Purple)
  - Accent: #e74c3c (Red for errors)

## Authentication Flow

1. User registers/logs in
2. Backend returns JWT token and user info
3. Token is stored in localStorage and HTTP headers (via interceptor)
4. User info is stored in AuthService as observable
5. Navigation bar updates based on authentication state
6. When logging out, token and user info are cleared

## Development Tips

### Adding a New Component
```bash
ng generate component pages/new-page
```

### Adding a New Service
```bash
ng generate service services/new-service
```

### Build for Production
```bash
ng build --configuration production
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Dependencies

Main dependencies are provided in `package.json`:
- Angular 18+
- RxJS
- TypeScript 5.1+

## Security Considerations

1. **CORS**: Configure CORS in your backend to allow requests from your frontend domain
2. **JWT Storage**: Tokens are stored in localStorage (consider using httpOnly cookies for production)
3. **HTTPS**: Always use HTTPS in production
4. **Validation**: Both client and server-side validation is recommended
5. **XSS Protection**: Angular's built-in sanitization helps prevent XSS attacks

## Troubleshooting

### CORS Issues
- Make sure your backend has CORS enabled
- Check that the API URLs are correctly configured

### 404 Errors
- Verify your backend API is running
- Check that all endpoints are implemented
- Verify API URL matches backend configuration

### Authentication Issues
- Check that tokens are being stored properly
- Verify token is included in API requests (via interceptor)
- Check token expiration and refresh logic

## License

MIT

## Support

For questions or issues, please refer to the Angular documentation or your backend API documentation.
