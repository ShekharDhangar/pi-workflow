// /research-cast — interactive model picker for pi-workflow research agents.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type CastAgent, registerCastCommand } from "./cast-settings.ts";

const RESEARCH_CAST: CastAgent[] = [
  { short: "orchestrator", runtime: "pi-workflow.researcher-orchestrator", label: "Research orchestrator", role: "Requirements", thinking: true },
  { short: "local", runtime: "pi-workflow.pi-researcher-local", label: "pi-researcher-local", role: "Local / repo", thinking: false },
  { short: "web", runtime: "pi-workflow.pi-researcher-web", label: "pi-researcher-web", role: "Web / practitioner", thinking: false },
  { short: "synthesis", runtime: "pi-workflow.pi-researcher-synthesis", label: "pi-researcher-synthesis", role: "Synthesis", thinking: true },
];

export function registerResearchCastCommand(pi: ExtensionAPI): void {
  registerCastCommand(pi, {
    command: "research-cast",
    title: "Research cast",
    subtitle: "orchestrator · local · web · synthesis",
    description: "Configure research cast models (orchestrator, local, web, synthesis)",
    agents: RESEARCH_CAST,
    statusTip: "Tip: /research-cast settings for the interactive picker.",
    templatePath: "templates/research-agent-models.example.json",
  });
}
