const { rateLimit } = require("express-rate-limit");

function createAuthRateLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    skip: () => process.env.NODE_ENV === "test",
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        message,
      });
    },
  });
}

const registrationRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many registration attempts. Please try again later.",
});

const verificationRateLimiter = createAuthRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  message: "Too many verification attempts. Please try again later.",
});

const resendRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many resend requests. Please try again later.",
});

const loginRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many sign-in attempts. Please try again later.",
});

const passwordRecoveryRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many password recovery attempts. Please try again later.",
});

const sensitiveActionRateLimiter = createAuthRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  message: "Too many account security requests. Please try again later.",
});

const resumeParsingRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many resume parsing requests. Please try again later.",
});

const profileUploadRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: "Too many profile uploads. Please try again later.",
});

const skillAiGenerationRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many AI Skill Intelligence requests. Please try again later.",
});

const skillCoachRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many Skill Gap Coach messages. Please try again later.",
});

const careerAiRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many AI Career Explorer requests. Please try again later.",
});

const careerDecisionAiRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many AI decision-workspace requests. Please try again later.",
});

const learningAiRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many AI learning-assistant requests. Please try again later.",
});

const roadmapAiRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many AI roadmap-assistant requests. Please try again later.",
});

const opportunityAiRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many AI opportunity-assistant requests. Please try again later.",
});

const progressAiRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many AI progress-assistant requests. Please try again later.",
});

module.exports = {
  careerAiRateLimiter,
  careerDecisionAiRateLimiter,
  learningAiRateLimiter,
  roadmapAiRateLimiter,
  opportunityAiRateLimiter,
  progressAiRateLimiter,
  createAuthRateLimiter,
  loginRateLimiter,
  passwordRecoveryRateLimiter,
  profileUploadRateLimiter,
  registrationRateLimiter,
  resumeParsingRateLimiter,
  resendRateLimiter,
  sensitiveActionRateLimiter,
  skillAiGenerationRateLimiter,
  skillCoachRateLimiter,
  verificationRateLimiter,
};
