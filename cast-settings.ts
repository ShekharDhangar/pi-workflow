// Shared TUI + settings persistence for /research-cast and /workflow-cast.

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import {
  CONFIG_DIR_NAME,
  DynamicBorder,
  getAgentDir,
  getSelectListTheme,
  getSettingsListTheme,
} from "@earendil-works/pi-coding-agent";
import {
  Container,
  type SelectItem,
  SelectList,
  type SettingItem,
  SettingsList,
  Text,
} from "@earendil-works/pi-tui";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;
export const INHERIT_MODEL = "(inherit default)";

export interface CastAgent {
  short: string;
  runtime: string;
  label: string;
  role: string;
  thinking: boolean;
  defaultThinking?: string;
}

export interface CastCommandConfig {
  command: string;
  title: string;
  subtitle: string;
  description: string;
  agents: CastAgent[];
  statusTip: string;
  templatePath: string;
}

type SaveScope = "user" | "project";

interface AgentOverride {
  model?: string;
  thinking?: string;
}

function getUserSettingsPath(): string {
  return join(getAgentDir(), "settings.json");
}

function getProjectSettingsPath(cwd: string): string {
  return join(cwd, CONFIG_DIR_NAME, "settings.json");
}

function readSettings(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function writeSettings(filePath: string, settings: Record<string, unknown>): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

function getSubagents(settings: Record<string, unknown>): Record<string, unknown> {
  const subagents = settings.subagents;
  if (!subagents || typeof subagents !== "object" || Array.isArray(subagents)) {
    settings.subagents = {};
    return settings.subagents as Record<string, unknown>;
  }
  return subagents as Record<string, unknown>;
}

function getAgentOverrides(settings: Record<string, unknown>): Record<string, AgentOverride> {
  const subagents = getSubagents(settings);
  const raw = subagents.agentOverrides;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    subagents.agentOverrides = {};
    return subagents.agentOverrides as Record<string, AgentOverride>;
  }
  return raw as Record<string, AgentOverride>;
}

function readAgentOverride(settings: Record<string, unknown>, runtime: string): AgentOverride | undefined {
  const overrides = getAgentOverrides(settings);
  const entry = overrides[runtime];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return undefined;
  const out: AgentOverride = {};
  if (typeof entry.model === "string" && entry.model.trim()) out.model = entry.model.trim();
  if (typeof entry.thinking === "string" && entry.thinking.trim()) out.thinking = entry.thinking.trim();
  return Object.keys(out).length ? out : undefined;
}

function effectiveOverride(cwd: string, runtime: string): { override: AgentOverride; scope: SaveScope | "none" } {
  const projectPath = getProjectSettingsPath(cwd);
  const project = existsSync(projectPath) ? readSettings(projectPath) : {};
  const user = readSettings(getUserSettingsPath());
  const projectOv = readAgentOverride(project, runtime);
  if (projectOv) return { override: projectOv, scope: "project" };
  const userOv = readAgentOverride(user, runtime);
  if (userOv) return { override: userOv, scope: "user" };
  return { override: {}, scope: "none" };
}

function defaultSaveScope(cwd: string): SaveScope {
  const projectPath = getProjectSettingsPath(cwd);
  if (existsSync(projectPath)) return "project";
  if (existsSync(join(cwd, CONFIG_DIR_NAME))) return "project";
  return "user";
}

function setAgentOverride(
  filePath: string,
  runtime: string,
  patch: { model?: string | null; thinking?: string | null },
): void {
  const settings = readSettings(filePath);
  const overrides = getAgentOverrides(settings);
  const current = { ...(overrides[runtime] ?? {}) };

  if (patch.model !== undefined) {
    if (patch.model === null || patch.model === INHERIT_MODEL) delete current.model;
    if (patch.model !== null && patch.model !== INHERIT_MODEL) current.model = patch.model;
  }
  if (patch.thinking !== undefined) {
    if (patch.thinking === null) delete current.thinking;
    if (patch.thinking !== null) current.thinking = patch.thinking;
  }

  if (Object.keys(current).length === 0) delete overrides[runtime];
  if (Object.keys(current).length !== 0) overrides[runtime] = current;

  writeSettings(filePath, settings);
}

function modelOptions(ctx: ExtensionCommandContext): string[] {
  const models = ctx.modelRegistry
    .getAvailable()
    .map((m) => `${m.provider}/${m.id}`)
    .sort((a, b) => a.localeCompare(b));
  return [INHERIT_MODEL, ...models];
}

function formatStatusLine(agent: CastAgent, cwd: string): string {
  const { override, scope } = effectiveOverride(cwd, agent.runtime);
  const model = override.model ?? "(inherit)";
  const thinking = agent.thinking ? override.thinking ?? "(inherit)" : null;
  const scopeNote = scope === "none" ? "" : ` [${scope}]`;
  return thinking
    ? `${agent.label} (${agent.short}): ${model} · thinking ${thinking}${scopeNote}`
    : `${agent.label} (${agent.short}): ${model}${scopeNote}`;
}

function requireTui(ctx: ExtensionCommandContext, command: string): boolean {
  if (ctx.mode !== "tui") {
    ctx.ui.notify(`/${command} interactive UI requires TUI mode`, "error");
    return false;
  }
  return true;
}

async function showSelectList(
  ctx: ExtensionCommandContext,
  title: string,
  items: SelectItem[],
): Promise<string | null> {
  return ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
    const container = new Container();
    container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
    container.addChild(new Text(theme.fg("accent", theme.bold(title))));

    const selectList = new SelectList(items, Math.min(items.length, 12), getSelectListTheme());
    selectList.onSelect = (item) => done(item.value);
    selectList.onCancel = () => done(null);
    container.addChild(selectList);
    container.addChild(new Text(theme.fg("dim", "↑↓ navigate • type to filter • enter select • esc cancel")));
    container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));

    return {
      render(width: number) {
        return container.render(width);
      },
      invalidate() {
        container.invalidate();
      },
      handleInput(data: string) {
        selectList.handleInput(data);
        tui.requestRender();
      },
    };
  });
}

function createCastHandlers(config: CastCommandConfig, pi: ExtensionAPI) {
  const agentsByShort = new Map(config.agents.map((a) => [a.short, a]));
  const scopeValue = (scope: SaveScope) =>
    scope === "project" ? "project (.pi/settings.json)" : "user (~/.pi/agent/settings.json)";

  async function pickModelForAgent(
    ctx: ExtensionCommandContext,
    agent: CastAgent,
    modelArg?: string,
  ): Promise<void> {
    const scope = defaultSaveScope(ctx.cwd);
    const settingsPath = scope === "project" ? getProjectSettingsPath(ctx.cwd) : getUserSettingsPath();

    if (modelArg) {
      const value = modelArg === "inherit" || modelArg === INHERIT_MODEL ? null : modelArg;
      setAgentOverride(settingsPath, agent.runtime, { model: value });
      ctx.ui.notify(
        value
          ? `${agent.label} → ${value} (saved to ${settingsPath})`
          : `${agent.label} → inherit default (saved to ${settingsPath})`,
        "info",
      );
      return;
    }

    if (!requireTui(ctx, config.command)) return;

    const models = modelOptions(ctx);
    if (models.length <= 1) {
      ctx.ui.notify("No models in registry — configure providers first", "warning");
      return;
    }

    const { override } = effectiveOverride(ctx.cwd, agent.runtime);
    const current = override.model ?? INHERIT_MODEL;
    const items: SelectItem[] = models.map((m) => ({
      value: m,
      label: m === current ? `${m} (current)` : m,
      description: m === INHERIT_MODEL ? "Use subagents.defaultModel" : undefined,
    }));

    const choice = await showSelectList(ctx, `${agent.label} — pick model`, items);
    if (!choice) return;

    setAgentOverride(settingsPath, agent.runtime, {
      model: choice === INHERIT_MODEL ? null : choice,
    });
    ctx.ui.notify(
      choice === INHERIT_MODEL
        ? `${agent.label} → inherit default (${settingsPath})`
        : `${agent.label} → ${choice} (${settingsPath})`,
      "info",
    );
  }

  async function showSettingsOverlay(ctx: ExtensionCommandContext): Promise<void> {
    if (!requireTui(ctx, config.command)) return;

    const models = modelOptions(ctx);
    if (models.length <= 1) {
      ctx.ui.notify("No models in registry — configure providers first", "warning");
      return;
    }

    let saveScope: SaveScope = defaultSaveScope(ctx.cwd);
    const draft = new Map<string, string>();

    for (const agent of config.agents) {
      const { override } = effectiveOverride(ctx.cwd, agent.runtime);
      draft.set(`${agent.short}:model`, override.model ?? INHERIT_MODEL);
      if (agent.thinking) {
        draft.set(`${agent.short}:thinking`, override.thinking ?? agent.defaultThinking ?? "high");
      }
    }
    draft.set("scope", scopeValue(saveScope));

    const buildItems = (): SettingItem[] => {
      const scopeLabel =
        draft.get("scope") === scopeValue("project")
          ? scopeValue("project")
          : scopeValue("user");
      const rows: SettingItem[] = [
        {
          id: "scope",
          label: "Save to",
          currentValue: scopeLabel,
          values: [scopeValue("user"), scopeValue("project")],
        },
      ];
      for (const agent of config.agents) {
        rows.push({
          id: `${agent.short}:model`,
          label: `${agent.label} model`,
          currentValue: draft.get(`${agent.short}:model`) ?? INHERIT_MODEL,
          values: models,
        });
        if (agent.thinking) {
          rows.push({
            id: `${agent.short}:thinking`,
            label: `${agent.label} thinking`,
            currentValue: draft.get(`${agent.short}:thinking`) ?? agent.defaultThinking ?? "high",
            values: [...THINKING_LEVELS],
          });
        }
      }
      return rows;
    };

    const persistDraft = (): void => {
      saveScope = draft.get("scope")?.startsWith("project") ? "project" : "user";
      const settingsPath = saveScope === "project" ? getProjectSettingsPath(ctx.cwd) : getUserSettingsPath();
      for (const agent of config.agents) {
        const model = draft.get(`${agent.short}:model`) ?? INHERIT_MODEL;
        setAgentOverride(settingsPath, agent.runtime, {
          model: model === INHERIT_MODEL ? null : model,
        });
        if (agent.thinking) {
          const thinking = draft.get(`${agent.short}:thinking`);
          setAgentOverride(settingsPath, agent.runtime, { thinking: thinking ?? null });
        }
      }
    };

    await ctx.ui.custom((tui, theme, _kb, done) => {
      const container = new Container();
      container.addChild(new Text(theme.fg("accent", theme.bold(`${config.title} — model settings`)), 1, 1));
      container.addChild(new Text(theme.fg("muted", config.subtitle), 1, 1));

      const settingsList = new SettingsList(
        buildItems(),
        Math.min(buildItems().length + 2, 16),
        getSettingsListTheme(),
        (id, newValue) => {
          if (id === "scope") draft.set("scope", newValue);
          if (id !== "scope") draft.set(id, newValue);
          persistDraft();
          ctx.ui.notify(`Saved ${id}`, "info");
        },
        () => done(undefined),
        { enableSearch: true },
      );

      container.addChild(settingsList);

      return {
        render(width: number) {
          return container.render(width);
        },
        invalidate() {
          container.invalidate();
        },
        handleInput(data: string) {
          settingsList.handleInput?.(data);
          tui.requestRender();
        },
      };
    });
  }

  async function showSubcommandMenu(ctx: ExtensionCommandContext): Promise<void> {
    if (!requireTui(ctx, config.command)) return;

    const items: SelectItem[] = [
      {
        value: "settings",
        label: "settings",
        description: `Interactive picker for all ${config.agents.length} agents`,
      },
      { value: "status", label: "status", description: "Show current model assignments" },
      ...config.agents.map((a) => ({
        value: a.short,
        label: a.short,
        description: `${a.label} — ${a.role}`,
      })),
      { value: "help", label: "help", description: "Usage and settings paths" },
    ];

    const choice = await showSelectList(ctx, `${config.title} — choose a subcommand`, items);
    if (!choice) return;
    await dispatchSubcommand(ctx, choice, []);
  }

  function showStatus(ctx: ExtensionCommandContext): void {
    const userPath = getUserSettingsPath();
    const projectPath = getProjectSettingsPath(ctx.cwd);
    const lines = [
      `${config.title} — current models`,
      "",
      ...config.agents.map((a) => formatStatusLine(a, ctx.cwd)),
      "",
      `User settings: ${userPath}`,
      `Project settings: ${projectPath}${existsSync(projectPath) ? "" : " (not created yet)"}`,
      "",
      config.statusTip,
    ];
    pi.sendMessage({
      customType: `${config.command}-status`,
      content: lines.join("\n"),
      display: true,
    });
  }

  function showHelp(): void {
    const agentLines = config.agents.map((a) => `/${config.command} ${a.short.padEnd(10)} pick ${a.label} model`);
    pi.sendMessage({
      customType: `${config.command}-help`,
      content: [
        `${config.title} — configure models for ${config.subtitle}`,
        "",
        `/${config.command}              subcommand menu`,
        `/${config.command} settings     interactive model picker`,
        `/${config.command} status       show current assignments`,
        ...agentLines,
        "",
        "Writes subagents.agentOverrides to ~/.pi/agent/settings.json or .pi/settings.json.",
        `Template: ${config.templatePath}`,
      ].join("\n"),
      display: true,
    });
  }

  async function dispatchSubcommand(ctx: ExtensionCommandContext, sub: string, rest: string[]): Promise<void> {
    switch (sub) {
      case "settings":
        await showSettingsOverlay(ctx);
        return;
      case "status":
        showStatus(ctx);
        return;
      case "help":
        showHelp();
        return;
      default: {
        const agent = agentsByShort.get(sub);
        if (!agent) {
          ctx.ui.notify(`Unknown subcommand "${sub}". Try /${config.command} help`, "error");
          return;
        }
        await pickModelForAgent(ctx, agent, rest[0]);
      }
    }
  }

  return { showSubcommandMenu, dispatchSubcommand };
}

export function registerCastCommand(pi: ExtensionAPI, config: CastCommandConfig): void {
  const handlers = createCastHandlers(config, pi);

  pi.registerCommand(config.command, {
    description: config.description,
    getArgumentCompletions: (prefix) => {
      const parts = prefix.split(/\s+/);
      if (parts.length <= 1) {
        const head = parts[0] ?? "";
        return ["settings", "status", "help", ...config.agents.map((a) => a.short)]
          .filter((v) => v.startsWith(head))
          .map((value) => ({ value, label: value }));
      }
      return null;
    },
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) {
        await handlers.showSubcommandMenu(ctx);
        return;
      }
      await handlers.dispatchSubcommand(ctx, parts[0]!.toLowerCase(), parts.slice(1));
    },
  });
}
