import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const requiredEnvironmentValues = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
} as const;

type RequiredEnvironmentKey =
  (typeof requiredEnvironmentValues)[keyof typeof requiredEnvironmentValues];

function readFirebaseConfig(): FirebaseOptions {
  const environment = import.meta.env as Record<string, string | undefined>;
  const missing: RequiredEnvironmentKey[] = [];
  const config: Record<string, string> = {};

  for (const [configKey, environmentKey] of Object.entries(
    requiredEnvironmentValues,
  )) {
    const value = environment[environmentKey]?.trim();
    if (!value) {
      missing.push(environmentKey);
    } else {
      config[configKey] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Firebase configuration is missing: ${missing.join(", ")}. ` +
        "Copy .env.example to .env and provide every required Vite environment value.",
    );
  }

  return config as FirebaseOptions;
}

interface FirebaseServices {
  auth: Auth;
  firestore: Firestore;
}

let services: FirebaseServices | undefined;
let emulatorsConnected = false;

export function getFirebaseServices(): FirebaseServices {
  if (services) {
    return services;
  }

  const app =
    getApps().length > 0 ? getApp() : initializeApp(readFirebaseConfig());
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  if (
    import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true" &&
    !emulatorsConnected
  ) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    emulatorsConnected = true;
  }

  services = { auth, firestore };
  return services;
}
