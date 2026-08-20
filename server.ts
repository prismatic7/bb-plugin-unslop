// bb-plugin-unslop — anti-slop filtering for BB agent output.
//
// BB has no hook to intercept agent output, so this plugin adds one tool the
// agent can voluntarily call on its own text: `unslop_filter` strips overused
// AI patterns — hedging, filler, corporate affect — and returns the cleaned
// version. It does not filter output automatically.
//
// Also provides a pattern registry in settings for custom slop terms.
import { type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

// ─── Default slop patterns —──────────────────────────────────────────

const DEFAULT_SLOP_PATTERNS = [
  // Hedging / filler
  /(?:I hope this (?:helps|is helpful|finds you well)[!.]?)\s*/gi,
  /(?:I'd be happy to (?:help|assist|clarify)[!.]?)\s*/gi,
  /(?:Please let me know if you (?:have any questions|need anything else|need further assistance)[!.]?)\s*/gi,
  /(?:Feel free to (?:ask|reach out|contact me)[!.]?)\s*/gi,

  // Corporate affect
  /(?:It's important to note that\s*[:,]?\s*)/gi,
  /(?:As an AI language model[,. ])/gi,
  /(?:However, it's (?:important|crucial|essential|worth noting) (?:to note|to mention|to remember|to consider) that\s*[:,]?\s*)/gi,
  /(?:I (?:completely|fully|thoroughly) understand (?:your|the) (?:frustration|concern)[.!]?)\s*/gi,

  // Over-apologizing
  /(?:I apologize for (?:the|any) (?:confusion|inconvenience|misunderstanding)[.!]?)\s*/gi,

  // Redundant sign-offs
  /(?:Happy coding!|Happy building!|Good luck!|Best of luck!)\s*/gi,
  /(?:Let me know if you (?:need|want) (?:anything|help)[.!]?)\s*/gi,
];

// ─── Plugin entry ────────────────────────────────────────────────────

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("bb-plugin-unslop loaded");

  const settings = bb.settings.define({
    customPatterns: {
      type: "string" as const,
      label: "Custom slop patterns (one per line, regex)",
      default: "",
      description: "Additional regex patterns to strip. One per line. Case-insensitive.",
    },
    mode: {
      type: "select" as const,
      label: "Mode",
      options: ["rewrite", "flag_only"],
      default: "rewrite",
      description: "rewrite: removes slop. flag_only: wraps slop in ⚠️ markers.",
    },
  });

  let { customPatterns, mode } = await settings.get();

  // Custom patterns are re-parsed on change so settings apply without reload.
  let custom: RegExp[] = [];
  function parseCustomPatterns(): void {
    const next: RegExp[] = [];
    if (customPatterns) {
      for (const line of customPatterns.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          try {
            next.push(new RegExp(trimmed, "gi"));
          } catch {
            bb.log.info(`[unslop] skipping invalid regex: ${trimmed}`);
          }
        }
      }
    }
    custom = next;
  }
  parseCustomPatterns();

  // Re-read settings on change without a plugin reload.
  settings.onChange((next) => {
    customPatterns = next.customPatterns;
    mode = next.mode;
    parseCustomPatterns();
    bb.log.info(`[unslop] settings updated (mode: ${mode})`);
  });

  function allPatterns(): RegExp[] {
    return [...DEFAULT_SLOP_PATTERNS, ...custom];
  }

  // ── Agent tool: unslop_filter ──────────────────────────────────────

  bb.agents.registerTool({
    name: "unslop_filter",
    description:
      "Strip overused AI patterns (hedging, filler, corporate affect) from text. " +
      "Call this on your own output before sending it, or on text you've read. " +
      "This tool only affects text you explicitly pass to it — it does not filter " +
      "your output automatically. " +
      `Mode: ${mode}.`,
    parameters: z.object({
      text: z
        .string()
        .min(1)
        .describe("The text to clean. Can be a full message, paragraph, or code comment."),
    }),
    async execute({ text }) {
      if (!text) return text;

      let cleaned = text;
      const patterns = allPatterns();

      if (mode === "flag_only") {
        // Wrap matches in ⚠️ markers instead of removing
        for (const pattern of patterns) {
          cleaned = cleaned.replace(pattern, "⚠️$&⚠️");
        }
      } else {
        // Rewrite: remove matches, clean up leftover artifacts
        for (const pattern of patterns) {
          cleaned = cleaned.replace(pattern, "");
        }
        // Clean up double spaces, leading/trailing whitespace, hanging commas
        cleaned = cleaned.replace(/  +/g, " ");
        cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
        cleaned = cleaned.trim();
      }

      return cleaned || "(all content was slop)";
    },
  });

  // ── Cleanup ──────────────────────────────────────────────────────

  bb.onDispose(() => {
    bb.log.info("bb-plugin-unslop disposed");
  });
}
