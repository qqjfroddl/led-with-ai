// 골든 테스트(브라우저): 기간 선택기 연결을 공용 periodSelectorBinding으로 합친 뒤에도
// 옛 Week/Month/YearSelector(git ref)와 같은 클릭 시나리오에서 같은 콜백 값·모달 상태가 나오는가.
// 의도한 차이 1건(화살표 회전)은 run.html이 따로 확인한다.
// 사용: node scripts/test/golden-selector-binding.mjs [git-ref]   — 헤드리스 Edge 필요
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REF = process.argv[2] || process.env.GOLDEN_REF || 'fff65d8';
const TMP = `${ROOT}/src/components/__golden`; // 옛 파일의 '../utils' 상대 경로를 살리려고 src 안에 잠깐 둔다 (.gitignore)
const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 8766;

mkdirSync(TMP, { recursive: true });
for (const k of ['Week', 'Month', 'Year']) {
  const src = execSync(`git show ${REF}:src/components/${k}Selector.js`, { cwd: ROOT, encoding: 'utf8' });
  writeFileSync(`${TMP}/${k}Selector.js`, src.replaceAll("'../utils/", "'../../utils/"));
}
copyFileSync(`${ROOT}/scripts/test/selector-golden/run.html`, `${TMP}/run.html`);

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
let code = 1;
try {
  await new Promise((r) => setTimeout(r, 1500));
  const dom = execSync(`"${EDGE}" --headless=new --disable-gpu --virtual-time-budget=8000 --dump-dom http://127.0.0.1:${PORT}/src/components/__golden/run.html`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const out = (dom.match(/<pre id="out">([\s\S]*?)<\/pre>/) || [])[1] || 'no output';
  console.log(out.replace(/&quot;/g, '"'));
  code = /RESULT fail=0/.test(out) ? 0 : 1;
} finally {
  server.kill();
  rmSync(TMP, { recursive: true, force: true });
}
process.exit(code);
