import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

const encode = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64');
const hours = encode(readFileSync('src/lib/business-hours.ts', 'utf8'));
const source = readFileSync('worker/spa.ts', 'utf8').replace('"../src/lib/business-hours"', JSON.stringify(hours));
const { saveAiSettings, openAiDraft, readAiSettings } = await import(encode(source + '\nexport { saveAiSettings, openAiDraft, readAiSettings };'));
let settings = {};
const env = { ADMIN_ACCESS_CODE: 'test-only', OPENAI_API_KEY: 'test-only', DB: { prepare(sql) { let args; return {
  bind(...values) { args = values; return this; },
  async first() { return sql.includes("key = 'ai'") ? { value: JSON.stringify(settings) } : null; },
  async all() { return { results: [] }; },
  async run() { settings = JSON.parse(args[0]); return { meta: { changes: 1 } }; },
}; } } };
const request = body => new Request('https://test/api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Code': 'test-only' }, body: JSON.stringify(body) });
settings = { autoReply: true, replyBaseConfirmed: true, approvedReplyBase: '保留既有資料', model: 'gpt-5-mini', tone: '親切', handoffRules: [] };
assert.equal((await readAiSettings(env)).autoReply, false);
assert.equal((await saveAiSettings(request(settings), env)).status, 400);
assert.equal((await saveAiSettings(request({ ...settings, autoReply: false }), env)).status, 200);
assert.equal(settings.autoReply, false);
assert.equal(settings.approvedReplyBase, '保留既有資料');
let calls = 0;
globalThis.fetch = async () => { calls++; return Response.json({ output_text: '人工草稿' }); };
assert.equal((await openAiDraft(request({ message: '你好', automatic: true }), env)).status, 400);
assert.equal(calls, 0);
const draft = await (await openAiDraft(request({ message: '你好' }), env)).json();
assert.equal(draft.draft, '人工草稿');
assert.equal(calls, 1);
const webhook = source.slice(source.indexOf('async function lineWebhook'), source.indexOf('async function sendLineMessage'));
assert.equal(webhook.includes('openAiDraft('), false);
assert.equal(webhook.includes('rich_menu_responses'), true);
assert.equal(webhook.includes('readBusinessHours'), true);
console.log('PASS: legacy auto mode disabled; enable rejected; automatic draft rejected; manual drafts, saved data, menu replies and business hours retained');
