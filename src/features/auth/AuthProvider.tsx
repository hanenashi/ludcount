import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  deleteUser,
  getAdditionalUserInfo,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseServices } from "../../lib/firebase";
import { enforceExistingGoogleEnrollment } from "./enrollment";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const interactiveSignInPending = useRef(false);

  useEffect(() => {
    const { auth } = getFirebaseServices();
    return onAuthStateChanged(auth, (nextUser) => {
      if (!interactiveSignInPending.current) {
        setUser(nextUser);
      }
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const { auth } = getFirebaseServices();
    return {
      user,
      loading,
      signInWithEmail: async (email, password) => {
        interactiveSignInPending.current = true;
        try {
          const result = await signInWithEmailAndPassword(
            auth,
            email,
            password,
          );
          setUser(result.user);
        } finally {
          interactiveSignInPending.current = false;
        }
      },
      signInWithGoogle: async () => {
        interactiveSignInPending.current = true;
        try {
          const result = await signInWithPopup(auth, new GoogleAuthProvider());
          await enforceExistingGoogleEnrollment({
            isNewUser: getAdditionalUserInfo(result)?.isNewUser === true,
            removeNewUser: () => deleteUser(result.user),
            signOutUser: () => signOut(auth),
          });
          setUser(result.user);
        } catch (error) {
          setUser(null);
          throw error;
        } finally {
          interactiveSignInPending.current = false;
        }
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email);
      },
      signOutUser: async () => {
        await signOut(auth);
      },
    };
  }, [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
