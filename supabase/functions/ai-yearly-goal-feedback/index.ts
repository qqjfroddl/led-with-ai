// Supabase Edge Function: AI 연간 목표 피드백 생성
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const PROMPT_VERSION = 'yearly_goal_feedback_v2';

interface RequestBody {
  year: number;
  self_dev: string;
  relationship: string;
  work_finance: string;
}

// CORS 헤더 헬퍼 함수
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

serve(async (req) => {
  try {
    // CORS 헤더
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // 인증 확인
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 사용자 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 승인 사용자 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status, expires_at')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'User not approved' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 만료일 체크
    if (profile.expires_at) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(profile.expires_at);
      if (expiryDate < today) {
        return new Response(
          JSON.stringify({ error: 'User subscription expired' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // 요청 본문 파싱
    const body: RequestBody = await req.json();
    const { year, self_dev, relationship, work_finance } = body;

    if (!year) {
      return new Response(
        JSON.stringify({ error: 'year is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 레이트리밋 확인 (월 2회)
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const { data: counter } = await supabase
      .from('ai_usage_counters')
      .select('count')
      .eq('user_id', user.id)
      .eq('scope', 'yearly_goal_feedback')
      .eq('period_key', monthKey)
      .single();

    const currentCount = counter?.count || 0;
    if (currentCount >= 2) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 2 times per month.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 입력값 검증 (최소 1개 영역에 내용이 있어야 함)
    if (!self_dev && !relationship && !work_finance) {
      return new Response(
        JSON.stringify({ error: 'At least one goal field must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // AI 프롬프트 생성
    const prompt = generateFeedbackPrompt(year, self_dev, relationship, work_finance);

    // Gemini API 호출
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const systemInstruction = '당신은 사용자의 연간 목표를 SMART 기준에 맞춰 개선 제안을 하는 AI 코치입니다. 한국어로 답변하세요. JSON 형식으로만 응답하세요.';

    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json',
      },
    };

    if (GEMINI_MODEL.includes('2.5') || GEMINI_MODEL.includes('2.0')) {
      requestBody.systemInstruction = {
        parts: [
          {
            text: systemInstruction,
          },
        ],
      };
    } else {
      requestBody.contents[0].parts[0].text = `${systemInstruction}\n\n${prompt}`;
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Gemini API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: errorData }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const geminiData = await geminiResponse.json();
    let feedbackText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱 시도
    let feedback: any;
    try {
      // 코드 블록 제거
      feedbackText = feedbackText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      
      // JSON 객체 추출 (더 강력한 정규식 사용)
      const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        feedbackText = jsonMatch[0];
      }
      
      // JSON 파싱
      feedback = JSON.parse(feedbackText);
      
      console.log('[AI Yearly Goal Feedback] Successfully parsed JSON:', Object.keys(feedback));
    } catch (parseError) {
      console.error('[AI Yearly Goal Feedback] JSON parse error:', parseError);
      console.error('[AI Yearly Goal Feedback] Raw response length:', feedbackText.length);
      console.error('[AI Yearly Goal Feedback] Raw response preview (first 1000 chars):', feedbackText.substring(0, 1000));
      console.error('[AI Yearly Goal Feedback] Raw response preview (last 500 chars):', feedbackText.substring(Math.max(0, feedbackText.length - 500)));
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse AI response as JSON',
          details: parseError instanceof Error ? parseError.message : String(parseError)
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 피드백 형식 검증 및 변환
    const formattedFeedback = {
      self_dev: feedback.self_dev || feedback.selfDev || self_dev || '',
      relationship: feedback.relationship || relationship || '',
      work_finance: feedback.work_finance || feedback.workFinance || work_finance || '',
    };

    // 레이트리밋 카운터 증가
    await supabase
      .from('ai_usage_counters')
      .upsert(
        {
          user_id: user.id,
          scope: 'yearly_goal_feedback',
          period_key: monthKey,
          count: currentCount + 1,
        },
        { onConflict: 'user_id,scope,period_key' }
      );

    // 성공 응답 (DB 저장 없이 피드백만 반환)
    return new Response(
      JSON.stringify({
        success: true,
        year,
        feedback: formattedFeedback,
        model: GEMINI_MODEL,
        prompt_version: PROMPT_VERSION,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: errorMessage,
        stack: errorStack,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

/**
 * AI 피드백 프롬프트 생성
 */
function generateFeedbackPrompt(year: number, selfDev: string, relationship: string, workFinance: string) {
  return `사용자가 작성한 ${year}년 연간 목표를 SMART 기준에 맞춰 개선 제안해주세요.

## 사용자가 작성한 연간 목표

### 자기계발
${selfDev || '(작성되지 않음)'}

### 가족/관계
${relationship || '(작성되지 않음)'}

### 업무/재정
${workFinance || '(작성되지 않음)'}

---
## SMART 기준 설명

- **Specific (구체적)**: 모호하지 않고 명확하게 무엇을 할지 정의
- **Measurable (측정 가능)**: 숫자나 기준으로 달성 여부를 측정할 수 있어야 함
- **Achievable (달성 가능)**: 현실적이고 달성 가능한 수준
- **Relevant (관련성)**: 사용자의 상황과 관련성이 있어야 함
- **Time-bound (시간 제한)**: 언제까지 달성할지 명확

## 개선 제안 요구사항

1. **번호 리스트 형식**: 여러 목표가 있을 경우 번호(1., 2., 3. 등)로 구분하고 각 항목을 줄바꿈(\\n)으로 구분. 목표가 하나만 있는 경우에도 번호(1.)를 붙여서 작성.
2. **SMART 기준 충족**: 위 5가지 기준을 모두 잘 충족하도록 개선
3. **원본 의도 유지**: 사용자가 의도한 내용은 최대한 유지하면서 구체화
4. **측정 가능한 수치 포함**: 모호한 표현을 구체적인 숫자나 명확한 기준으로 개선하여 달성 여부를 객관적으로 측정할 수 있도록 작성
5. **반복되는 날짜 표현 제거**: 이는 ${year}년 연간 목표이므로 연도는 이미 명확합니다. "${year}년 12월 말까지", "올해 안에", "12월 말까지" 같은 반복되는 날짜/기간 표현은 모두 제거하고 핵심 목표만 작성하세요.
6. **달성 가능한 수준**: 너무 과도하지 않게 현실적인 목표로 제안
7. **빈 항목 처리**: 작성되지 않은 항목은 그대로 빈 문자열로 반환

## 출력 형식

다음 JSON 형식으로만 응답하세요 (각 필드는 번호 리스트 형식):

{
  "self_dev": "1. 첫 번째 자기계발 목표\n2. 두 번째 자기계발 목표",
  "relationship": "1. 첫 번째 가족/관계 목표",
  "work_finance": "1. 첫 번째 업무/재정 목표\n2. 두 번째 업무/재정 목표"
}

**JSON 형식 주의사항:**
- 각 필드 값은 문자열이며, 여러 목표가 있을 경우 번호(1., 2., 3. 등)로 시작하는 각 목표를 실제 줄바꿈 문자(개행)로 구분하여 작성하세요
- 목표가 하나만 있는 경우에도 번호(1.)로 시작하세요
- JSON 문자열 내에서 줄바꿈은 실제 개행 문자로 작성하되, JSON 형식은 유효해야 합니다
- 반복되는 날짜 표현(예: "${year}년 12월 말까지", "올해 안에")은 절대 포함하지 마세요
- 각 필드는 원본이 작성되지 않은 경우 빈 문자열("")로 반환
- SMART 기준을 모두 충족하도록 개선하되, 날짜/기간 표현은 제외하고 핵심 목표만 작성`;
}
















