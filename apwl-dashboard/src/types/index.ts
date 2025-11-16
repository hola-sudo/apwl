export interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  apiKey: string;
  workflow: string;
  prompts: string;
  vectorStoreId?: string;
  modelSettings: string;
  status: 'active' | 'inactive';
  embedUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: number;
  agentId: string;
  inputText: string;
  agentOutput?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  processingTime?: number;
  tokensUsed?: number;
  clientIp?: string;
  userAgent?: string;
  referrer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTemplate {
  id: string;
  clientId: string;
  templateType: string;
  fileName: string;
  content: string;
  fileUrl?: string;
  isActive: boolean;
  placeholders: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalClients: number;
  totalAgents: number;
  totalSessions: number;
  successRate: number;
  recentSessions: Session[];
}