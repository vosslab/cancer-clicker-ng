import { formatBigNum } from "../bignum/format.js";
import { TRACKED_RESOURCE_KEYS } from "../types/state.js";
import type { OfflineReplayReport } from "../state/offline.js";

export type OfflineReportDocument = Pick<Document, "createElement">;

/** M5's inert report fragment; gameplay lifecycle owns connection to a live Solid interface. */
export function renderOfflineReport(
  report: OfflineReplayReport,
  document: OfflineReportDocument,
): HTMLElement {
  const section = document.createElement("section");
  section.setAttribute("aria-label", "Offline progress report");
  const heading = document.createElement("h2");
  heading.textContent = "Offline progress";
  section.append(heading);
  const summary = document.createElement("p");
  summary.textContent = `Applied ${report.appliedElapsedMs} ms in ${report.executedSteps} steps.`;
  section.append(summary);
  for (const notice of report.notices) {
    const message = document.createElement("p");
    message.textContent =
      notice.code === "clock-skew"
        ? `Clock skew detected: saved ${notice.savedAtMs}, now ${notice.nowMs}.`
        : `Offline cap applied: ${notice.appliedElapsedMs} of ${notice.requestedElapsedMs} ms.`;
    section.append(message);
  }
  const list = document.createElement("dl");
  for (const key of TRACKED_RESOURCE_KEYS) {
    const entry = report.resources[key];
    const term = document.createElement("dt");
    term.textContent = key;
    const definition = document.createElement("dd");
    definition.textContent = `${formatBigNum(entry.before, "short", 2)} to ${formatBigNum(entry.after, "short", 2)} (${formatBigNum(entry.delta, "short", 2)})`;
    list.append(term, definition);
  }
  section.append(list);
  if (report.pendingProgression.length > 0) {
    const pending = document.createElement("p");
    const identities = report.pendingProgression.map((item) => `${item.kind}: ${item.id}`);
    pending.textContent = `Pending progression decisions: ${identities.join(", ")}.`;
    section.append(pending);
  }
  return section;
}
