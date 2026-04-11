import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const API = {
  // KG
  getGraph: () => api.get("/kg/graph"),
  getRoadmap: () => api.get("/kg/roadmap"),
  getConcept: (id) => api.get(`/kg/concept/${id}`),

  // Learner
  getLearner: (id) => api.get(`/learner/${id}`),
  resetLearner: (id) => api.post(`/learner/${id}/reset`),
  updateMastery: (data) => api.post("/learner/mastery/update", data),

  // Interview
  getQuestions: (cid) => api.get(`/interview/questions/${cid}`),
  evaluate: (data) => api.post("/interview/evaluate", data),

  // Plan
  getPlan: (id) => api.get(`/plan/${id}`),
  getAnalysis: (id) => api.get(`/plan/${id}/analysis`),

  // Explain
  explainChange: (data) => api.post("/explain/change", data),
  explainConcept: (lid, cid) => api.get(`/explain/concept/${lid}/${cid}`),

  // Onboarding
  onboard: (data) => api.post("/learner/onboard", data),
  submitAssessment: (data) => api.post("/learner/assessment/submit", data),
  generateGoals: (data) => api.post("/learner/goals/generate", data),
  acceptGoals: (data) => api.post("/learner/goals/accept", data),

  // Personalized Roadmap
  getPersonalizedRoadmap: (id) =>
    api.get(`/learner/${id}/personalized-roadmap`),
};
