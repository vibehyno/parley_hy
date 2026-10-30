#!/usr/bin/env node
/** Minimal Antigravity CLI fixture for the AGY adapter smoke tests. */

const argv = process.argv.slice(2);
if (argv[0] === "models") { console.log("gemini-test\tGemini Test"); process.exit(0); }
const arg = (flag) => {
  const inline = argv.find((value) => String(value).startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
};

const stdin = await new Promise((resolve) => {
  let value = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { value += chunk; });
  process.stdin.on("end", () => resolve(value));
  if (process.stdin.isTTY) resolve("");
});
const streamMode = arg("--input-format") === "stream-json";
let streamMessage = null;
if (streamMode) {
  try { streamMessage = JSON.parse(stdin.trim().split(/\r?\n/)[0] || "{}"); } catch { /* malformed input is an empty prompt */ }
}
const prompt = streamMode ? String(streamMessage?.message?.content || "") : (arg("--print") || arg("-p") || stdin);
const resumed = arg("--conversation");
const conversationId = resumed || (prompt.includes("WORKARGS") ? "fake-agy-work" : "fake-agy-talk");
const usage = prompt.includes("USAGE2")
  ? { input_tokens: 160, output_tokens: 30, thinking_tokens: 8, cache_read_tokens: 20, total_tokens: 198 }
  : { input_tokens: 100, output_tokens: 20, thinking_tokens: 5, cache_read_tokens: 10, total_tokens: 125 };

if (prompt.includes("AGYERROR")) {
  const errorResult = {
    conversation_id: conversationId,
    status: "ERROR",
    response: "",
    error: { message: "fake AGY provider error" },
    usage,
  };
  process.stdout.write(JSON.stringify(streamMode ? { event: "result", result: errorResult } : errorResult) + "\n");
  process.exit(0);
}

let response = "OK";
if (prompt.includes("ROUTE_THREE_EXECUTE")) {
  response = "ROUTE_THREE_COMPLETE";
} else if (prompt.includes("ARGJSON") || prompt.includes("WORKARGS")) {
  // The standing contract contains literal peer mentions. Mask the sigil in
  // this diagnostic dump so the fixture does not accidentally launch hops.
  response = "ARGVJSON " + JSON.stringify(argv.map((value) => String(value).replaceAll("@", "\\u0040")));
} else {
  const say = /SAY:([^\s]+)/.exec(prompt);
  if (say) response = say[1];
}

const finalResult = {
  conversation_id: conversationId,
  status: "SUCCESS",
  response,
  duration_seconds: 0.01,
  num_turns: resumed ? 2 : 1,
  usage,
};
if (prompt.includes("AGYSTREAM")) {
  const emit = value => process.stdout.write(JSON.stringify(value) + "\n");
  emit({ event: "init", conversation_id: conversationId });
  emit({ event: "step_update", step_update: { step_index: 1, step_type: "agent_response", text_delta: "확인해볼게." } });
  await new Promise(resolve => setTimeout(resolve, 200));
  emit({ event: "step_update", step_update: { step_index: 2, step_type: "tool_call" } });
  await new Promise(resolve => setTimeout(resolve, 100));
  emit({ event: "step_update", step_update: { step_index: 3, step_type: "agent_response", text_delta: "확인 완료." } });
  finalResult.response = "확인해볼게.\n확인 완료.";
}
process.stdout.write(JSON.stringify(streamMode ? { event: "result", result: finalResult } : finalResult) + "\n");
