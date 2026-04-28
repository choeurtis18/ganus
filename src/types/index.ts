export interface User {
  id: string;
  email: string;
  name?: string;
  plan: 'free' | 'pro';
  profile?: UserProfile;
  createdAt: Date;
  deletedAt?: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  jobType: 'internship' | 'cdi' | 'contract' | 'freelance';
  experience?: string;
  skills?: string[];
  location?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  feedback?: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  interviewType: string;
  messages: Message[];
  totalTurns: number;
  averageScore: number;
  summary?: SessionSummary;
  cost: number;
  createdAt: Date;
}

export interface SessionSummary {
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface CVAnalysis {
  id: string;
  userId: string;
  fileName: string;
  analysis: CVAnalysisResult;
  overallScore: number;
  createdAt: Date;
}

export interface CVAnalysisResult {
  structure: number;
  content: number;
  format: number;
  keywords: number;
  impact: number;
  improvements: string[];
}

export interface JobOffer {
  id: string;
  userId: string;
  jobTitle: string;
  company: string;
  location: string;
  jobType: string;
  analysis?: JobOfferAnalysis;
  status: 'saved' | 'applied' | 'interviewing' | 'rejected';
  createdAt: Date;
}

export interface JobOfferAnalysis {
  relevanceScore: number;
  fitScore: number;
  salaryScore: number;
  insights: string[];
}

export interface LLMLog {
  id: string;
  userId: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  flowType?: string;
  createdAt: Date;
}

export interface UserUsage {
  userId: string;
  chatsThisMonth: number;
  cvsThisMonth: number;
  costThisMonth: number;
  totalChats: number;
  totalCVs: number;
  totalCost: number;
}
