export function diagnosticText(value) {
  return String(value || "")
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/(Bearer\s+)[\w.\-+/=]+/gi, "$1[redacted]")
    .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password)["']?\s*[:=]\s*["']?)[^\s"',}\r\n]+/gi, "$1[redacted]");
}
