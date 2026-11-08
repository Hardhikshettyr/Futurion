import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { getStudentProfile } from "../services/profileApi.js";

const StudentProfileContext = createContext(null);

function StudentProfileProvider({ children }) {
  const { isLoading: isAuthLoading, setUser, user } = useAuth();
  const [profile, setProfileState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshProfile = useCallback(async () => {
    if (!user || user.role !== "student") {
      setProfileState(null);
      return null;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await getStudentProfile();
      setProfileState(result.profile);
      return result.profile;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const setProfile = useCallback(
    (nextProfile) => {
      setProfileState(nextProfile);
      if (nextProfile?.personal.name && nextProfile.personal.name !== user?.name) {
        setUser((current) =>
          current ? { ...current, name: nextProfile.personal.name } : current,
        );
      }
    },
    [setUser, user?.name],
  );

  useEffect(() => {
    if (!isAuthLoading) refreshProfile();
  }, [isAuthLoading, refreshProfile]);

  const value = useMemo(
    () => ({ error, isLoading, profile, refreshProfile, setProfile }),
    [error, isLoading, profile, refreshProfile, setProfile],
  );

  return (
    <StudentProfileContext.Provider value={value}>
      {children}
    </StudentProfileContext.Provider>
  );
}

function useStudentProfile() {
  const context = useContext(StudentProfileContext);
  if (!context) {
    throw new Error("useStudentProfile must be used inside StudentProfileProvider");
  }
  return context;
}

export { StudentProfileProvider, useStudentProfile };
