// Compact public tool metadata only; never forward shell scripts, output or reasoning.
const safe = value => {
  const s = String(value || "");
  if (s.length > 64 || /[\r\n]|(?:token|password|secret|authorization|api.?key|bearer)|https?:|[A-Za-z0-9_-]{28,}/i.test(s)) return "";
  return s.replace(/[\x00-\x1f]/g, "");
};
const base = value => safe(String(value || "").split(/[\\/]/).pop());
export function workStatus(name, input = {}, phase = "observed", id = "") {
  if (typeof input === "string") { try { input = JSON.parse(input); } catch { input = {}; } }
  if (!input || typeof input !== "object") input = {};
  let action = "tool", detail = "";
  const n = String(name || "").toLowerCase().split(/[.:]/).pop();
  if (/^(grep|glob|search|search_text|find_by_name|grep_search)$/.test(n)) {
    action = "search"; detail = safe(input.pattern || input.query || input.SearchString || input.Pattern);
  } else if (/^(read|read_file|view_file)$/.test(n)) {
    action = "read"; detail = base(input.file_path || input.path || input.Path || input.AbsolutePath);
  } else if (/^(write|edit|notebookedit|file_change|write_to_file|replace_file_content|multi_replace_file_content|apply_patch)$/.test(n)) {
    action = "edit"; detail = base(input.file_path || input.path || input.TargetFile);
    if (!detail && n === "apply_patch") {
      const files = [...String(input.patch || input.input || "").matchAll(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm)].map(m => base(m[1].trim())).filter(Boolean);
      detail = [...new Set(files)].slice(0, 2).join(", ");
    }
  } else if (n === "exec") {
    // Code-mode wrappers are not executed or parsed as shell commands here.
    action = "command";
  } else if (/^(bash|command_execution|run_command|exec_command|shell|execute)$/.test(n)) {
    action = "command";
    const command = String(input.command || input.CommandLine || input.cmd || "").trim();
    // Only decode simple single commands. Compound scripts use a generic label.
    if (!/[;|&\r\n`]|\$\(/.test(command)) {
      const parts = command.match(/"[^"\r\n]*"|'[^'\r\n]*'|[^\s]+/g) || [];
      const unquote = s => s?.replace(/^['"]|['"]$/g, "");
      const executable = unquote(parts.shift() || "").toLowerCase();
      if (/^(rg|grep|findstr|find)$/.test(executable)) {
        action = "search";
        // Flags with values are ambiguous: omit the detail instead of guessing.
        if (parts.every(p => !p.startsWith('-') && !p.startsWith('/'))) detail = safe(unquote(parts[0]));
        else if (parts[0] === '-n' && parts[1] && !parts[1].startsWith('-')) detail = safe(unquote(parts[1]));
      } else if (/^(cat|type|get-content)$/.test(executable)) {
        action = "read"; if (parts[0] && !parts[0].startsWith('-')) detail = base(unquote(parts[0]));
      } else if (/^(npm|npm.cmd|pnpm|yarn|pytest|vitest)$/.test(executable) && /\b(test|pytest|vitest)\b/.test(command)) action = "test";
    }
  } else if (/browser|playwright/.test(n)) action = "browser";
  return { action, detail, phase, id: String(id || "") };
}
