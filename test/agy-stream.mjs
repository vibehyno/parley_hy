import test from "node:test";
import assert from "node:assert/strict";
import { createAgyStream } from "../lib/agy-stream.mjs";

test("AGY public steps stream before completion, tool-separated speech becomes activity", () => {
  const streamed = [], activities = [], progress = [];
  const stream = createAgyStream({ onStream: t => streamed.push(t), onActivity: t => activities.push(t), onProgress: p => progress.push(p) });
  const step = (step_index, step_type, text_delta) => stream.accept({ event: "step_update", step_update: { step_index, step_type, text_delta } });
  stream.accept({ event: "init" });
  step(0, "user_input", "user");
  step(1, "agent_response", "파일을 ");
  step(1, "agent_response", "확인해볼게.");
  assert.equal(streamed.at(-1), "파일을 확인해볼게.");
  assert.equal(stream.result, null);
  step(2, "tool_call", "private payload");
  step(2, "tool_call", "private payload");
  step(3, "thinking", "SECRET THOUGHTS");
  step(4, "agent_response", "수정 완료.");
  stream.accept({ event: "result", result: { response: "파일을 확인해볼게.\n수정 완료.", status: "SUCCESS" } });
  assert.deepEqual(activities, ["파일을 확인해볼게."]);
  assert.equal(stream.finalText(stream.result.response), "수정 완료.");
  assert.equal(progress[0].kind, "connected");
  assert.ok(!JSON.stringify([streamed, activities, progress]).includes("SECRET"));
  assert.ok(!JSON.stringify([streamed, activities, progress]).includes("private payload"));
});

test("no guessing or rewriting of result text when structured final step is absent", () => {
  const stream = createAgyStream();
  const text = "확인해볼게. 이 문장은 사용자가 요청한 예문입니다.";
  assert.equal(stream.finalText(text), text);
  stream.accept({ event: "step_update", step_update: { step_index: 1, step_type: "agent_response", text_delta: "partial" } });
  stream.accept({ event: "step_update", step_update: { step_index: 2, step_type: "tool_call" } });
  assert.equal(stream.finalText("authoritative final"), "authoritative final");
});

test("real AGY tool metadata shows file and command details once without leaking other payloads", () => {
  const activities = [];
  const stream = createAgyStream({ onActivity: label => activities.push(label) });
  for (const state of ["ACTIVE", "DONE"]) stream.accept({ event: "step_update", step_update: {
    step_index: 2, step_type: "tool", state, tool_name: "read_file",
    tool_info: { name: "read_file", parameters: { Path: "C:/temp/note1.txt", Content: "PRIVATE BODY" } },
  } });
  stream.accept({ event: "step_update", step_update: { step_index: 3, step_type: "tool", tool_name: "run_command",
    tool_info: { parameters: { CommandLine: 'echo token; api_key="SECRET"' } } } });
  assert.equal(activities[0], "🔧 read_file · C:/temp/note1.txt");
  assert.equal(activities.length, 2);
  assert.match(activities[1], /run_command/);
  assert.ok(!activities.join().includes("PRIVATE BODY"));
  assert.ok(!activities.join().includes("SECRET"));
});
