// 기존 신청자에게 안내 메일을 한 번 소급 발송한다 (2026-10-22 소장님 결정)
// 신청 즉시 발송이 붙기 전에 신청한 분들은 화면을 지나쳐 링크를 잃었을 수 있다.
//
// 사용법
//   1) 대상 조회: npx supabase db query --linked -o json \
//        "select id,name,google_email,created_at from public.access_requests where guide_sent_at is null order by created_at" > rows.json
//   2) 명단 확인(발송 안 함): node scripts/send-applicant-guide-backfill.mjs rows.json
//   3) 실제 발송:            node scripts/send-applicant-guide-backfill.mjs rows.json --send
//   4) 출력된 sent-ids SQL을 db query로 실행해 guide_sent_at을 채운다 → 다시 돌려도 중복 발송 없음
//
// 앱 비밀번호는 C:\runtime\secrets\led-with-ai_gmail.txt 에서 읽는다(환경변수 GMAIL_APP_PASSWORD가 있으면 그쪽 우선).
import { readFileSync, writeFileSync } from 'node:fs';

import {
  createGuideTransport,
  readGuideMailConfig,
  sendGuideEmail
} from '../api/_lib/applicant-guide-mail.js';

const PASSWORD_FILE = 'C:/runtime/secrets/led-with-ai_gmail.txt';
const SEND_INTERVAL_MS = 1500;

function readRows(path) {
  const parsed = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  // supabase db query -o json 은 { rows: [...] } 또는 배열로 내려준다
  const rows = Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.result ?? [];
  if (!Array.isArray(rows)) throw new Error('행 목록을 찾지 못했습니다');
  return rows;
}

// 같은 주소로 여러 번 신청했으면 가장 최근 신청서 하나에만 보낸다
export function pickTargets(rows) {
  const byEmail = new Map();
  for (const row of rows) {
    if (row.guide_sent_at) continue;
    const email = String(row.google_email || '').trim().toLowerCase();
    if (!email) continue;
    const previous = byEmail.get(email);
    if (!previous || new Date(row.created_at) > new Date(previous.created_at)) {
      byEmail.set(email, { ...row, google_email: email });
    }
  }
  return [...byEmail.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function readPassword() {
  if (process.env.GMAIL_APP_PASSWORD) return process.env.GMAIL_APP_PASSWORD;
  return readFileSync(PASSWORD_FILE, 'utf8').replace(/^\uFEFF/, '');
}

async function main() {
  const [rowsPath, flag] = process.argv.slice(2);
  if (!rowsPath) {
    console.error('사용법: node scripts/send-applicant-guide-backfill.mjs rows.json [--send]');
    process.exit(2);
  }
  const rows = readRows(rowsPath);
  const targets = pickTargets(rows);
  console.log(`조회 ${rows.length}건 → 발송 대상 ${targets.length}명 (주소 기준 중복 제거)`);
  targets.forEach((row, index) => {
    console.log(`${String(index + 1).padStart(3)}. ${row.name} <${row.google_email}> ${row.created_at}`);
  });
  if (flag !== '--send') {
    console.log('\n명단만 확인했습니다. 보내려면 --send 를 붙여 다시 실행합니다.');
    return;
  }

  const config = readGuideMailConfig({ GMAIL_APP_PASSWORD: readPassword() });
  if (!config.enabled) throw new Error('앱 비밀번호가 16자리가 아닙니다');
  const transport = createGuideTransport(config);
  await transport.verify();

  // 신청서 id 전부(중복 신청 포함)를 표시해야 다음 실행에서 다시 잡히지 않는다
  const sentEmails = new Set();
  const failed = [];
  for (const row of targets) {
    try {
      await sendGuideEmail(config, row, transport);
      sentEmails.add(row.google_email);
      console.log(`보냄  ${row.google_email}`);
    } catch (error) {
      failed.push(row.google_email);
      console.error(`실패  ${row.google_email}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS));
  }

  const sentIds = rows
    .filter((row) => !row.guide_sent_at && sentEmails.has(String(row.google_email).trim().toLowerCase()))
    .map((row) => `'${row.id}'`);
  const sqlPath = rowsPath.replace(/\.json$/, '') + '.sent.sql';
  writeFileSync(
    sqlPath,
    sentIds.length
      ? `update public.access_requests set guide_sent_at = now() where guide_sent_at is null and id in (${sentIds.join(',')});\n`
      : '-- 보낸 메일 없음\n'
  );
  console.log(`\n보냄 ${sentEmails.size}명 · 실패 ${failed.length}명 → 표시 SQL: ${sqlPath}`);
  transport.close();
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
