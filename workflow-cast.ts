// /workflow-cast — interactive model picker for pi-workflow workflow agents.
// Used by /pi-workflow.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type CastAgent, registerCastCommand } from "./cast-settings.ts";

const WORKFLOW_CAST: CastAgent[] = [
  { short: "scout", runtime: "pi-workflow.workflow-scout", label: "Scout", role: "Codebase recon (greenfield/brownfield)", thinking: false },
  { short: "planner", runtime: "pi-workflow.workflow-planner", label: "Planner", role: "Read-only plan + task breakdown", thinking: true, defaultThinking: "medium" },
  { short: "worker", runtime: "pi-workflow.workflow-worker", label: "Worker", role: "Implement tasks", thinking: false },
  { short: "reviewer", runtime: "pi-workflow.workflow-reviewer", label: "Reviewer", role: "Review loop + judgment", thinking: true, defaultThinking: "high" },
  { short: "reflect", runtime: "pi-workflow.workflow-reflect", label: "Reflect", role: "Distill learnings → project skill", thinking: true, defaultThinking: "medium" },
];

export function registerWorkflowCastCommand(pi: ExtensionAPI): void {
  registerCastCommand(pi, {
    command: "workflow-cast",
    title: "Workflow cast",
    subtitle: "Scout · Planner · Worker · Reviewer · Reflect",
    description: "Configure workflow models for /pi-workflow (spec/run)",
    agents: WORKFLOW_CAST,
    statusTip: "Tip: /workflow-cast settings for the interactive picker.",
    templatePath: "templates/workflow-agent-models.example.json",
  });
}
