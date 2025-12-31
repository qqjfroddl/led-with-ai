// Supabase Edge Function: AI 월실천계획 제안 생성
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const PROMPT_VERSION = 'monthly_plan_v8';

interface RequestBody {
  month_start: string;
  linked_year: number;
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
      .select('status, timezone, expires_at')
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
    const { month_start, linked_year } = body;

    if (!month_start) {
      return new Response(
        JSON.stringify({ error: 'month_start is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!linked_year) {
      return new Response(
        JSON.stringify({ error: 'linked_year is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 월 종료일 계산
    const monthStartDate = new Date(month_start);
    const monthEndDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0);
    const month_end = monthEndDate.toISOString().split('T')[0];
    const totalDays = monthEndDate.getDate();

    // 연간목표 조회
    const { data: yearlyGoals, error: yearlyGoalsError } = await supabase
      .from('yearly_goals')
      .select('self_dev, relationship, work_finance')
      .eq('user_id', user.id)
      .eq('year', linked_year)
      .single();

    if (yearlyGoalsError || !yearlyGoals) {
      return new Response(
        JSON.stringify({ error: 'Yearly goals not found for the specified year' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 기존 monthly_plans 레코드 조회 (daily_routines, results_content 유지용)
    const { data: existingPlan } = await supabase
      .from('monthly_plans')
      .select('daily_routines, results_content')
      .eq('user_id', user.id)
      .eq('month_start', month_start)
      .eq('source', 'ai_suggested')
      .maybeSingle();

    // 지난달 monthly_plans 조회 (plan_content, results_content 포함)
    const previousMonthPlan = await collectPreviousMonthPlan(supabase, user.id, month_start);

    // 최근 4주 요약 수집
    const recentWeeksSummary = await collectRecentWeeksSummary(supabase, user.id, month_start);

    // AI 프롬프트 생성 (지난달 데이터 포함)
    const prompt = generatePlanPrompt(yearlyGoals, recentWeeksSummary, previousMonthPlan, linked_year, month_start, month_end, totalDays);

    // Gemini API 호출
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const systemInstruction = '당신은 사용자의 연간 목표(결과 목표)를 달성하기 위한 이번 달 핵심 행동 계획을 제안하는 AI 코치입니다. 한국어로 답변하세요. JSON 형식으로만 응답하세요.';

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
        maxOutputTokens: 8000,
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
    let planContentText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱 시도 (다양한 형식 처리)
    let planContent: any;
    try {
      // 1. 코드 블록 제거 (```json ... ``` 또는 ``` ... ``` 형태, 대소문자 무시)
      planContentText = planContentText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      
      // 2. JSON 객체 추출 (정규식으로 { ... } 부분만 추출)
      const jsonMatch = planContentText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planContentText = jsonMatch[0];
      }
      
      // 3. JSON 파싱
      planContent = JSON.parse(planContentText);
      
      console.log('[AI Monthly Plan] Successfully parsed JSON:', Object.keys(planContent));
    } catch (parseError) {
      console.error('[AI Monthly Plan] JSON parse error:', parseError);
      console.error('[AI Monthly Plan] Raw response length:', planContentText.length);
      console.error('[AI Monthly Plan] Raw response preview (first 500 chars):', planContentText.substring(0, 500));
      console.error('[AI Monthly Plan] Raw response preview (last 500 chars):', planContentText.substring(Math.max(0, planContentText.length - 500)));
      
      // 파싱 실패 시에도 부분적으로 처리 시도 (fallback)
      // 빈 객체로라도 저장하여 사용자에게 알림
      planContent = {
        self_dev: 'JSON 파싱 오류가 발생했습니다. 다시 시도해주세요.',
        relationship: '',
        work_finance: '',
      };
      
      // 에러 정보를 로그에 남기고 계속 진행 (DB에는 저장하되 에러 정보 포함)
      console.error('[AI Monthly Plan] Using fallback empty content due to parse error');
    }

    // plan_content 형식 검증 및 변환
    const formattedPlanContent = {
      self_dev: planContent.self_dev || planContent.selfDev || '',
      relationship: planContent.relationship || '',
      work_finance: planContent.work_finance || planContent.workFinance || '',
    };

    // DB에 저장 (upsert) - 기존 daily_routines, results_content 유지
    const upsertData: any = {
      user_id: user.id,
      month_start,
      linked_year,
      source: 'ai_suggested',
      status: 'draft',
      plan_content: formattedPlanContent,
      model: GEMINI_MODEL,
      prompt_version: PROMPT_VERSION,
    };

    // 기존 데이터 유지
    if (existingPlan) {
      if (existingPlan.daily_routines) {
        upsertData.daily_routines = existingPlan.daily_routines;
      }
      if (existingPlan.results_content) {
        upsertData.results_content = existingPlan.results_content;
      }
    } else {
      // 없으면 기본값
      upsertData.daily_routines = { morning: [], night: [] };
      upsertData.results_content = { self_dev: '', relationship: '', work_finance: '' };
    }

    const { error: saveError } = await supabase
      .from('monthly_plans')
      .upsert(upsertData, {
        onConflict: 'user_id,month_start,source',
      });

    if (saveError) {
      console.error('Error saving monthly plan:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save monthly plan', details: saveError }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 사용량 카운터 증가 (통계용, 제한 없음)
    const monthKey = `${monthStartDate.getFullYear()}-${String(monthStartDate.getMonth() + 1).padStart(2, '0')}`;
    const { data: counter } = await supabase
      .from('ai_usage_counters')
      .select('count')
      .eq('user_id', user.id)
      .eq('scope', 'monthly_plan')
      .eq('period_key', monthKey)
      .maybeSingle();

    const currentCount = counter?.count || 0;
    await supabase
      .from('ai_usage_counters')
      .upsert(
        {
          user_id: user.id,
          scope: 'monthly_plan',
          period_key: monthKey,
          count: currentCount + 1,
        },
        { onConflict: 'user_id,scope,period_key' }
      );

    // 성공 응답
    return new Response(
      JSON.stringify({
        success: true,
        month_start,
        plan_content: formattedPlanContent,
        linked_year,
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
 * 최근 4주 요약 수집
 */
async function collectRecentWeeksSummary(supabase: any, userId: string, monthStart: string) {
  // 대상 월 이전 4주 기간 계산
  const monthStartDate = new Date(monthStart);
  const fourWeeksAgo = new Date(monthStartDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // 약 4주 전
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];
  const monthStartStr = monthStartDate.toISOString().split('T')[0];

  // 할일 통계
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fourWeeksAgoStr)
    .lt('date', monthStartStr)
    .is('deleted_at', null);

  const totalTodos = todos?.length || 0;
  const completedTodos = todos?.filter((t: any) => t.is_done).length || 0;
  const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  // 루틴 통계 (간단하게 체크 수만 조회)
  const { data: routineLogs } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fourWeeksAgoStr)
    .lt('date', monthStartStr)
    .eq('checked', true);

  // 성찰 통계
  const { data: reflections } = await supabase
    .from('daily_reflections')
    .select('date')
    .eq('user_id', userId)
    .gte('date', fourWeeksAgoStr)
    .lt('date', monthStartStr);

  return {
    todos: {
      total: totalTodos,
      completed: completedTodos,
      completionRate: Math.round(completionRate * 10) / 10,
    },
    routines: {
      totalChecks: routineLogs?.length || 0,
    },
    reflections: {
      writtenDays: reflections?.length || 0,
    },
  };
}

/**
 * 지난달 monthly_plans 조회
 */
async function collectPreviousMonthPlan(supabase: any, userId: string, monthStart: string) {
  const monthStartDate = new Date(monthStart);
  const previousMonthStart = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() - 1, 1);
  const previousMonthStartStr = previousMonthStart.toISOString().split('T')[0].substring(0, 7) + '-01';

  // manual 우선 조회, 없으면 ai_suggested 조회
  let { data } = await supabase
    .from('monthly_plans')
    .select('plan_content, results_content')
    .eq('user_id', userId)
    .eq('month_start', previousMonthStartStr)
    .eq('source', 'manual')
    .maybeSingle();

  if (!data) {
    const { data: aiData } = await supabase
      .from('monthly_plans')
      .select('plan_content, results_content')
      .eq('user_id', userId)
      .eq('month_start', previousMonthStartStr)
      .eq('source', 'ai_suggested')
      .maybeSingle();
    data = aiData || null;
  }

  return data || null;
}

/**
 * AI 프롬프트 생성
 */
function generatePlanPrompt(
  yearlyGoals: any,
  recentWeeksSummary: any,
  previousMonthPlan: any,
  linkedYear: number,
  monthStart: string,
  monthEnd: string,
  totalDays: number
) {
  const monthLabel = `${monthStart.substring(0, 4)}년 ${parseInt(monthStart.substring(5, 7))}월`;
  const monthStartDate = new Date(monthStart);
  const previousMonthStart = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() - 1, 1);
  const previousMonthLabel = `${previousMonthStart.getFullYear()}년 ${previousMonthStart.getMonth() + 1}월`;

  // 지난달 목표/결과 텍스트 생성
  let previousMonthText = '';
  if (previousMonthPlan) {
    const prevPlan = previousMonthPlan.plan_content || {};
    const prevResults = previousMonthPlan.results_content || {};
    
    previousMonthText = `
## 지난달(${previousMonthLabel}) 실천계획 및 결과 (참고용)

### 지난달 실천계획
- 자기계발: ${prevPlan.self_dev || '없음'}
- 관계: ${prevPlan.relationship || '없음'}
- 업무/재정: ${prevPlan.work_finance || '없음'}

### 지난달 결과
- 자기계발: ${prevResults.self_dev || '없음'}
- 관계: ${prevResults.relationship || '없음'}
- 업무/재정: ${prevResults.work_finance || '없음'}
`;
  } else {
    previousMonthText = '\n## 지난달 실천계획 및 결과: 없음\n';
  }

  // 최근 활동 요약 텍스트
  const activityText = `
## 최근 4주 활동 요약 (참고용)
- 할일: 전체 ${recentWeeksSummary.todos.total}개, 완료 ${recentWeeksSummary.todos.completed}개 (완료율 ${recentWeeksSummary.todos.completionRate}%)
- 루틴 체크: ${recentWeeksSummary.routines.totalChecks}회
- 성찰 작성: ${recentWeeksSummary.reflections.writtenDays}일
`;

  return `연간목표는 '결과목표'입니다. 이를 달성하기 위해 ${monthLabel}에 반드시 실행해야 할 '월실천계획(행동계획)'을 추천해주세요.

## 사용자의 ${linkedYear}년 연간 목표

### 자기계발
${yearlyGoals.self_dev || '목표가 설정되지 않았습니다.'}

### 가족/관계
${yearlyGoals.relationship || '목표가 설정되지 않았습니다.'}

### 업무/재정
${yearlyGoals.work_finance || '목표가 설정되지 않았습니다.'}
${previousMonthText}
${activityText}
---

## 조건

1. 연간목표의 모든 항목을 빠짐없이 다룰 것
   - 각 연간목표마다 정확히 1개의 핵심 행동만 제안
   - 여러 개 제안 금지

2. 행동은 한 줄로 간결하게 작성할 것
   - 측정 가능하고 구체적이되, 설명은 최소화
   - 예: "매주 월/수/금 저녁 7시 30분 운동", "주말 아침 1시간 독서"
   
3. 형식: "[연간목표 요약] → [구체적 행동 1줄]"
   - 화살표(→)로 연결
   - 각 항목은 줄바꿈으로 구분

4. 일반 텍스트로 작성 (마크다운 형식 사용 금지)

5. 연간목표와 지난달 결과, 최근 활동을 고려하여 가장 효과적인 행동 1개만 선택

## 출력 형식

다음 JSON 형식으로만 응답하세요:

{
  "self_dev": "1. [목표1 전체 텍스트]\\n→ [행동]\\n\\n2. [목표2 전체 텍스트]\\n→ [행동]\\n\\n3. [목표3 전체 텍스트]\\n→ [행동]",
  "relationship": "1. [목표1 전체 텍스트]\\n→ [행동]\\n\\n2. [목표2 전체 텍스트]\\n→ [행동]",
  "work_finance": "1. [목표1 전체 텍스트]\\n→ [행동]\\n\\n2. [목표2 전체 텍스트]\\n→ [행동]"
}

주의사항:
- 각 영역의 첫 번째 목표는 "1."부터 시작
- "1. 자기계발", "2. 가족/관계" 같은 영역 제목은 절대 포함하지 말 것
- 연간목표의 전체 텍스트를 그대로 사용하되, 각 목표마다 번호를 붙일 것
- 화살표(→) 앞에는 반드시 줄바꿈(\\n)을 넣을 것
- 각 목표 사이에는 빈 줄(\\n\\n)을 넣어 구분할 것
- 각 연간목표마다 정확히 1개의 행동만 제안하되, 한 줄로 간결하게 작성하세요.
- 모든 연간목표를 빠짐없이 다루어야 합니다.`;
}
















