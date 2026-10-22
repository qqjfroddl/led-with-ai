// 신청자에게 보내는 안내 메일 (바로가기·사용법 링크 모음)
// 신청 화면은 한 번 지나가면 다시 찾을 수 없어서, 같은 내용을 신청자 메일함에 남긴다.
// 발송은 소장님 Gmail(matt@deeptactlearning.com) SMTP + 앱 비밀번호로 한다 —
// 보낸편지함에 기록이 남고, 신청자가 답장하면 소장님 받은편지함으로 온다.
import nodemailer from 'nodemailer';

import { escapeHtml } from '../daily-applicant-alert.js';

const DEFAULT_SENDER = 'matt@deeptactlearning.com';
const SENDER_NAME = '박재현 · 인생관리AI앱';

export const GUIDE_LINKS = [
  {
    label: '인생관리AI앱 바로가기',
    url: 'https://led-with-ai.vercel.app/'
  },
  {
    label: '인생관리AI앱 사용법',
    url: 'https://app.notion.com/p/deeptactlearning1/AI-_-2e39a2ce37cc8055a1f0dffb003e7364'
  },
  {
    label: '인생관리 노션 페이지',
    url: 'https://app.notion.com/p/deeptactlearning1/2-0-2ef216c8fb4f499e8a83d42e83b2c078'
  },
  {
    label: '인생관리 바인더 속지 (아날로그)',
    url: 'https://app.notion.com/p/deeptactlearning1/1-0-2d99a2ce37cc80f583e3ffb5a3822f7a'
  }
];

export function readGuideMailConfig(environment) {
  // 구글이 보여주는 16자리는 4자씩 띄어 있다. 띄어쓰기째 저장돼도 되게 지운다
  const password = (environment.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const user = environment.GMAIL_SENDER || DEFAULT_SENDER;
  return { user, password, enabled: password.length === 16 };
}

export function buildGuideEmail(row) {
  const name = (row.name || '').replace(/\s+/g, ' ').trim() || '신청자';
  const email = row.google_email || '';

  const linkItems = GUIDE_LINKS.map(
    (link, index) => `
        <tr><td style="padding:0 0 12px">
          <a href="${link.url}" style="display:block;padding:14px 16px;border:1px solid #e4e7ec;border-radius:10px;color:#1d2939;text-decoration:none">
            <span style="color:#667085;font-size:13px">${index + 1}</span>&nbsp;&nbsp;<strong>${escapeHtml(link.label)}</strong>
          </a>
        </td></tr>`
  ).join('');

  const html = `
    <div style="font-family:Arial,'Noto Sans KR',sans-serif;color:#1d2939;line-height:1.7;max-width:560px;margin:auto;padding:8px;word-break:keep-all">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(name)}님, 신청이 접수됐습니다</h1>
      <p style="margin:0 0 8px">인생관리AI앱에 신청해 주셔서 감사합니다.</p>
      <p style="margin:0 0 24px">신청 화면이 지나가도 이 메일만 있으면 언제든 다시 찾아오실 수 있습니다. 보관해 두세요.</p>
      <table role="presentation" style="width:100%;border-collapse:collapse">${linkItems}
      </table>
      <div style="margin:12px 0 24px;padding:14px 16px;background:#f6f7f9;border-radius:10px;font-size:14px">
        <p style="margin:0 0 4px"><strong>처음 들어가실 때</strong></p>
        <p style="margin:0">1번 바로가기에서 신청하신 구글 계정${email ? `(<strong>${escapeHtml(email)}</strong>)` : ''}으로 로그인하세요.
        로그인 후 승인되면 바로 사용하실 수 있습니다.</p>
      </div>
      <p style="margin:0;color:#475467;font-size:14px">박재현 드림<br>인생관리시스템연구소</p>
    </div>
  `;

  const text = [
    `${name}님, 인생관리AI앱 신청이 접수됐습니다.`,
    '신청 화면이 지나가도 이 메일만 있으면 언제든 다시 찾아오실 수 있습니다.',
    '',
    ...GUIDE_LINKS.map((link, index) => `${index + 1}. ${link.label}\n${link.url}`),
    '',
    `처음 들어가실 때: 1번 바로가기에서 신청하신 구글 계정${email ? `(${email})` : ''}으로 로그인하세요.`,
    '로그인 후 승인되면 바로 사용하실 수 있습니다.',
    '',
    '박재현 드림',
    '인생관리시스템연구소'
  ].join('\n');

  return {
    subject: '[인생관리AI앱] 신청이 접수됐습니다 — 바로가기·사용법 안내',
    html,
    text
  };
}

export function createGuideTransport(config) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: config.user, pass: config.password }
  });
}

export async function sendGuideEmail(config, row, transport = createGuideTransport(config)) {
  const email = buildGuideEmail(row);
  return transport.sendMail({
    from: `"${SENDER_NAME}" <${config.user}>`,
    to: row.google_email,
    subject: email.subject,
    html: email.html,
    text: email.text
  });
}
