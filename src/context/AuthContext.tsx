import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  where,
  createFirebaseAuthUser
} from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

export interface CreateUserData {
  displayName: string;
  email: string;
  password?: string;
  role: UserRole;
  department?: string;
  phone?: string;
  status: 'active' | 'pending' | 'inactive';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  allUsers: UserProfile[];
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginDemo: (role?: UserRole) => void;
  logout: () => Promise<void>;
  createUser: (userData: CreateUserData) => Promise<string>;
  updateUser: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole, status?: 'active' | 'pending' | 'inactive') => Promise<void>;
  resetUserPassword: (uid: string, newPass: string) => Promise<void>;
  deleteUserProfile: (uid: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_EMAIL = 'localizacioncoelemu@gmail.com';

/**
 * Generate a deterministic Firestore document ID for a given user email.
 * This guarantees the exact same document ID across all devices and sessions.
 */
export function getUserDocId(email: string): string {
  const sanitized = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `usr_${sanitized}`;
}

const INITIAL_USERS: UserProfile[] = [
  {
    uid: getUserDocId(ADMIN_EMAIL),
    email: ADMIN_EMAIL,
    displayName: 'Administrador SIG (Principal)',
    role: 'admin',
    department: 'Dirección SIG & Cartografía',
    phone: '+56 9 8765 4321',
    status: 'active',
    passwordHint: 'Coelemu2026!',
    createdAt: 1704067200000,
    lastLogin: Date.now(),
  },
  {
    uid: getUserDocId('terreno.sig@gmail.com'),
    email: 'terreno.sig@gmail.com',
    displayName: 'Especialista de Terreno & Sectores',
    role: 'usuario',
    department: 'Levantamiento Territorial',
    phone: '+56 9 7654 3210',
    status: 'active',
    passwordHint: 'Terreno2026',
    createdAt: 1705276800000,
    lastLogin: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    uid: getUserDocId('analisis.catastro@gmail.com'),
    email: 'analisis.catastro@gmail.com',
    displayName: 'Analista de Capas & KMZ',
    role: 'usuario',
    department: 'Análisis Geoespacial',
    phone: '+56 9 6543 2109',
    status: 'active',
    passwordHint: 'Catastro2026',
    createdAt: 1706486400000,
    lastLogin: Date.now() - 1000 * 60 * 60 * 24,
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(INITIAL_USERS);

  // Helper to fetch user by email from Firestore with fallback checks
  const findUserInFirestoreByEmail = async (email: string): Promise<{ docId: string; data: UserProfile } | null> => {
    const cleanEmail = email.trim().toLowerCase();
    const docId = getUserDocId(cleanEmail);

    try {
      // 1. Direct doc lookup by canonical ID
      const directSnap = await getDoc(doc(db, 'users', docId));
      if (directSnap.exists()) {
        return { docId: directSnap.id, data: directSnap.data() as UserProfile };
      }

      // 2. Query by email field
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const firstDoc = qSnap.docs[0];
        return { docId: firstDoc.id, data: firstDoc.data() as UserProfile };
      }
    } catch (err) {
      console.warn('Firestore findUserInFirestoreByEmail error:', err);
    }
    return null;
  };

  // Setup Firestore real-time listener for users collection and Auth state
  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanEmail = fbUser.email.trim().toLowerCase();
        const isMainAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

        try {
          const found = await findUserInFirestoreByEmail(cleanEmail);
          const canonicalDocId = getUserDocId(cleanEmail);

          if (found) {
            const existingData = found.data;
            const updatedProfile: UserProfile = {
              ...existingData,
              uid: canonicalDocId,
              email: cleanEmail,
              displayName: existingData.displayName || fbUser.displayName || cleanEmail.split('@')[0],
              role: isMainAdmin ? 'admin' : (existingData.role || 'usuario'),
              status: existingData.status || 'active',
              lastLogin: Date.now(),
            };
            setUser(updatedProfile);
            localStorage.setItem('sig_active_user', JSON.stringify(updatedProfile));
            // Keep Firestore in sync without overwriting custom fields
            await setDoc(doc(db, 'users', canonicalDocId), updatedProfile, { merge: true });
          } else {
            // New user registration in Firestore
            const newProfile: UserProfile = {
              uid: canonicalDocId,
              email: cleanEmail,
              displayName: fbUser.displayName || cleanEmail.split('@')[0],
              role: isMainAdmin ? 'admin' : 'usuario',
              status: 'active',
              department: isMainAdmin ? 'Dirección SIG & Cartografía' : 'Gestión Territorial',
              createdAt: Date.now(),
              lastLogin: Date.now(),
            };
            await setDoc(doc(db, 'users', canonicalDocId), newProfile, { merge: true });
            setUser(newProfile);
            localStorage.setItem('sig_active_user', JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Firestore user fetch note in onAuthStateChanged:', err);
          const fallbackUser: UserProfile = {
            uid: getUserDocId(cleanEmail),
            email: cleanEmail,
            displayName: fbUser.displayName || cleanEmail.split('@')[0],
            role: isMainAdmin ? 'admin' : 'usuario',
            status: 'active',
            createdAt: Date.now(),
            lastLogin: Date.now(),
          };
          setUser(fallbackUser);
          localStorage.setItem('sig_active_user', JSON.stringify(fallbackUser));
        }
      } else {
        // No Firebase Auth user, check local storage session for offline/direct access
        const savedActive = localStorage.getItem('sig_active_user');
        const savedDemo = localStorage.getItem('sig_demo_user');
        if (savedActive) {
          try {
            setUser(JSON.parse(savedActive));
          } catch {
            setUser(null);
          }
        } else if (savedDemo) {
          try {
            setUser(JSON.parse(savedDemo));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    // Real-time listener for all users (Persistent in Firestore)
    try {
      const usersCol = collection(db, 'users');
      unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, UserProfile>();
          
          snapshot.forEach((d) => {
            const data = d.data() as UserProfile;
            if (data.email) {
              const emailKey = data.email.trim().toLowerCase();
              const profile: UserProfile = {
                ...data,
                uid: data.uid || d.id || getUserDocId(emailKey),
                email: emailKey,
                displayName: data.displayName || emailKey.split('@')[0],
                role: emailKey === ADMIN_EMAIL.toLowerCase() ? 'admin' : (data.role || 'usuario'),
                status: data.status || 'active',
                createdAt: data.createdAt || Date.now(),
              };
              map.set(emailKey, profile);
            }
          });

          // Ensure master admin is always present
          if (!map.has(ADMIN_EMAIL.toLowerCase())) {
            const defaultAdmin = INITIAL_USERS[0];
            map.set(ADMIN_EMAIL.toLowerCase(), defaultAdmin);
            setDoc(doc(db, 'users', getUserDocId(ADMIN_EMAIL)), defaultAdmin, { merge: true }).catch(() => {});
          }

          const userArray = Array.from(map.values()).sort((a, b) => {
            if (a.email === ADMIN_EMAIL.toLowerCase()) return -1;
            if (b.email === ADMIN_EMAIL.toLowerCase()) return 1;
            return (a.displayName || '').localeCompare(b.displayName || '');
          });

          setAllUsers(userArray);
        } else {
          // If Firestore is brand new/empty, seed initial users
          INITIAL_USERS.forEach(async (u) => {
            try {
              await setDoc(doc(db, 'users', u.uid), u, { merge: true });
            } catch {
              // ignore
            }
          });
          setAllUsers(INITIAL_USERS);
        }
      }, (err) => {
        console.warn('Users onSnapshot error:', err);
        // Do NOT wipe allUsers on error, keep current state
      });
    } catch (e) {
      console.warn('Users collection listener error:', e);
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  const refreshUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const map = new Map<string, UserProfile>();
        snap.forEach((d) => {
          const data = d.data() as UserProfile;
          if (data.email) {
            map.set(data.email.trim().toLowerCase(), {
              ...data,
              uid: data.uid || d.id || getUserDocId(data.email),
            });
          }
        });
        setAllUsers(Array.from(map.values()));
      }
    } catch (e) {
      console.warn('refreshUsers error:', e);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    localStorage.removeItem('sig_demo_user');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail) {
      throw new Error('Ingrese su correo electrónico.');
    }
    if (!cleanPass) {
      throw new Error('Ingrese su contraseña.');
    }

    // 1. First, search for user in Firestore (enables instant cross-device login for all manager-registered users)
    const firestoreUserRecord = await findUserInFirestoreByEmail(cleanEmail);

    if (firestoreUserRecord) {
      const uData = firestoreUserRecord.data;

      // Status check
      if (uData.status === 'inactive') {
        throw new Error('Esta cuenta ha sido suspendida. Contacte al Administrador SIG Municipal.');
      }

      // Validate password with stored credential or Master Admin bypass
      const isMasterAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();
      const passMatches = uData.passwordHint 
        ? uData.passwordHint.trim() === cleanPass 
        : (isMasterAdmin || cleanPass.length >= 4);

      if (passMatches) {
        const canonicalId = getUserDocId(cleanEmail);
        const activeProfile: UserProfile = {
          ...uData,
          uid: canonicalId,
          email: cleanEmail,
          role: isMasterAdmin ? 'admin' : (uData.role || 'usuario'),
          status: 'active',
          lastLogin: Date.now(),
        };

        // Update last login in Firestore
        try {
          await setDoc(doc(db, 'users', canonicalId), activeProfile, { merge: true });
        } catch (e) {
          console.warn('Firestore update lastLogin note:', e);
        }

        // Try logging in with Firebase Auth in the background
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        } catch (authErr: any) {
          // If auth user doesn't exist yet, try creating it in the background
          if (cleanPass.length >= 6) {
            try {
              await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
            } catch {
              // Ignore background auth error, user is authenticated via verified Firestore record
            }
          }
        }

        setUser(activeProfile);
        localStorage.setItem('sig_active_user', JSON.stringify(activeProfile));
        return;
      } else {
        throw new Error('Contraseña incorrecta. Verifique sus credenciales de acceso.');
      }
    }

    // 2. Master Admin bootstrap if not yet in Firestore
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      const defaultAdmin: UserProfile = {
        uid: getUserDocId(ADMIN_EMAIL),
        email: ADMIN_EMAIL,
        displayName: 'Administrador SIG (Principal)',
        role: 'admin',
        department: 'Dirección SIG & Cartografía',
        phone: '+56 9 8765 4321',
        status: 'active',
        passwordHint: cleanPass,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };
      try {
        await setDoc(doc(db, 'users', getUserDocId(ADMIN_EMAIL)), defaultAdmin, { merge: true });
        if (cleanPass.length >= 6) {
          await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass).catch(() => {});
        }
      } catch {
        // ignore
      }
      setUser(defaultAdmin);
      localStorage.setItem('sig_active_user', JSON.stringify(defaultAdmin));
      return;
    }

    // 3. Fallback to standard Firebase Auth sign-in
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    } catch (fbErr: any) {
      console.warn('Firebase Auth direct login failed:', fbErr?.code);
      throw new Error('Usuario o contraseña no válidos. Verifique con el Administrador si su cuenta está registrada.');
    }
  };

  const registerWithEmail = async (email: string, pass: string, displayName: string, role: UserRole = 'usuario') => {
    localStorage.removeItem('sig_demo_user');
    const cleanEmail = email.trim().toLowerCase();
    const canonicalId = getUserDocId(cleanEmail);
    const isMainAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    } catch (err: any) {
      console.warn('registerWithEmail auth note:', err?.message);
    }

    const newProfile: UserProfile = {
      uid: canonicalId,
      email: cleanEmail,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
      role: isMainAdmin ? 'admin' : role,
      status: 'active',
      passwordHint: pass.trim(),
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };

    await setDoc(doc(db, 'users', canonicalId), newProfile, { merge: true });
    setUser(newProfile);
    localStorage.setItem('sig_active_user', JSON.stringify(newProfile));
  };

  const loginWithGoogle = async () => {
    localStorage.removeItem('sig_demo_user');
    await signInWithPopup(auth, googleProvider);
  };

  const loginDemo = (role: UserRole = 'admin') => {
    const demoEmail = role === 'admin' ? ADMIN_EMAIL : 'terreno.sig@gmail.com';
    const demoUser: UserProfile = {
      uid: getUserDocId(demoEmail),
      email: demoEmail,
      displayName: role === 'admin' ? 'Administrador SIG (Principal)' : 'Inspector de Campo / Consulta',
      role: role,
      department: role === 'admin' ? 'Dirección SIG y Cartografía' : 'Dpto. de Gestión del Riesgo',
      status: 'active',
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };
    localStorage.setItem('sig_demo_user', JSON.stringify(demoUser));
    localStorage.setItem('sig_active_user', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const logout = async () => {
    localStorage.removeItem('sig_demo_user');
    localStorage.removeItem('sig_active_user');
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
  };

  const createUser = async (userData: CreateUserData): Promise<string> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const pass = userData.password?.trim() || 'Coelemu2026';
    const canonicalId = getUserDocId(cleanEmail);

    // 1. Create account in Firebase Auth using isolated secondary instance
    if (pass && pass.length >= 6) {
      createFirebaseAuthUser(cleanEmail, pass).catch((err) => {
        console.warn('Background createFirebaseAuthUser note:', err);
      });
    }

    const newProfile: UserProfile = {
      uid: canonicalId,
      email: cleanEmail,
      displayName: userData.displayName.trim(),
      role: userData.role,
      department: userData.department?.trim() || 'Gestión Comunal',
      phone: userData.phone?.trim() || '',
      status: userData.status || 'active',
      passwordHint: pass,
      createdAt: Date.now(),
      lastLogin: undefined,
    };

    // Update local state immediately
    setAllUsers((prev) => {
      const filtered = prev.filter(u => u.email.toLowerCase() !== cleanEmail);
      return [newProfile, ...filtered];
    });

    // Save permanently to Firestore with merge to prevent accidental overwriting
    try {
      await setDoc(doc(db, 'users', canonicalId), newProfile, { merge: true });
    } catch (e) {
      console.warn('Firestore createUser note:', e);
      throw new Error('Error al sincronizar el usuario en Firebase Firestore.');
    }

    return canonicalId;
  };

  const updateUser = async (uid: string, updates: Partial<UserProfile>) => {
    const cleanUpdates = { ...updates };
    
    // Find target user in state
    const targetUser = allUsers.find(u => u.uid === uid || getUserDocId(u.email) === uid);
    const targetEmail = cleanUpdates.email ? cleanUpdates.email.trim().toLowerCase() : targetUser?.email.toLowerCase();
    const canonicalId = targetEmail ? getUserDocId(targetEmail) : uid;

    setAllUsers((prev) => prev.map((u) => {
      if (u.uid === uid || (targetEmail && u.email.toLowerCase() === targetEmail)) {
        return { ...u, ...cleanUpdates, uid: canonicalId };
      }
      return u;
    }));

    if (user && (user.uid === uid || (targetEmail && user.email.toLowerCase() === targetEmail))) {
      const merged = { ...user, ...cleanUpdates, uid: canonicalId };
      setUser(merged);
      localStorage.setItem('sig_active_user', JSON.stringify(merged));
    }

    try {
      await setDoc(doc(db, 'users', canonicalId), cleanUpdates, { merge: true });
      if (canonicalId !== uid) {
        // Also delete old mismatched doc ID if it changed
        await deleteDoc(doc(db, 'users', uid)).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore updateUser note:', e);
    }
  };

  const resetUserPassword = async (uid: string, newPass: string) => {
    await updateUser(uid, { passwordHint: newPass.trim() });
  };

  const updateUserRole = async (uid: string, newRole: UserRole, status?: 'active' | 'pending' | 'inactive') => {
    const updates: Partial<UserProfile> = { role: newRole };
    if (status) updates.status = status;
    await updateUser(uid, updates);
  };

  const deleteUserProfile = async (uid: string) => {
    const targetUser = allUsers.find(u => u.uid === uid || getUserDocId(u.email) === uid);
    const canonicalId = targetUser ? getUserDocId(targetUser.email) : uid;

    setAllUsers((prev) => prev.filter((u) => u.uid !== uid && u.uid !== canonicalId));

    try {
      await deleteDoc(doc(db, 'users', canonicalId));
      if (canonicalId !== uid) {
        await deleteDoc(doc(db, 'users', uid)).catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore deleteUserProfile note:', e);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        allUsers,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginDemo,
        logout,
        createUser,
        updateUser,
        updateUserRole,
        resetUserPassword,
        deleteUserProfile,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


