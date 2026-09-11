import {
  MmsDataQualityError,
  MmsWorkbookCompatibilityError,
  parseMmsWorkbookFile,
  summarizeMmsImport,
} from "@/core/mms";
import type {
  CanonicalMmsImport,
  MmsImportWorkerRequest,
  MmsImportWorkerResponse,
} from "@/core/mms";
import { calculateHistoricalFinancials } from "@/core/historical";
import type { HistoricalWorkerRequest, HistoricalWorkerResponse } from "@/core/historical";

let activeImport: CanonicalMmsImport | null = null;

function respond(response: MmsImportWorkerResponse | HistoricalWorkerResponse): void {
  self.postMessage(response);
}

function progress(
  requestId: string,
  percentage: number,
  stage: string,
): void {
  respond({
    type: "progress",
    requestId,
    progress: percentage,
    stage,
  });
}

self.addEventListener(
  "message",
  (event: MessageEvent<MmsImportWorkerRequest | HistoricalWorkerRequest>) => {
    const request = event.data;
    if (request.type === "analyze") {
      if (!activeImport) {
        respond({ type: "analysis_failure", requestId: request.requestId, message: "Import the MMS workbook before calculating financial results." });
        return;
      }
      try {
        const report = calculateHistoricalFinancials(activeImport, request.request.master, request.request.from, request.request.through);
        respond({ type: "analysis_success", requestId: request.requestId, report });
      } catch (error) {
        respond({ type: "analysis_failure", requestId: request.requestId, message: error instanceof Error ? error.message : "Historical financial analysis failed." });
      }
      return;
    }

    try {
      progress(request.requestId, 8, "Checking file safety");
      progress(request.requestId, 24, "Reading workbook structure");
      activeImport = parseMmsWorkbookFile({
        buffer: request.file.buffer,
        fileName: request.file.name,
        mimeType: request.file.mimeType,
      });
      progress(request.requestId, 78, "Normalizing production evidence");
      const summary = summarizeMmsImport(activeImport);
      progress(request.requestId, 100, "Import ready for review");
      respond({ type: "success", requestId: request.requestId, summary });
    } catch (error) {
      activeImport = null;
      if (error instanceof MmsDataQualityError) {
        respond({
          type: "failure",
          requestId: request.requestId,
          message: error.message,
          compatibility: error.result.compatibility,
          stats: error.result.stats,
          dataIssues: error.result.dataIssues.slice(0, 100),
        });
        return;
      }
      if (error instanceof MmsWorkbookCompatibilityError) {
        respond({
          type: "failure",
          requestId: request.requestId,
          message: error.message,
          compatibility: error.report,
        });
        return;
      }
      respond({
        type: "failure",
        requestId: request.requestId,
        message:
          error instanceof Error
            ? error.message
            : "The workbook could not be imported.",
      });
    }
  },
);
