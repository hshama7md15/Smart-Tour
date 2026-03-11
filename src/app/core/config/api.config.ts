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
    apiKey: 'AIzaSyDKvjunG5o2RocoHYKndhccmmqTvHPlkz4',
    authDomain: 'smarttourprojct.firebaseapp.com',
    databaseURL:
      'https://smarttourprojct-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'smarttourprojct',
    storageBucket: 'smarttourprojct.firebasestorage.app',
    messagingSenderId: '5887139615',
    appId: '1:5887139615:web:07e0838a6b98f6eb675a2a'
  }
} as const;

export type ApiConfig = typeof API_CONFIG;

