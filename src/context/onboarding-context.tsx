import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/context/auth-context";
import {
  loadOnboarding,
  resumePath as resolveResumePath,
  type LoadedOnboarding,
} from "@/lib/kindred-db";
import { defaultPreferences } from "@/lib/matching/engine";
import type { MatchPreferences } from "@/lib/matching/types";

export type HobbyIntensity = "Casual" | "Regular" | "Passionate";

export type OnboardingState = {
  account: { email: string; password: string; confirmPassword: string };
  basicDetails: { firstName: string; age: string; location: string; gender: string; lookingFor: string };
  /** Who this member wants to meet — never shown on the public profile. */
  preferences: MatchPreferences;
  hobbies: string[];
  hobbyIntensity: Record<string, HobbyIntensity>;
  personalityAnswers: Record<number, number>;
  bio: string;
  photo: string | null;
  onboardingCompleted: boolean;
};

type OnboardingContextValue = {
  state: OnboardingState;
  updateState: (updates: Partial<OnboardingState>) => void;
  /** True while the saved profile is being read from the database. */
  loading: boolean;
  /** True while a step is being saved. */
  saving: boolean;
  loadError: string | null;
  reload: () => void;
  /** Runs a save against the signed-in member; returns false if it failed. */
  persist: (save: (userId: string) => Promise<void>) => Promise<boolean>;
  /** The onboarding step this member should continue from. */
  resumePath: string;
};

const initialState: OnboardingState = {
  account: { email: "", password: "", confirmPassword: "" },
  basicDetails: { firstName: "", age: "", location: "", gender: "", lookingFor: "" },
  preferences: defaultPreferences(),
  hobbies: [],
  hobbyIntensity: {},
  personalityAnswers: {},
  bio: "",
  photo: null,
  onboardingCompleted: false,
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loaded = useRef<LoadedOnboarding | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Only clear saved data that belonged to a previous session; never wipe
      // what a signed-out visitor is currently typing.
      if (loaded.current) {
        loaded.current = null;
        setState(initialState);
      }
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    loadOnboarding(user.id)
      .then((data) => {
        if (!active) return;
        loaded.current = data;
        setState((current) => ({
          ...current,
          basicDetails: data.basicDetails,
          preferences: data.preferences,
          hobbies: data.hobbies,
          hobbyIntensity: data.hobbyIntensity,
          personalityAnswers: data.personalityAnswers,
          bio: data.bio,
          onboardingCompleted: data.onboardingCompleted,
        }));
      })
      .catch(() => {
        if (active) setLoadError("We couldn't load your profile. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading, reloadKey]);

  const persist = useCallback(
    async (save: (userId: string) => Promise<void>) => {
      if (!user) return false;
      setSaving(true);
      try {
        await save(user.id);
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      updateState: (updates) => setState((current) => ({ ...current, ...updates })),
      loading: authLoading || loading,
      saving,
      loadError,
      reload: () => setReloadKey((key) => key + 1),
      persist,
      resumePath: resolveResumePath({
        basicDetails: state.basicDetails,
        preferences: state.preferences,
        hobbies: state.hobbies,
        hobbyIntensity: state.hobbyIntensity,
        personalityAnswers: state.personalityAnswers,
        bio: state.bio,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }),
    [state, authLoading, loading, saving, loadError, persist],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used within OnboardingProvider");
  return context;
}
