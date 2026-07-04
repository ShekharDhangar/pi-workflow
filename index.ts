// pi-workflow — extension (milestone 1)
//
// Orchestration is PROMPT-DRIVEN (see prompts/*.md), per pi-subagents' own guidance:
// "use orchestration as parent-agent guidance, not as a runtime workflow mode."
// So this extension is deliberately tiny — it only does the three things a prompt CAN'T:
//   1. The Layer-2 guardrail hook (cooperative; enforcement must be code).
//   2. A `set_stage` tool so the workflow prompt can drive the live footer indicator.
//   3. Research artifact hook — blocks synthesizer until angle MD files exist; requires
//      output paths on fan-out tasks; auto-dumps subagent text when files are missing.
//   4. /research-cast + /workflow-cast — interactive model pickers for research/workflow agents.
//
// Install: `pi install npm:@shekhardhangar/pi-workflow`, `pi install git:github.com/ShekharDhangar/pi-workflow`, or `pi install ./`.
// Hook firings are logged to ~/.pi/pi-workflow-hook.log (with pid → proves children inherit it).

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { registerResearchCastCommand } from "./research-cast.ts";
import { registerWorkflowCastCommand } from "./workflow-cast.ts";
import { Type } from "typebox";
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const HOOK_LOG = `${homedir()}/.pi/pi-workflow-hook.log`;

const LOCKFILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json",
  "Cargo.lock", "poetry.lock", "Gemfile.lock", "composer.lock", "go.sum",
]);

// Milestone 1 protects only genuinely-sensitive paths + the rules file. (No .pi/memory yet —
// the compounding loop is milestone 2, which is what kept the control-plane carve-out simple.)
function protectReason(absPath: string): string | null {
  const name = basename(absPath);
  if (name === ".env" || name.startsWith(".env.")) return "secrets file";
  if (LOCKFILES.has(name)) return "dependency lockfile (change deps deliberately, not via edit)";
  if (name === "constitution.md") return "the project's own rules file — agents don't rewrite it";
  return null;
}

// Anti-reward-hack: once the human approves a work item, the orchestrator writes
// .pi/work/<slug>/.frozen . After that, no agent may edit that item's acceptance.sh or its
// fixtures (expected*) — the implementer cannot move its own goalposts. Before .frozen exists, the
// spec-author writes acceptance.sh freely. Cooperative-grade (a worker would have to delete .frozen
// to bypass — egregious and visible in the diff).
function frozenAcceptanceReason(abs: string): string | null {
  const parts = abs.split("/");
  for (let i = 1; i < parts.length - 2; i++) {
    // match …/.pi/work/<slug>/<file> with <file> directly under <slug>
    if (parts[i - 1] === ".pi" && parts[i] === "work" && i + 3 === parts.length) {
      const file = parts[i + 2]!;
      const slugDir = parts.slice(0, i + 2).join("/"); // …/.pi/work/<slug>
      if (!existsSync(join(slugDir, ".frozen"))) continue;
      if (file === "spec.md") {
        return "frozen spec — scope is locked after approval; escalate to the human to change it";
      }
      if (file === "acceptance.sh" || file.startsWith("expected")) {
        return "frozen acceptance — the implementer cannot change the approved test; escalate to the human to change it";
      }
    }
  }
  return null;
}

function logHook(entry: Record<string, unknown>): void {
  try {
    appendFileSync(HOOK_LOG, JSON.stringify({ ts: new Date().toISOString(), pid: process.pid, ...entry }) + "\n");
  } catch { /* logging must never break the agent */ }
}

// ---- Research artifact enforcement (research-coach workflow) ---------------------------
// Prompts say "save angle files before synthesis"; this hook makes that deterministic.

const RESEARCH_ANGLE_OUTPUT = /(?:^|\/)research\/angle-[^/]+\.md$/;
const RESEARCH_BRIEF_OUTPUT = /(?:^|\/)research-brief\.md$/;
const SYNTHESIZER_AGENT = /(?:^|\.)pi-researcher-synthesis$/;
const REQUIREMENTS_AGENT = /(?:^|\.)researcher-orchestrator$/;
const RESEARCH_FANOUT_AGENTS = new Set(["pi-researcher-local", "pi-researcher-web"]);

interface ExpectedAngle {
  agent: string;
  file: string; // relative to slug dir, e.g. research/angle-local-repo.md
}

interface ResearchManifest {
  slug: string;
  angles: ExpectedAngle[];
}

function absFromCwd(cwd: string, p: string): string {
  return isAbsolute(p) ? p : resolve(cwd, p);
}

function extractWorkSlug(text: string): string | null {
  const m = text.match(/\.pi\/work\/([^/\s"'`]+)/);
  return m?.[1] ?? null;
}

function listResearchSlugs(cwd: string): string[] {
  const workRoot = join(cwd, ".pi", "work");
  if (!existsSync(workRoot)) return [];
  return readdirSync(workRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(workRoot, d.name, "research-brief.md")))
    .map((d) => d.name);
}

function listAngleFiles(slugDir: string): string[] {
  const researchDir = join(slugDir, "research");
  if (!existsSync(researchDir)) return [];
  return readdirSync(researchDir).filter((f) => f.startsWith("angle-") && f.endsWith(".md"));
}

function isNonEmptyFile(abs: string): boolean {
  try {
    return statSync(abs).size > 0;
  } catch {
    return false;
  }
}

function manifestPath(slugDir: string): string {
  return join(slugDir, "research", ".expected-angles.json");
}

function readManifest(slugDir: string): ResearchManifest | null {
  const path = manifestPath(slugDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ResearchManifest;
  } catch {
    return null;
  }
}

function writeManifest(slugDir: string, manifest: ResearchManifest): void {
  const dir = join(slugDir, "research");
  mkdirSync(dir, { recursive: true });
  writeFileSync(manifestPath(slugDir), JSON.stringify(manifest, null, 2) + "\n");
}

function mergeManifest(slugDir: string, slug: string, angles: ExpectedAngle[]): void {
  const existing = readManifest(slugDir);
  const byFile = new Map<string, ExpectedAngle>();
  for (const a of existing?.angles ?? []) byFile.set(a.file, a);
  for (const a of angles) byFile.set(a.file, a);
  writeManifest(slugDir, { slug, angles: [...byFile.values()] });
}

function resolveResearchSlug(cwd: string, hints: string[]): { slug: string; slugDir: string } | null {
  for (const hint of hints) {
    const slug = extractWorkSlug(hint);
    if (slug) return { slug, slugDir: join(cwd, ".pi", "work", slug) };
  }
  const slugs = listResearchSlugs(cwd);
  if (slugs.length === 1) {
    const slug = slugs[0]!;
    return { slug, slugDir: join(cwd, ".pi", "work", slug) };
  }
  return null;
}

function collectHintStrings(input: Record<string, unknown>): string[] {
  const hints: string[] = [];
  const push = (v: unknown) => { if (typeof v === "string") hints.push(v); };
  push(input.task);
  push(input.output);
  push(input.cwd);
  if (Array.isArray(input.tasks)) {
    for (const t of input.tasks) {
      if (t && typeof t === "object") {
        const task = t as Record<string, unknown>;
        push(task.task);
        push(task.output);
      }
    }
  }
  if (Array.isArray(input.chain)) {
    for (const step of input.chain) {
      if (step && typeof step === "object") {
        const s = step as Record<string, unknown>;
        push(s.task);
        push(s.output);
      }
    }
  }
  return hints;
}

function normalizeAgentName(agent: string): string {
  const dot = agent.lastIndexOf(".");
  return dot >= 0 ? agent.slice(dot + 1) : agent;
}

function isSynthesizerAgent(agent: string): boolean {
  return SYNTHESIZER_AGENT.test(agent);
}

function isRequirementsAgent(agent: string): boolean {
  return REQUIREMENTS_AGENT.test(agent);
}

function isResearchFanoutAgent(agent: string): boolean {
  return RESEARCH_FANOUT_AGENTS.has(normalizeAgentName(agent));
}

function relativeToSlugDir(absPath: string, slugDir: string): string | null {
  const rel = absPath.startsWith(slugDir + "/") ? absPath.slice(slugDir.length + 1) : null;
  return rel && RESEARCH_ANGLE_OUTPUT.test(rel) ? rel : null;
}

function validateAngleOutputPath(cwd: string, output: unknown, slugHint?: string): { ok: true; rel: string; slugDir: string } | { ok: false; reason: string } {
  if (typeof output !== "string" || !output) {
    return { ok: false, reason: "missing output path — set output to .pi/work/<slug>/research/angle-<name>.md" };
  }
  const abs = absFromCwd(cwd, output);
  const slug = extractWorkSlug(output) ?? slugHint;
  if (!slug) return { ok: false, reason: `output path must live under .pi/work/<slug>/research/angle-<name>.md (got ${output})` };
  const slugDir = join(cwd, ".pi", "work", slug);
  const rel = relativeToSlugDir(abs, slugDir);
  if (!rel) return { ok: false, reason: `output must match research/angle-<name>.md under .pi/work/${slug}/ (got ${output})` };
  return { ok: true, rel, slugDir };
}

function missingAngleFiles(slugDir: string): string[] {
  const manifest = readManifest(slugDir);
  if (manifest?.angles.length) {
    return manifest.angles
      .map((a) => a.file)
      .filter((f) => !isNonEmptyFile(join(slugDir, f)));
  }
  const angles = listAngleFiles(slugDir);
  if (!angles.length) return ["research/angle-*.md (none found)"];
  return angles
    .map((f) => `research/${f}`)
    .filter((f) => !isNonEmptyFile(join(slugDir, f)));
}

function synthesizerPassRequirements(taskText: string): string[] {
  const lower = taskText.toLowerCase();
  const required: string[] = [];
  if (/pass\s*[2-9]|pass2|pass3/.test(lower)) required.push("research-synthesis-pass1.md");
  if (/pass\s*[3-9]|pass3|pass4/.test(lower)) required.push("research-synthesis-pass2.md");
  return required;
}

function checkSynthesizerBlocked(cwd: string, hints: string[], taskText: string): string | null {
  const resolved = resolveResearchSlug(cwd, hints);
  if (!resolved) {
    return "cannot spawn pi-researcher-synthesis — include .pi/work/<slug>/ paths in the task or output so the hook can verify angle files exist";
  }
  const { slug, slugDir } = resolved;
  if (!existsSync(join(slugDir, "research-brief.md"))) {
    return `cannot spawn pi-researcher-synthesis — ${slugDir}/research-brief.md missing (researcher-orchestrator/requirements first)`;
  }
  const missing = missingAngleFiles(slugDir);
  if (missing.length) {
    return `cannot spawn pi-researcher-synthesis — save fan-out outputs before synthesis. Missing in .pi/work/${slug}/: ${missing.join(", ")}`;
  }
  for (const req of synthesizerPassRequirements(taskText)) {
    if (!isNonEmptyFile(join(slugDir, req))) {
      return `cannot spawn pi-researcher-synthesis — ${req} must exist before this pass (write pass 1 first)`;
    }
  }
  return null;
}

function checkResearchFanoutBlocked(cwd: string, input: Record<string, unknown>): string | null {
  const tasks = Array.isArray(input.tasks) ? input.tasks : null;
  const entries: Array<{ agent: string; output: unknown }> = tasks
    ? tasks.filter((t): t is Record<string, unknown> => !!t && typeof t === "object").map((t) => ({
        agent: String(t.agent ?? ""),
        output: t.output,
      }))
    : input.agent && isResearchFanoutAgent(String(input.agent))
      ? [{ agent: String(input.agent), output: input.output }]
      : [];

  const fanout = entries.filter((e) => isResearchFanoutAgent(e.agent));
  if (!fanout.length) return null;

  let slugDir: string | undefined;
  let slug: string | undefined;
  const expected: ExpectedAngle[] = [];

  for (const { agent, output } of fanout) {
    const validated = validateAngleOutputPath(cwd, output, slug);
    if (!validated.ok) {
      return `research fan-out (${normalizeAgentName(agent)}): ${validated.reason}`;
    }
    slugDir = validated.slugDir;
    slug = extractWorkSlug(typeof output === "string" ? output : "") ?? slug;
    expected.push({ agent, file: validated.rel });
  }

  if (slugDir && slug && expected.length) mergeManifest(slugDir, slug, expected);
  return null;
}

function checkRequirementsBlocked(cwd: string, input: Record<string, unknown>): string | null {
  const agent = String(input.agent ?? "");
  if (!isRequirementsAgent(agent)) return null;
  const output = input.output;
  if (typeof output !== "string" || !RESEARCH_BRIEF_OUTPUT.test(output)) {
    return "researcher-orchestrator spawn must set output to .pi/work/<slug>/research-brief.md";
  }
  const slug = extractWorkSlug(output);
  if (!slug) return "researcher-orchestrator output path must include .pi/work/<slug>/research-brief.md";
  return null;
}

function extractSubagentOutputText(content: Array<{ type: string; text?: string }>): string {
  return content.filter((c) => c.type === "text" && c.text).map((c) => c.text!).join("\n");
}

function autoDumpResearchArtifact(cwd: string, absPath: string, body: string): boolean {
  if (!body.trim()) return false;
  try {
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, body.endsWith("\n") ? body : body + "\n");
    logHook({ cwd, autoDump: absPath });
    return true;
  } catch {
    return false;
  }
}

// Run a script deterministically and return its real exit code + (tail of) output.
// This is the whole point of check_acceptance: the VERDICT comes from actually running the
// check, so a model can't hallucinate "PASS" over a failing diff.
function runScript(script: string, cwd: string, timeoutMs = 120_000): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    let out = "";
    const child = spawn("bash", [script], { cwd });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, out: out.slice(-4000) }); });
    child.on("error", (e) => { clearTimeout(timer); resolve({ code: -1, out: String(e) }); });
  });
}

export default function (pi: ExtensionAPI) {
  registerResearchCastCommand(pi);
  registerWorkflowCastCommand(pi);

  // ---- Layer-2 guardrail hook (cooperative; §3.2) -----------------------------------------
  pi.on("tool_call", async (event, ctx) => {
    // Branch isolation: the unattended loop must never push (the one outward, irreversible action).
    // It works on a branch; the human reviews and pushes after gate 3.
    if (isToolCallEventType("bash", event)) {
      const cmd = event.input.command ?? "";
      if (/\bgit\s+push\b/.test(cmd)) {
        logHook({ cwd: ctx.cwd, tool: "bash", path: cmd, blocked: true });
        return { block: true, reason: "pi-workflow: `git push` is human-authorized — the loop works on a branch; review and push after gate 3." };
      }
      return;
    }

    let target: string | undefined;
    if (isToolCallEventType("write", event)) target = event.input.path;
    else if (isToolCallEventType("edit", event)) target = event.input.path;
    if (target === undefined) return;

    const abs = isAbsolute(target) ? target : resolve(ctx.cwd, target);

    // Enforce red-green before freeze: .frozen must not be created until check_acceptance
    // has confirmed a FAIL on the unchanged code (sentinel written by check_acceptance itself).
    if (basename(abs) === ".frozen") {
      const redGreenPath = join(dirname(abs), ".red-green-passed");
      if (!existsSync(redGreenPath)) {
        logHook({ cwd: ctx.cwd, tool: event.toolName, path: abs, blocked: true, reason: "no-red-green" });
        return { block: true, reason: `pi-workflow: ${abs} — cannot freeze before red-green check. Run check_acceptance on unchanged code first and confirm it returns FAIL.` };
      }
    }

    const reason = protectReason(abs) ?? frozenAcceptanceReason(abs);
    logHook({ cwd: ctx.cwd, tool: event.toolName, path: abs, blocked: reason !== null });
    if (reason) return { block: true, reason: `pi-workflow: ${abs} — ${reason}.` };
  });

  // ---- Research artifact hook: MD dumps before synthesis ----------------------------
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "subagent") return;

    const input = event.input;
    const hints = collectHintStrings(input);
    const taskText = [input.task, ...hints].filter((h): h is string => typeof h === "string").join("\n");

    const agent = String(input.agent ?? "");
    if (isSynthesizerAgent(agent)) {
      const block = checkSynthesizerBlocked(ctx.cwd, hints, taskText);
      if (block) {
        logHook({ cwd: ctx.cwd, tool: "subagent", agent, blocked: true, reason: "synthesizer-no-angles" });
        return { block: true, reason: `pi-workflow: ${block}` };
      }
    }

    if (Array.isArray(input.chain)) {
      for (const step of input.chain) {
        if (!step || typeof step !== "object") continue;
        const s = step as Record<string, unknown>;
        const chainAgent = String(s.agent ?? "");
        if (isSynthesizerAgent(chainAgent)) {
          const chainHints = [...hints, String(s.task ?? ""), String(s.output ?? "")];
          const block = checkSynthesizerBlocked(ctx.cwd, chainHints, taskText + "\n" + String(s.task ?? ""));
          if (block) {
            logHook({ cwd: ctx.cwd, tool: "subagent", agent: chainAgent, blocked: true, reason: "synthesizer-no-angles" });
            return { block: true, reason: `pi-workflow: ${block}` };
          }
        }
      }
    }

    const requirementsBlock = checkRequirementsBlocked(ctx.cwd, input);
    if (requirementsBlock) {
      logHook({ cwd: ctx.cwd, tool: "subagent", agent, blocked: true, reason: "researcher-orchestrator-output" });
      return { block: true, reason: `pi-workflow: ${requirementsBlock}` };
    }

    const fanoutBlock = checkResearchFanoutBlocked(ctx.cwd, input);
    if (fanoutBlock) {
      logHook({ cwd: ctx.cwd, tool: "subagent", blocked: true, reason: "research-fanout-output" });
      return { block: true, reason: `pi-workflow: ${fanoutBlock}` };
    }
  });

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "subagent" || event.isError) return;

    const input = event.input;
    const details = event.details as { results?: Array<{ agent?: string; savedOutputPath?: string; finalOutput?: string; output?: string }> } | undefined;
    const results = details?.results ?? [];
    const textFallback = extractSubagentOutputText(event.content as Array<{ type: string; text?: string }>);

    const dumpTargets: Array<{ abs: string; body: string }> = [];

    if (results.length) {
      const tasks = Array.isArray(input.tasks) ? input.tasks as Array<Record<string, unknown>> : null;
      results.forEach((r, i) => {
        const saved = r.savedOutputPath;
        const configured = tasks?.[i]?.output ?? input.output;
        const outputPath = saved ?? (typeof configured === "string" ? configured : undefined);
        if (!outputPath) return;
        const abs = absFromCwd(ctx.cwd, outputPath);
        if (!RESEARCH_ANGLE_OUTPUT.test(abs) && !RESEARCH_BRIEF_OUTPUT.test(abs)) return;
        if (isNonEmptyFile(abs)) return;
        const body = r.finalOutput ?? r.output ?? textFallback;
        if (body.trim()) dumpTargets.push({ abs, body });
      });
    } else {
      const outputPath = typeof input.output === "string" ? input.output : undefined;
      if (outputPath) {
        const abs = absFromCwd(ctx.cwd, outputPath);
        if ((RESEARCH_ANGLE_OUTPUT.test(abs) || RESEARCH_BRIEF_OUTPUT.test(abs)) && !isNonEmptyFile(abs) && textFallback.trim()) {
          dumpTargets.push({ abs, body: textFallback });
        }
      }
    }

    for (const { abs, body } of dumpTargets) autoDumpResearchArtifact(ctx.cwd, abs, body);
  });

  // ---- set_stage tool: prompt-driven footer indicator (§9.1) ------------------------------
  const STAGE_BASES = {
    feature: ["Brainstorm", "Plan", "Implement"],
    issue: ["Spec", "Plan", "Implement"],
    spec: ["Brainstorm", "Spec", "Freeze"],
    run: ["Plan", "Implement", "Review", "Reflect"],
  } as const;

  pi.registerTool({
    name: "set_stage",
    label: "Set workflow stage",
    description:
      "Update the pi-workflow footer to show the current workflow stage. Call set_stage at each " +
      "stage transition. flow: 'feature' (Brainstorm→Plan→Implement), 'issue' (Spec→Plan→Implement), " +
      "'spec' (Brainstorm→Spec→Freeze), or 'run' (Recovery→Plan→Implement→Review→Reflect). " +
      "stage: the current stage name, optionally with sub-progress, e.g. 'Implement · task 6/16'.",
    parameters: Type.Object({
      flow: Type.String({ description: "'feature', 'issue', 'spec', or 'run'" }),
      stage: Type.String({ description: "current stage, e.g. 'Plan' or 'Implement · task 6/16'" }),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const head = params.stage.split("·")[0]!.trim();
      const base =
        params.flow === "run" && head === "Recovery"
          ? ["Recovery", ...STAGE_BASES.run]
          : STAGE_BASES[params.flow] ?? STAGE_BASES.run;
      const line = base.map((s) => (s === head ? `▶${params.stage}` : s)).join(" → ");
      ctx.ui.setStatus("pi-workflow", `pi-workflow ⋮ ${line}`);
      return { content: [{ type: "text", text: `stage set: ${line}` }], details: {} };
    },
  });

  // ---- check_acceptance: the verifier WITH TEETH (deterministic, native) ------------------
  // Runs .pi/work/<slug>/acceptance.sh and returns an AUTHORITATIVE pass/fail from the real exit
  // code. The model reviewer adds judgment on top but CANNOT override this verdict. This is the
  // fix for the run where a model hallucinated "Acceptance: PASS" over a file that failed.
  pi.registerTool({
    name: "check_acceptance",
    label: "Check acceptance (deterministic)",
    description:
      "Run the work item's executable acceptance check (.pi/work/<slug>/acceptance.sh) and return a " +
      "DETERMINISTIC pass/fail from the real exit code + output. This verdict is AUTHORITATIVE — do not " +
      "override it with judgment. Call it during every verify. If acceptance.sh is missing it says so, " +
      "and you must fall back to manual judgment and flag LOW CONFIDENCE at the gate.",
    parameters: Type.Object({ slug: Type.String({ description: "work-item slug under .pi/work/" }) }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const slugDir = join(ctx.cwd, ".pi", "work", params.slug);
      const script = join(slugDir, "acceptance.sh");
      if (!existsSync(script)) {
        return {
          content: [{ type: "text", text: `NO_ACCEPTANCE_SCRIPT at ${script}. No executable acceptance — fall back to judgment and flag LOW CONFIDENCE at the gate.` }],
          details: { pass: null },
        };
      }
      const { code, out } = await runScript(script, ctx.cwd);
      const pass = code === 0;
      const frozen = existsSync(join(slugDir, ".frozen"));

      if (pass) {
        return {
          content: [{ type: "text", text: `ACCEPTANCE PASS (exit ${code}) — AUTHORITATIVE.\n--- real output of acceptance.sh ---\n${out || "(no output)"}` }],
          details: { pass: true, exitCode: code },
        };
      }

      if (!frozen) {
        // Pre-freeze FAIL: write red-green sentinel so the hook allows .frozen to be created.
        const redGreenPath = join(slugDir, ".red-green-passed");
        if (!existsSync(redGreenPath)) {
          try { writeFileSync(redGreenPath, ""); } catch { /* non-fatal */ }
        }
        return {
          content: [{ type: "text", text: `ACCEPTANCE FAIL (exit ${code}) — AUTHORITATIVE. Red-green confirmed ✓ — the test discriminates; you may proceed to freeze.\n--- real output of acceptance.sh ---\n${out || "(no output)"}` }],
          details: { pass: false, exitCode: code, redGreenConfirmed: true },
        };
      }

      // Post-freeze FAIL: track fix rounds and hard-stop at cap.
      const FIX_CAP = 3;
      const fixRoundsPath = join(slugDir, ".fix-rounds");
      let fixRounds = 0;
      try { fixRounds = parseInt(readFileSync(fixRoundsPath, "utf8").trim(), 10) || 0; } catch { /* first round */ }
      fixRounds += 1;
      try { writeFileSync(fixRoundsPath, String(fixRounds)); } catch { /* non-fatal */ }

      if (fixRounds >= FIX_CAP) {
        return {
          content: [{ type: "text", text: `ACCEPTANCE FAIL (exit ${code}) — HARD STOP: fix-rounds cap (${FIX_CAP}) reached on "${params.slug}". Stop the unattended loop and surface to the human. Do not assign another worker round.\n--- real output of acceptance.sh ---\n${out || "(no output)"}` }],
          details: { pass: false, exitCode: code, hardStop: true, fixRounds },
        };
      }

      return {
        content: [{ type: "text", text: `ACCEPTANCE FAIL (exit ${code}) — AUTHORITATIVE. Fix-round ${fixRounds}/${FIX_CAP}.\n--- real output of acceptance.sh ---\n${out || "(no output)"}` }],
        details: { pass: false, exitCode: code, fixRounds },
      };
    },
  });
}
