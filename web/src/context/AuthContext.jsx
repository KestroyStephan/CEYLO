import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userStatus, setUserStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserRole(data.role);
                        setUserStatus(data.status);
                    } else {
                        // Handle case where user exists in Auth but not Firestore (e.g. legacy/error)
                        setUserRole(null);
                        setUserStatus(null);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setUserRole(null);
                    setUserStatus(null);
                }
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserStatus(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        currentUser,
        userRole,
        userStatus,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
