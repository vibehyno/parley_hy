import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicSpeech } from '../lib/public-speech.mjs';

test('interleaved tool events do not repeat an archived prefix of the same message', () => {
  const bubbles = [], streams = [];
  const speech = createPublicSpeech({ onActivity: text => bubbles.push(text), onStream: text => streams.push(text) });
  speech.update('맞아 희영아,', 'a');
  speech.archive();
  speech.update('맞아 희영아, 설정을 확인할게.', 'a');
  assert.equal(streams.at(-1), '설정을 확인할게.');
  speech.archive();
  speech.update('맞아 희영아, 설정을 확인할게.', 'a');
  speech.archive();
  assert.deepEqual(bubbles, ['맞아 희영아,', '설정을 확인할게.']);
  speech.update('수정 결과야.', 'b');
  assert.equal(speech.finalText('수정 결과야.'), '수정 결과야.');
});

test('distinct utterances and corrections remain intact', () => {
  const speech = createPublicSpeech();
  speech.update('응, 확인할게.', 'a'); speech.archive();
  speech.update('응, 확인할게. 다음은 테스트야.', 'b');
  assert.equal(speech.finalText('응, 확인할게. 다음은 테스트야.'), '응, 확인할게. 다음은 테스트야.');
  speech.update('앞 문장을 정정할게.', 'a');
  assert.equal(speech.finalText('앞 문장을 정정할게.'), '앞 문장을 정정할게.');
});

test('final cumulative snapshot retains only the unpublished suffix', () => {
  const speech = createPublicSpeech();
  speech.update('응,', 'a'); speech.archive();
  speech.update('응, 확인했어.', 'a');
  assert.equal(speech.finalText('응, 확인했어.'), '확인했어.');
});
