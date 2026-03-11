export const API_CONFIG = {
  AI: {
    provider: 'fireworks',
    apiKey: 'fw_CPDwdYYsYhRqZzY86pQMDw',
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    accountId: 'georgesamouil4-9mkco',
    model: 'accounts/fireworks/models/qwen3p5-397b-a17b'
  },

  GOOGLE_MAPS: {
    apiKey: ''
  },

  TOURISM_API: {
    baseUrl: '',
    openTripMapApiKey: '5ae2e3f221c38a28845f05b6162c65188b0c43615536effd075de495'
  },

  WEATHER_API: {
   apiKey: '5d22c225f86e46c66d52258bdcd09fdc',
   baseUrl: 'https://api.openweathermap.org/data/3.0/onecall'
  },

  FIREBASE: {
     apiKey: 'AIzaSyALCmKF-swTVIreSMoVzznii9rU7XJ06cE',
    authDomain: 'angular-movie-app-iti-project.firebaseapp.com',
    databaseURL:
      'https://smarttour-e9a34-default-rtdb.firebaseio.com',
    projectId: 'angular-movie-app-iti-project',
    storageBucket: 'angular-movie-app-iti-project.firebasestorage.app',
    messagingSenderId: '561762620669',
    appId: '1:561762620669:web:487c0333ab5dde1c5c5a94'
  }
} as const;

export type ApiConfig = typeof API_CONFIG;

