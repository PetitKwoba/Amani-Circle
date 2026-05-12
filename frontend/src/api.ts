import { ReportCategory, ReportUrgency } from './offline/db';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

export type ContactPreference = 'none' | 'if_needed' | 'urgent';
export type ContactMethod = 'phone' | 'email' | 'trusted_contact' | 'other';
export type ReportStatus = 'received' | 'under_review' | 'referred' | 'needs_more_information' | 'closed';

export type Coordinates = {
  latitude: number;
  longitude: number;
  precision: 'approximate' | 'exact';
};

export type ReportPayload = {
  client_report_id: string;
  follow_up_secret: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  details: string;
  rough_location: string;
  rough_region?: string;
  nearby_landmark?: string;
  location_place_type?: string;
  evidence_notes?: string;
  contact_preference: ContactPreference;
  contact_method?: ContactMethod;
  contact_details?: string;
  exact_location_consent: boolean;
  current_location?: Coordinates;
};

export type ReportSubmissionResponse = {
  case_id: string;
  follow_up_code: string;
  status: ReportStatus;
};

export type CaseStatusResponse = {
  case_id: string;
  status: ReportStatus;
  reporter_message_code: string;
  reporter_message?: string | null;
  updated_at: string;
};

export type ResponderReport = {
  id: number;
  case_id: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  status: ReportStatus;
  rough_location: string;
  rough_region: string | null;
  nearby_landmark: string | null;
  location_place_type: string | null;
  details: string;
  evidence_notes: string | null;
  contact_preference: ContactPreference;
  contact_method: ContactMethod | null;
  contact_details: string | null;
  has_exact_location: boolean;
  exact_latitude: number | null;
  exact_longitude: number | null;
  responder_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicBucket = {
  key: string;
  count: number;
};

export type PublicWeeklyTrend = {
  week_start: string;
  count: number;
};

export type PublicStats = {
  total_reports: number;
  by_category: PublicBucket[];
  by_urgency: PublicBucket[];
  by_status: PublicBucket[];
  by_region: PublicBucket[];
  by_week: PublicWeeklyTrend[];
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: options?.credentials ?? 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function submitReport(payload: ReportPayload): Promise<ReportSubmissionResponse> {
  return request<ReportSubmissionResponse>('/community/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkCaseStatus(caseId: string, followUpCode: string): Promise<CaseStatusResponse> {
  return request<CaseStatusResponse>(`/community/reports/${encodeURIComponent(caseId)}/status`, {
    method: 'POST',
    body: JSON.stringify({ follow_up_code: followUpCode }),
  });
}

export function fetchResponderReports(responderKey: string): Promise<ResponderReport[]> {
  void responderKey;
  return request<ResponderReport[]>('/responder/reports', { credentials: 'include' });
}

export function updateResponderStatus(
  reportId: number,
  status: ReportStatus,
  reporterMessage: string,
  responderKey: string,
): Promise<ResponderReport> {
  void responderKey;
  return request<ResponderReport>(`/responder/reports/${reportId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify({
      status,
      reporter_message: reporterMessage,
    }),
  });
}

export function fetchPublicStats(): Promise<PublicStats> {
  return request<PublicStats>('/public/stats');
}

export type ResponderSessionResponse = {
  authenticated: boolean;
  username?: string | null;
};

export function loginResponder(username: string, password: string): Promise<ResponderSessionResponse> {
  return request<ResponderSessionResponse>('/responder/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
}

export function logoutResponder(): Promise<ResponderSessionResponse> {
  return request<ResponderSessionResponse>('/responder/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export function fetchResponderSession(): Promise<ResponderSessionResponse> {
  return request<ResponderSessionResponse>('/responder/auth/session', { credentials: 'include' });
}
