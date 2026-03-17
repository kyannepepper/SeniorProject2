import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "landlord" | "tenant" | "maintenance";

type AuthContextType = {
  session: Session | null;
  userRole: UserRole | null;
  landlordId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const metaRole = (session.user.user_metadata as { role?: UserRole } | undefined)?.role ?? null;
        if (metaRole) {
          setUserRole(metaRole);
        }
        fetchUserRole(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setUserRole(null);
        setLandlordId(null);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const metaRole = (session.user.user_metadata as { role?: UserRole } | undefined)?.role ?? null;
        if (metaRole) {
          setUserRole(metaRole);
        }
        await fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLandlordId(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId: string) {
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", userId)
      .single();
    // If there's no row/role yet (race with signup insert), keep whatever role we already had.
    if (!user || !user.role) {
      return;
    }
    const role = user.role as UserRole;
    setUserRole(role);
    if (role === "landlord") {
      const { data: landlord } = await supabase
        .from("landlords")
        .select("landlord_id")
        .eq("user_id", userId)
        .single();
      setLandlordId(landlord?.landlord_id ?? null);
    } else {
      setLandlordId(null);
    }
  }

  async function signOut() {
    setSession(null);
    setUserRole(null);
    setLandlordId(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors (e.g. network); local state already cleared
    }
  }

  return (
    <AuthContext.Provider value={{ session, userRole, landlordId, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
