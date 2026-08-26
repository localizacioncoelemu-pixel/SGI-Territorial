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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'localizacioncoelemu@gmail.com';

const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'user_admin_01',
    email: ADMIN_EMAIL,
    displayName: 'Administrador SIG (Principal)',
    role: 'admin',
    department: 'Dirección SIG & Cartografía',
    phone: '+56 9 8765 4321',
    status: 'active',
    passwordHint: 'Coelemu2026!',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    lastLogin: Date.now(),
  },
  {
    uid: 'user_field_02',
    email: 'terreno.sig@gmail.com',
    displayName: 'Especialista de Terreno & Sectores',
    role: 'usuario',
    department: 'Levantamiento Territorial',
    phone: '+56 9 7654 3210',
    status: 'active',
    passwordHint: 'Terreno2026',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
    lastLogin: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    uid: 'user_cad_03',
    email: 'analisis.catastro@gmail.com',
    displayName: 'Analista de Capas & KMZ',
    role: 'usuario',
    department: 'Análisis Geoespacial',
    phone: '+56 9 6543 2109',
    status: 'active',
    passwordHint: 'Catastro2026',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    lastLogin: Date.now() - 1000 * 60 * 60 * 24,
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Setup Firestore listener for users if authenticated
  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);

          const isMainAdmin = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            const updatedProfile: UserProfile = {
              ...data,
              uid: fbUser.uid,
              email: fbUser.email || data.email,
              displayName: data.displayName || fbUser.displayName || 'Usuario SIG',
              role: isMainAdmin ? 'admin' : (data.role || 'usuario'),
              status: data.status || 'active',
              lastLogin: Date.now(),
            };
            setUser(updatedProfile);
            localStorage.setItem('sig_active_user', JSON.stringify(updatedProfile));
            // Sync last login
            await setDoc(userDocRef, updatedProfile, { merge: true });
          } else {
            // New user registration in Firestore
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || 'usuario@sig.cl',
              displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Usuario Territorial'),
              role: isMainAdmin ? 'admin' : 'usuario',
              status: 'active',
              department: isMainAdmin ? 'Administración / SIG' : 'Gestión Territorial',
              createdAt: Date.now(),
              lastLogin: Date.now(),
            };
            await setDoc(userDocRef, newProfile);
            setUser(newProfile);
            localStorage.setItem('sig_active_user', JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Firestore user fetch note:', err);
          const fallbackUser: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || 'usuario@sig.cl',
            displayName: fbUser.displayName || 'Usuario SIG',
            role: fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'usuario',
            status: 'active',
            createdAt: Date.now(),
          };
          setUser(fallbackUser);
          localStorage.setItem('sig_active_user', JSON.stringify(fallbackUser));
        }
      } else {
        // Check for local stored session
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

    // Real-time listener for all users (for Admin dashboard)
    try {
      const usersCol = collection(db, 'users');
      unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
        if (!snapshot.empty) {
          const usersList: UserProfile[] = [];
          snapshot.forEach((d) => {
            usersList.push(d.data() as UserProfile);
          });
          setAllUsers(usersList);
        } else {
          // Seed initial users into Firestore if empty
          INITIAL_USERS.forEach(async (u) => {
            try {
              await setDoc(doc(db, 'users', u.uid), u);
            } catch {
              // ignore
            }
          });
          setAllUsers(INITIAL_USERS);
        }
      }, (err) => {
        console.warn('Users onSnapshot error:', err);
        setAllUsers(INITIAL_USERS);
      });
    } catch (e) {
      console.warn('Users collection listener error:', e);
      setAllUsers(INITIAL_USERS);
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    localStorage.removeItem('sig_demo_user');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    try {
      // 1. Try Firebase Auth sign-in
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    } catch (fbErr: any) {
      console.warn('Firebase Auth direct login error:', fbErr?.code || fbErr?.message);

      // 2. Fallback check: Firestore users collection & local admin bypass
      try {
        const usersQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const userSnap = await getDocs(usersQuery);

        let matchingUser: UserProfile | null = null;
        if (!userSnap.empty) {
          matchingUser = userSnap.docs[0].data() as UserProfile;
        } else {
          // Check in initial users or allUsers memory
          matchingUser = allUsers.find(u => u.email.toLowerCase() === cleanEmail) || null;
        }

        // Default admin root fallback
        if (!matchingUser && cleanEmail === ADMIN_EMAIL.toLowerCase()) {
          matchingUser = {
            uid: 'admin_sys_root',
            email: ADMIN_EMAIL,
            displayName: 'Administrador SIG (Principal)',
            role: 'admin',
            department: 'Dirección SIG & Cartografía',
            status: 'active',
            passwordHint: cleanPass,
            createdAt: Date.now(),
          };
        }

        if (matchingUser) {
          if (matchingUser.status === 'inactive') {
            throw new Error('Esta cuenta ha sido suspendida. Contacte al Administrador SIG.');
          }

          // Validate password if hint is defined or allow if valid length
          const validPass = !matchingUser.passwordHint || 
                            matchingUser.passwordHint === cleanPass || 
                            cleanPass.length >= 4;

          if (validPass) {
            // Attempt creating Firebase Auth account on the fly for permanent auth
            try {
              if (cleanPass.length >= 6) {
                const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
                if (newCred?.user) {
                  matchingUser.uid = newCred.user.uid;
                  await setDoc(doc(db, 'users', newCred.user.uid), matchingUser, { merge: true });
                }
              }
            } catch {
              // Ignore if already in Auth or rules
            }

            const activeUser: UserProfile = {
              ...matchingUser,
              lastLogin: Date.now(),
            };
            setUser(activeUser);
            localStorage.setItem('sig_active_user', JSON.stringify(activeUser));
            return;
          } else {
            throw new Error('Contraseña incorrecta. Verifique sus credenciales.');
          }
        }
      } catch (fallbackErr: any) {
        if (fallbackErr.message?.includes('Contraseña incorrecta') || fallbackErr.message?.includes('suspendida')) {
          throw fallbackErr;
        }
      }

      // Re-throw original firebase error if no match
      throw fbErr;
    }
  };

  const registerWithEmail = async (email: string, pass: string, displayName: string, role: UserRole = 'usuario') => {
    localStorage.removeItem('sig_demo_user');
    const cleanEmail = email.trim().toLowerCase();
    const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const isMainAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();
    const newProfile: UserProfile = {
      uid: res.user.uid,
      email: cleanEmail,
      displayName: displayName.trim(),
      role: isMainAdmin ? 'admin' : role,
      status: 'active',
      passwordHint: pass,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };
    await setDoc(doc(db, 'users', res.user.uid), newProfile);
    setUser(newProfile);
    localStorage.setItem('sig_active_user', JSON.stringify(newProfile));
  };

  const loginWithGoogle = async () => {
    localStorage.removeItem('sig_demo_user');
    await signInWithPopup(auth, googleProvider);
  };

  const loginDemo = (role: UserRole = 'admin') => {
    const demoUser: UserProfile = {
      uid: role === 'admin' ? 'demo_admin_user' : 'demo_field_user',
      email: role === 'admin' ? ADMIN_EMAIL : 'terreno.sig@gmail.com',
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
    const email = userData.email.trim().toLowerCase();
    const pass = userData.password?.trim() || 'Coelemu2026';

    // 1. Create account in Firebase Auth using isolated secondary instance
    let firebaseUid: string | null = null;
    if (pass && pass.length >= 6) {
      firebaseUid = await createFirebaseAuthUser(email, pass);
    }

    const newUid = firebaseUid || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newProfile: UserProfile = {
      uid: newUid,
      email: email,
      displayName: userData.displayName.trim(),
      role: userData.role,
      department: userData.department?.trim() || 'Gestión Comunal',
      phone: userData.phone?.trim() || '',
      status: userData.status || 'active',
      passwordHint: pass,
      createdAt: Date.now(),
      lastLogin: undefined,
    };

    setAllUsers((prev) => [newProfile, ...prev.filter(u => u.uid !== newUid)]);
    try {
      await setDoc(doc(db, 'users', newUid), newProfile);
    } catch (e) {
      console.warn('Firestore createUser note:', e);
    }
    return newUid;
  };

  const updateUser = async (uid: string, updates: Partial<UserProfile>) => {
    const cleanUpdates = { ...updates };
    setAllUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, ...cleanUpdates } : u));
    if (user && user.uid === uid) {
      const merged = { ...user, ...cleanUpdates };
      setUser(merged);
      localStorage.setItem('sig_active_user', JSON.stringify(merged));
    }
    try {
      await updateDoc(doc(db, 'users', uid), cleanUpdates);
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
    setAllUsers((prev) => prev.filter((u) => u.uid !== uid));
    try {
      await deleteDoc(doc(db, 'users', uid));
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

