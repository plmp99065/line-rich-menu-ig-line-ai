import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

const encode = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64');
const hours = encode(readFileSync('src/lib/business-hours.ts', 'utf8'));
const source = readFileSync('worker/spa.ts', 'utf8').replace('"../src/lib/business-hours"', JSON.stringify(hours));
const { saveAiSettings, openAiDraft } = await import(encode(source + '\nexport { saveAiSettings, openAiDraft };'));
let settings = {};
const env = { ADMIN_ACCESS_CODE: 'test-only', OPENAI_API_KEY: 'test-only', DB: { prepare(sql) { let args; return {
  bind(...values) { args = values; return this; },
  async first() { return sql.includes("key = 'ai'") ? { value: JSON.stringify(settings) } : null; },
  async all() { return { results: [] }; },
  async run() { settings = JSON.parse(args[0]); return { meta: { changes: 1 } }; },
}; } } };
const request = body => new Request('https://test/api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Code': 'test-only' }, body: JSON.stringify(body) });
assert.equal((await saveAiSettings(request({ autoReply: true }), env)).status, 400);
assert.equal((await saveAiSettings(request({ autoReply: true, approvedReplyBase: '地址是測試路1號。', replyBaseConfirmed: true }), env)).status, 200);
let calls = 0;
globalThis.fetch = async () => { calls++; return Response.json({ output_text: JSON.stringify({ reply: '地址是測試路1號。', requiresHuman: false }) }); };
assert.equal((await (await openAiDraft(request({ message: '地址在哪', automatic: true }), env)).json()).requiresHuman, false);
assert.equal(calls, 1);
assert.equal((await (await openAiDraft(request({ message: '我要退款', automatic: true }), env)).json()).requiresHuman, true);
assert.equal(calls, 1);
await saveAiSettings(request({ ...settings, autoReply: false }), env);
assert.equal((await (await openAiDraft(request({ message: '地址在哪', automatic: true }), env)).json()).requiresHuman, true);
assert.equal(calls, 1);
settings.autoReply = true;
globalThis.fetch = async () => Response.json({ output_text: 'invalid JSON' });
assert.equal((await (await openAiDraft(request({ message: '地址在哪', automatic: true }), env)).json()).requiresHuman, true);
globalThis.fetch = async () => Response.json({ output_text: JSON.stringify({ reply: '請人工確認', requiresHuman: true }) });
assert.equal((await (await openAiDraft(request({ message: '未核准問題', automatic: true }), env)).json()).requiresHuman, true);
delete env.OPENAI_API_KEY;
assert.equal((await (await openAiDraft(request({ message: '地址在哪', automatic: true }), env)).json()).requiresHuman, true);
console.log('PASS: approval required, approved reply, risk handoff, OFF guard, invalid output, uncertain answer, missing key');
