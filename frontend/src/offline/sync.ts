import { ReportPayload, submitReport } from '../api';
import {
  loadPendingReports,
  removePendingReport,
  saveReportReceipt,
  updatePendingReport,
} from './db';

export type SyncResult = {
  syncedCount: number;
  failedCount: number;
};

export async function syncPendingReports(): Promise<SyncResult> {
  if (!navigator.onLine) return { syncedCount: 0, failedCount: 0 };

  const pendingReports = await loadPendingReports();
  let syncedCount = 0;
  let failedCount = 0;

  for (const pendingReport of pendingReports) {
    if (pendingReport.status === 'sent') continue;

    try {
      await updatePendingReport(pendingReport.id, {
        status: 'syncing',
        lastAttemptAt: new Date().toISOString(),
        attemptCount: pendingReport.attemptCount + 1,
        errorMessage: undefined,
      });
      const submission = await submitReport(pendingReport.payload as ReportPayload);
      await saveReportReceipt({
        id: pendingReport.id,
        caseId: submission.case_id,
        followUpCode: (pendingReport.payload as ReportPayload).follow_up_secret,
        sentAt: new Date().toISOString(),
        status: submission.status,
      });
      await removePendingReport(pendingReport.id);
      syncedCount += 1;
    } catch {
      failedCount += 1;
      await updatePendingReport(pendingReport.id, {
        status: 'failed',
        lastAttemptAt: new Date().toISOString(),
        attemptCount: pendingReport.attemptCount + 1,
        errorMessage: 'sync_failed',
      });
      break;
    }
  }

  return { syncedCount, failedCount };
}
