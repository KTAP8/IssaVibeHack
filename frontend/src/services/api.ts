import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ChatMessage {
  role: string;
  message: string;
}

export interface GenerateReplyRequest {
  clientSequence: string;
  chatHistory: ChatMessage[];
}

export interface GenerateReplyResponse {
  aiReply: string;
}

export interface ImproveAiRequest {
  clientSequence: string;
  chatHistory: ChatMessage[];
  consultantReply: string;
}

export interface ImproveAiResponse {
  predictedReply: string;
  updatedPrompt: string;
  changeLog?: string;
}

export interface ManualUpdateRequest {
  instructions: string;
}

export interface ManualUpdateResponse {
  updatedPrompt: string;
  changeLog?: string;
}

export interface RollbackResponse {
    message: string;
    activePrompt: string;
}

export const generateReply = async (data: GenerateReplyRequest) => {
  const response = await api.post<GenerateReplyResponse>('/generate-reply', data);
  return response.data;
};

export const improveAi = async (data: ImproveAiRequest) => {
  const response = await api.post<ImproveAiResponse>('/improve-ai', data);
  return response.data;
};

export const improveAiManually = async (data: ManualUpdateRequest) => {
  const response = await api.post<ManualUpdateResponse>('/improve-ai-manually', data);
  return response.data;
};

export const rollbackSystemPrompt = async (steps: number = 1) => {
    const response = await api.post<RollbackResponse>('/rollback-system-prompt', { steps });
    return response.data;
};

export interface CloneVibeRequest {
  chatLogs: string | any;
}

export interface CloneVibeResponse {
  updatedPrompt: string;
  changeLog?: string;
}

export const cloneVibe = async (data: CloneVibeRequest) => {
  const response = await api.post<CloneVibeResponse>('/clone-vibe', data);
  return response.data;
};

export default api;
