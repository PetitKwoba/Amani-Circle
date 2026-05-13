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
  reporter_category_text?: string;
  urgency: ReportUrgency;
  details: string;
  rough_location: string;
  country: string;
  city: string;
  village: string;
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
  reporter_category_text: string | null;
  assigned_category: string;
  assigned_category_label: string | null;
  category_edited_by: string | null;
  category_edited_at: string | null;
  category_edit_note: string | null;
  urgency: ReportUrgency;
  status: ReportStatus;
  rough_location: string;
  country: string;
  city: string | null;
  village: string | null;
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
  responder_public_approved: boolean;
  admin_public_approved: boolean;
  public_approved_at: string | null;
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

export type ContentType = 'article' | 'meeting';
export type ContentStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
export type ContentAssetType = 'image' | 'pdf' | 'video';
export type ContentAssetScanStatus = 'pending' | 'clean' | 'infected' | 'scan_failed';
export type RichTextDocument = {
  type: 'doc';
  content?: RichTextNode[];
};

export type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type PublicContentAsset = {
  id: number;
  content_id?: number;
  asset_type: ContentAssetType;
  original_filename: string;
  mime_type: string;
  file_size: number;
  sha256_hash?: string;
  scan_status?: ContentAssetScanStatus;
  created_at?: string;
  url?: string;
  thumbnail_url?: string | null;
};

export type PublicContent = {
  id: number;
  content_type: ContentType;
  title: string;
  hero_message: string | null;
  summary: string;
  body: string | null;
  body_json: RichTextDocument | null;
  body_text: string | null;
  meeting_starts_at: string | null;
  meeting_location: string | null;
  country: string | null;
  city: string | null;
  village: string | null;
  status: ContentStatus;
  created_by_username: string;
  submitted_at: string | null;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
  admin_review_note: string | null;
  assets: PublicContentAsset[];
  created_at: string;
  updated_at: string;
};

export type PublicContentPayload = {
  content_type: ContentType;
  title: string;
  hero_message?: string;
  summary: string;
  body?: string;
  body_json?: RichTextDocument;
  body_text?: string;
  meeting_starts_at?: string;
  meeting_location?: string;
  country?: string;
  city?: string;
  village?: string;
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function absoluteApiUrl(path: string) {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
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

export function fetchPublicContent(type?: ContentType): Promise<PublicContent[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return request<PublicContent[]>(`/public/content${query}`);
}

export function fetchResponderContent(): Promise<PublicContent[]> {
  return request<PublicContent[]>('/responder/content', { credentials: 'include' });
}

export function createResponderContent(payload: PublicContentPayload): Promise<PublicContent> {
  return request<PublicContent>('/responder/content', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export function updateResponderContent(contentId: number, payload: Partial<PublicContentPayload>): Promise<PublicContent> {
  return request<PublicContent>(`/responder/content/${contentId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export function submitResponderContent(contentId: number): Promise<PublicContent> {
  return request<PublicContent>(`/responder/content/${contentId}/submit`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function uploadResponderContentAsset(contentId: number, file: File): Promise<PublicContentAsset> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/responder/content/${contentId}/assets`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<PublicContentAsset>;
}

export function publicAssetUrl(path: string): string {
  return absoluteApiUrl(path);
}

export function fetchAdminContentReview(): Promise<PublicContent[]> {
  return request<PublicContent[]>('/admin/content/review', { credentials: 'include' });
}

export function reviewAdminContent(
  contentId: number,
  action: 'approve' | 'reject' | 'archive',
  note: string,
): Promise<PublicContent> {
  return request<PublicContent>(`/admin/content/${contentId}/${action}`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ note: note || undefined }),
  });
}

export function updateResponderPublicReview(reportId: number, approved: boolean): Promise<ResponderReport> {
  return request<ResponderReport>(`/responder/reports/${reportId}/public-review`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify({ approved }),
  });
}

export function updateResponderCategory(
  reportId: number,
  payload: {
    assigned_category: string;
    assigned_category_label?: string;
    category_edit_note?: string;
  },
): Promise<ResponderReport> {
  return request<ResponderReport>(`/responder/reports/${reportId}/category`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export function updateAdminPublicApproval(reportId: number, approved: boolean): Promise<ResponderReport> {
  return request<ResponderReport>(`/admin/reports/${reportId}/public-approval`, {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify({ approved }),
  });
}

export type ResponderSessionResponse = {
  authenticated: boolean;
  username?: string | null;
  role?: 'reporter' | 'responder' | 'admin' | null;
  contact_type?: 'email' | 'phone' | null;
  contact?: string | null;
  contact_verified?: boolean;
};

export function loginResponder(username: string, password: string): Promise<ResponderSessionResponse> {
  return request<ResponderSessionResponse>('/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
}

export function logoutResponder(): Promise<ResponderSessionResponse> {
  return request<ResponderSessionResponse>('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export function fetchResponderSession(): Promise<ResponderSessionResponse> {
  return request<ResponderSessionResponse>('/auth/session', { credentials: 'include' });
}

export function signupAccount(payload: {
  contact_type: 'email' | 'phone';
  contact: string;
  username: string;
  password: string;
}): Promise<ResponderSessionResponse> {
  return request<ResponderSessionResponse>('/auth/signup', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export type LocationSearchResult = {
  label: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  village: string | null;
  landmark: string | null;
  provider: string;
  provider_place_id: string;
  missing_fields: string[];
};

export function searchLocations(query: string): Promise<LocationSearchResult[]> {
  return request<LocationSearchResult[]>(`/location/search?q=${encodeURIComponent(query)}`);
}

export type ResponderNotification = {
  id: number;
  report_id: number;
  case_id: string;
  notification_type: 'new_report';
  read_at: string | null;
  created_at: string;
};

export function fetchResponderNotifications(): Promise<ResponderNotification[]> {
  return request<ResponderNotification[]>('/responder/notifications', { credentials: 'include' });
}

export function markResponderNotificationRead(notificationId: number): Promise<ResponderNotification> {
  return request<ResponderNotification>(`/responder/notifications/${notificationId}/read`, {
    method: 'POST',
    credentials: 'include',
  });
}

export type AdminUserSummary = {
  id: number;
  username: string;
  contact_type: 'email' | 'phone';
  contact: string;
  role: 'reporter' | 'responder' | 'admin';
  contact_verified: boolean;
};

export type AreaAssignment = {
  id: number;
  user_id: number;
  scope_type: 'country' | 'city' | 'village';
  country: string;
  city: string | null;
  village: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function fetchAdminUsers(): Promise<AdminUserSummary[]> {
  return request<AdminUserSummary[]>('/admin/users', { credentials: 'include' });
}

export function fetchAreaAssignments(userId: number): Promise<AreaAssignment[]> {
  return request<AreaAssignment[]>(`/admin/responders/${userId}/assignments`, { credentials: 'include' });
}

export function createAreaAssignment(
  userId: number,
  payload: { scope_type: 'country' | 'city' | 'village'; country: string; city?: string; village?: string },
): Promise<AreaAssignment> {
  return request<AreaAssignment>(`/admin/responders/${userId}/assignments`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(payload),
  });
}

export function deleteAreaAssignment(userId: number, assignmentId: number): Promise<void> {
  return request<void>(`/admin/responders/${userId}/assignments/${assignmentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}
