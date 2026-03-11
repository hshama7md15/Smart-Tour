# Quick Start Guide - Smart Tour Angular App

## Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
ng serve
# or
npm start
```

The application will automatically open at `http://localhost:4200`

### 3. First Steps

#### Home Page
- Click on **"Explore Places"** button to view all available places
- The home page features a beautiful gradient hero section

#### Browse Places
- Access via `/places` route or click "Places" in navigation
- Filter places by category (Historical, Natural, Cultural, Religious, Architecture, Museum)
- Click "View Details" on any place card

#### Place Details
- See full information about the place
- View the location on Google Maps (embedded)
- Click "Listen to Explanation" to hear audio description using Web Speech API
- Navigate back to places list

#### Authentication

**Register New Account:**
1. Click "Register" in navigation bar
2. Fill in First Name, Last Name, Email, Password
3. Confirm password and submit
4. You'll be logged in automatically

**Login:**
1. Click "Login" in navigation bar
2. Enter email and password
3. Click "Login"

#### User Features

After logging in, you'll see additional options:

**Recommendations Page:**
- Click "Recommendations" in navigation
- View places recommended based on your interests
- See the match percentage for each recommendation
- Click "Remove" to dismiss recommendations

#### Admin Features

If your user has Admin role:

**Admin Dashboard:**
1. Click "Admin" in navigation bar
2. Click "+ Add New Place" button
3. Fill in all required fields:
   - Place name
   - City
   - Category
   - Rating (0-5)
   - Latitude & Longitude
   - Image URL (must be valid image URL)
   - Description
   - Historical Information
4. Click "Create Place"

**Edit Existing Place:**
1. Find the place in the table
2. Click "Edit" button
3. Modify fields and click "Update Place"

**Delete Place:**
1. Find the place in the table
2. Click "Delete" button
3. Confirm deletion

### 4. Configuration

#### Update API URL
All services use `https://localhost:5001/api` as default. Update this in:

- `src/app/services/auth.service.ts`
- `src/app/services/places.service.ts`
- `src/app/services/recommendation.service.ts`

Example:
```typescript
private apiUrl = 'https://your-backend-domain/api';
```

### 5. Available Routes

| URL | Purpose |
|-----|---------|
| `/` | Home page |
| `/login` | Login page |
| `/register` | Registration page |
| `/places` | Browse all places |
| `/place/1` | Place details (replace 1 with place ID) |
| `/recommendations` | Your recommendations |
| `/admin` | Admin dashboard |

### 6. Mock Data You Can Use

When testing with your API, you can use this sample data:

**Sample Place:**
```json
{
  "id": 1,
  "name": "Eiffel Tower",
  "city": "Paris",
  "description": "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.",
  "historicalInfo": "Built in 1889 for the World's Fair",
  "imageUrl": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",
  "category": "Architecture",
  "latitude": 48.8584,
  "longitude": 2.2945,
  "rating": 4.8,
  "visitorsPerYear": 6900000
}
```

**Sample User:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "User",
  "interests": ["Historical", "Architecture"],
  "createdAt": "2024-01-01"
}
```

### 7. Testing the Web Speech API

The text-to-speech feature uses the Web Speech API:
- Click "Listen to Explanation" button on any place details page
- Check browser console if audio doesn't play
- Supported browsers: Chrome, Edge, Safari

### 8. Keyboard Shortcuts & Tips

- **Navbar**: Sticky navigation - stays visible while scrolling
- **Cards**: Hover for smooth elevation effect
- **Buttons**: Click for immediate action feedback
- **Forms**: Real-time validation with error messages
- **Mobile**: Fully responsive - test on different screen sizes

### 9. Common Issues & Solutions

**"Failed to load places" error:**
- Check that backend API is running
- Verify API URL is correct
- Check browser console for CORS errors
- Make sure backend has CORS enabled for your domain

**Login not working:**
- Verify email and password are correct
- Check network tab in browser DevTools
- Ensure backend is returning proper JWT token

**Map not showing:**
- Verify latitude and longitude are valid numbers
- Check that coordinates are properly formatted

**Audio not playing:**
- Some browsers require user interaction first
- Check system volume
- Check browser permissions for microphone/speaker
- Not supported on all browsers (test in Chrome first)

### 10. Build for Production

When you're ready to deploy:

```bash
ng build --configuration production
```

This creates optimized production build in `dist/` directory.

## Next Steps

1. Connect to your ASP.NET Core Web API backend
2. Implement real data in your database
3. Add image hosting (cloud storage like AWS S3, Azure Blob Storage, etc.)
4. Deploy frontend to hosting service (Vercel, Netlify, Azure Static Web Apps, etc.)
5. Set up SSL/HTTPS certificates
6. Configure environment variables for different deployments

## Need Help?

- Check `IMPLEMENTATION_GUIDE.md` for detailed documentation
- Review Angular documentation: https://angular.dev
- Check service files for API method details
- Review component templates for UI structure

Happy exploring! 🌍✈️
