import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Determinar si debemos ejecutar la aplicación en Modo de Prueba (Mock Mode)
const isMockMode = 
  !firebaseConfig.apiKey || 
  firebaseConfig.apiKey.includes('YOUR_API_KEY') || 
  !firebaseConfig.authDomain ||
  firebaseConfig.authDomain.includes('YOUR_AUTH_DOMAIN');

let auth: Auth | null = null;

if (!isMockMode) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    console.log("Firebase inicializado con éxito.");
  } catch (error) {
    console.error("Error al inicializar Firebase. Activando Modo de Prueba.", error);
  }
} else {
  console.log("Configuración de Firebase no detectada. Iniciando en Modo de Prueba.");
}

export { auth, isMockMode };
