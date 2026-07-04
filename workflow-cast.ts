// /workflow-cast — interactive model picker for pi-workflow workflow agents.
// Used by /workflow-issue, /workflow-feature, and /pi-workflow.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type CastAgent, registerCastCommand } from "./cast-settings.ts";

const WORKFLOW_CAST: CastAgent[] = [
  { short: "scout", runtime: "scout", label: "Scout", role: "Codebase recon (greenfield/brownfield)", thinking: false },
  { short: "planner", runtime: "planner", label: "Planner", role: "Read-only plan + task breakdown", thinking: true, defaultThinking: "medium" },
  { short: "worker", runtime: "worker", label: "Worker", role: "Implement tasks", thinking: false },
  { short: "reviewer", runtime: "reviewer", label: "Reviewer", role: "Review loop + judgment", thinking: true, defaultThinking: "high" },
  { short: "reflect", runtime: "reflect", label: "Reflect", role: "Distill learnings → project skill (auto/loop)", thinking: true, defaultThinking: "medium" },
];

export function registerWorkflowCastCommand(pi: ExtensionAPI): void {
  registerCastCommand(pi, {
    command: "workflow-cast",
    title: "Workflow cast",
    subtitle: "Scout · Planner · Worker · Reviewer · Reflect",
    description: "Configure workflow models for /workflow-issue, /workflow-feature, and /pi-workflow (spec/run)",
    agents: WORKFLOW_CAST,
    statusTip: "Tip: /workflow-cast settings for the interactive picker.",
    templatePath: "templates/workflow-agent-models.example.json",
  });
}
