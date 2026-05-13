export type ReportCategory =
  | 'conflict_risk'
  | 'resource_dispute'
  | 'exclusion'
  | 'corruption'
  | 'abuse'
  | 'other';

export type ReportUrgency = 'low' | 'medium' | 'high';

export type ReportDraft = {
  id: string;
  category: ReportCategory | '';
  reporterCategoryText: string;
  urgency: ReportUrgency;
  roughLocation: string;
  country: string;
  city: string;
  village: string;
  roughRegion: string;
  nearbyLandmark: string;
  locationPlaceType: string;
  details: string;
  evidenceNotes: string;
  contactPreference: 'none' | 'if_needed' | 'urgent';
  contactMethod: 'phone' | 'email' | 'trusted_contact' | 'other' | '';
  contactDetails: string;
  exactLocationConsent: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    precision: 'exact';
  } | null;
  updatedAt: string;
};

export type PendingReport = {
  id: string;
  payload: unknown;
  createdAt: string;
  lastAttemptAt?: string;
  attemptCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'sent';
  errorMessage?: string;
};

export type ReportReceipt = {
  id: string;
  caseId: string;
  followUpCode: string;
  sentAt: string;
  status: string;
};

const databaseName = 'amani-circle';
const storeName = 'report-drafts';
const pendingStoreName = 'pending-reports';
const receiptStoreName = 'report-receipts';
const currentDraftId = 'current-report-draft';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(pendingStoreName)) {
        db.createObjectStore(pendingStoreName, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(receiptStoreName)) {
        db.createObjectStore(receiptStoreName, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveReportDraft(draft: Omit<ReportDraft, 'id' | 'updatedAt'>): Promise<ReportDraft> {
  const db = await openDatabase();
  const savedDraft: ReportDraft = {
    ...draft,
    id: currentDraftId,
    updatedAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(savedDraft);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
  return savedDraft;
}

export async function loadReportDraft(): Promise<ReportDraft | null> {
  const db = await openDatabase();

  const draft = await new Promise<ReportDraft | undefined>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(currentDraftId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return draft ?? null;
}

export async function clearReportDraft(): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(currentDraftId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
}

export async function enqueuePendingReport(id: string, payload: unknown): Promise<void> {
  const db = await openDatabase();
  const pendingReport: PendingReport = {
    id,
    payload,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    status: 'pending',
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(pendingStoreName, 'readwrite');
    transaction.objectStore(pendingStoreName).put(pendingReport);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
}

export async function loadPendingReports(): Promise<PendingReport[]> {
  const db = await openDatabase();

  const reports = await new Promise<PendingReport[]>((resolve, reject) => {
    const transaction = db.transaction(pendingStoreName, 'readonly');
    const request = transaction.objectStore(pendingStoreName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return reports.map((report) => ({
    ...report,
    attemptCount: report.attemptCount ?? 0,
    status: report.status ?? 'pending',
  }));
}

export async function updatePendingReport(
  id: string,
  updates: Partial<Omit<PendingReport, 'id' | 'payload' | 'createdAt'>>,
): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(pendingStoreName, 'readwrite');
    const store = transaction.objectStore(pendingStoreName);
    const request = store.get(id);
    request.onsuccess = () => {
      const current = request.result as PendingReport | undefined;
      if (current) {
        store.put({ ...current, ...updates });
      }
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
}

export async function removePendingReport(id: string): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(pendingStoreName, 'readwrite');
    transaction.objectStore(pendingStoreName).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
}

export async function saveReportReceipt(receipt: ReportReceipt): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(receiptStoreName, 'readwrite');
    transaction.objectStore(receiptStoreName).put(receipt);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  db.close();
}

export async function loadReportReceipts(): Promise<ReportReceipt[]> {
  const db = await openDatabase();

  const receipts = await new Promise<ReportReceipt[]>((resolve, reject) => {
    const transaction = db.transaction(receiptStoreName, 'readonly');
    const request = transaction.objectStore(receiptStoreName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return receipts.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

async function clearStore(name: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(name, 'readwrite');
    transaction.objectStore(name).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function clearSensitiveLocalReportState(): Promise<void> {
  await Promise.all([clearReportDraft(), clearStore(pendingStoreName), clearStore(receiptStoreName)]);
}
