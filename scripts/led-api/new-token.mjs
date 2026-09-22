#!/usr/bin/env node
// 외부 API 토큰 발급 — 원문은 파일에만 쓰고 화면에는 해시만 보여준다.
//   node scripts/led-api/new-token.mjs            → ~/.secrets/led-api-token 생성
//   node scripts/led-api/new-token.mjs --rotate   → 기존 토큰을 새것으로 교체
//   node scripts/led-api/new-token.mjs --hash     → 기존 토큰의 해시만 다시 보기
// 토큰 파일이 있는 기기만 API를 부를 수 있다. 다른 기기에는 파일을 복사한다 (대화창에 붙여넣지 않는다).

import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const file = process.env.LED_API_TOKEN_FILE || join(homedir(), '.secrets', 'led-api-token');
const rotate = process.argv.includes('--rotate');
const hashOnly = process.argv.includes('--hash');

let token;
if (existsSync(file) && !rotate) {
  token = readFileSync(file, 'utf8').trim();
  if (!hashOnly) console.log(`이미 토큰 파일이 있습니다: ${file}\n새로 만들려면 --rotate를 붙이세요. 아래는 기존 토큰의 해시입니다.\n`);
} else if (hashOnly) {
  console.error(`토큰 파일이 없습니다: ${file}`);
  process.exit(1);
} else {
  token = `led_${randomBytes(32).toString('base64url')}`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${token}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(file, 0o600);
  } catch {
    // Windows는 권한 비트가 없어도 사용자 폴더 권한으로 보호된다
  }
  console.log(`새 토큰을 저장했습니다: ${file}${rotate ? '\n⚠️ 교체했으므로 Vercel 해시도 바꾸고 재배포해야 합니다. 다른 기기의 토큰 파일도 새로 복사하세요.' : ''}\n`);
}

console.log('Vercel 환경변수 LED_API_TOKEN_SHA256 에 넣을 값 (해시, 원문 아님):');
console.log(createHash('sha256').update(token, 'utf8').digest('hex'));
