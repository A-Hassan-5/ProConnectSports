import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);

      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      profileUnsub = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          setProfile(snap.exists() ? snap.data() : null);
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      authUnsub();
      if (profileUnsub) {
        profileUnsub();
      }
    };
  }, []);

  const value = useMemo(() => {
    const role = profile?.role || 'user';
    return {
      authUser,
      profile,
      role,
      isAdmin: role === 'admin',
      isBanned: !!profile?.banned,
      loading,
      isLoggedIn: !!authUser,
    };
  }, [authUser, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
