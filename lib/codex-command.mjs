export function buildCodexInvocationArgs({ sandbox, fastMode = false, inputDir = null, sessionRef = null, cwd }) {
  const args = ["-c", `service_tier=${JSON.stringify(fastMode ? "fast" : "default")}`, "--sandbox", sandbox];
  if (inputDir) args.push("--add-dir", inputDir);

  if (sessionRef === "--last") args.push("exec", "resume", "--last");
  else if (sessionRef) args.push("exec", "resume", sessionRef);
  else args.push("exec", "-C", cwd);

  return args;
}
