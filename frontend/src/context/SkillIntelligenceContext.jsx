import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getSkillRecommendations, getStudentSkills } from "../services/skillApi.js";

const SkillIntelligenceContext = createContext(null);

function SkillIntelligenceProvider({ children }) {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [methodology, setMethodology] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshSkillIntelligence = useCallback(async () => {
    if (user?.role !== "student") {
      setOverview(null);
      setRecommendations([]);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const [skillsResult, recommendationResult] = await Promise.all([
        getStudentSkills({ page: 1, limit: 8, sort: "updated_desc" }),
        getSkillRecommendations(),
      ]);
      setOverview({
        items: skillsResult.items,
        summary: skillsResult.summary,
      });
      setRecommendations(recommendationResult.items || []);
      setMethodology(recommendationResult.methodology || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    refreshSkillIntelligence();
  }, [refreshSkillIntelligence]);

  const value = useMemo(() => ({
    error,
    isLoading,
    methodology,
    overview,
    recommendations,
    refreshSkillIntelligence,
    setRecommendations,
  }), [error, isLoading, methodology, overview, recommendations, refreshSkillIntelligence]);

  return <SkillIntelligenceContext.Provider value={value}>{children}</SkillIntelligenceContext.Provider>;
}

function useSkillIntelligence() {
  const context = useContext(SkillIntelligenceContext);
  if (!context) throw new Error("useSkillIntelligence must be used inside SkillIntelligenceProvider");
  return context;
}

export { SkillIntelligenceProvider, useSkillIntelligence };
