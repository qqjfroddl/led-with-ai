// Supabase Edge Function: 연간 AI 성찰 생성
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = Deno.env.get('GEMINI_FALLBACK_MODEL') || 'gemini-2.0-flash';
const PROMPT_VERSION = 'yearly_reflection_v4';

interface RequestBody {
  year: number;
}

// CORS 헤더 헬퍼 함수
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

serve(async (req) => {
  try {
    // CORS 헤더 - OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
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
    const { year } = body;

    if (!year) {
      return new Response(
        JSON.stringify({ error: 'year is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 연간 목표 조회
    const { data: yearlyGoals, error: yearlyGoalsError } = await supabase
      .from('yearly_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .maybeSingle();

    // 1월~12월 월간 실천계획 조회
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    
    const { data: monthlyPlans, error: monthlyPlansError } = await supabase
      .from('monthly_plans')
      .select('*')
      .eq('user_id', user.id)
      .gte('month_start', yearStart)
      .lte('month_start', yearEnd)
      .order('month_start', { ascending: true });

    if (monthlyPlansError) {
      console.error('Error fetching monthly plans:', monthlyPlansError);
    }

    // 연간 통계 수집 (1월~12월 종합)
    const yearlyStats = await collectYearlyStats(
      supabase,
      user.id,
      year
    );

    // 월별 목표/결과 요약 생성
    const monthlySummary = formatMonthlyPlansSummary(monthlyPlans || []);

    // AI 프롬프트 생성
    const prompt = generatePrompt(
      yearlyStats,
      yearlyGoals,
      monthlySummary,
      year
    );

    // Gemini API 호출
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const systemInstruction = '당신은 사용자의 연간 활동을 분석하고 성찰을 제공하는 AI 어시스턴트입니다. 한국어로 답변하세요.';

    // Gemini API 요청 본문을 모델에 맞게 구성하는 헬퍼
    function buildRequestBody(model: string) {
      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
        },
      };
      if (model.includes('2.5') || model.includes('2.0')) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      } else {
        body.contents[0].parts[0].text = `${systemInstruction}\n\n${prompt}`;
      }
      return body;
    }

    // 재시도 + 폴백 모델로 Gemini API 호출
    async function callGeminiWithRetry(): Promise<{ data: any; model: string }> {
      const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL];
      const maxRetries = 2;

      for (const model of modelsToTry) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          if (attempt > 0 || model !== GEMINI_MODEL) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 2000);
            console.log(`Retrying with ${model} (attempt ${attempt + 1}) after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const requestBody = buildRequestBody(model);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }
          );

          if (response.ok) {
            return { data: await response.json(), model };
          }

          const status = response.status;
          if (status !== 503 && status !== 429) {
            let errorData: any;
            try {
              errorData = JSON.parse(await response.text());
            } catch {
              errorData = { message: `HTTP ${status}: ${response.statusText}` };
            }
            throw { errorData, status };
          }
          console.warn(`Gemini API ${status} with model ${model}, attempt ${attempt + 1}/${maxRetries}`);
        }
        console.warn(`All retries exhausted for model ${model}, trying fallback...`);
      }

      throw {
        errorData: {
          error: {
            code: 503,
            message: 'AI 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
            status: 'UNAVAILABLE',
          },
        },
        status: 503,
      };
    }

    let geminiData: any;
    let usedModel: string;
    try {
      const result = await callGeminiWithRetry();
      geminiData = result.data;
      usedModel = result.model;
      if (usedModel !== GEMINI_MODEL) {
        console.log(`Used fallback model: ${usedModel} (primary: ${GEMINI_MODEL})`);
      }
    } catch (err: any) {
      console.error('Gemini API error after retries:', err.errorData);
      const errorMessage = err.errorData?.error?.message || err.errorData?.message || 'Unknown error';
      return new Response(
        JSON.stringify({
          error: 'AI generation failed',
          message: errorMessage,
          details: err.errorData,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const contentMd = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!contentMd) {
      return new Response(
        JSON.stringify({ error: 'Empty AI response' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // DB에 저장 (upsert) - year만 저장
    const { error: saveError } = await supabase
      .from('yearly_ai_reflections')
      .upsert(
        {
          user_id: user.id,
          year,
          content_md: contentMd,
          model: usedModel,
          prompt_version: PROMPT_VERSION,
        },
        { onConflict: 'user_id,year' }
      );

    if (saveError) {
      console.error('Error saving reflection:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save reflection', details: saveError }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 사용량 카운터 증가 (통계용, 제한 없음)
    const yearKey = String(year);
    const { data: counter } = await supabase
      .from('ai_usage_counters')
      .select('count')
      .eq('user_id', user.id)
      .eq('scope', 'yearly_reflection')
      .eq('period_key', yearKey)
      .maybeSingle();

    const currentCount = counter?.count || 0;
    await supabase
      .from('ai_usage_counters')
      .upsert(
        {
          user_id: user.id,
          scope: 'yearly_reflection',
          period_key: yearKey,
          count: currentCount + 1,
        },
        { onConflict: 'user_id,scope,period_key' }
      );

    // 성공 응답
    return new Response(
      JSON.stringify({
        success: true,
        year,
        content_md: contentMd,
        model: usedModel,
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
        stack: errorStack 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

/**
 * 연간 통계 수집 (1월~12월 종합)
 */
async function collectYearlyStats(
  supabase: any,
  userId: string,
  year: number
) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  // 할일 통계 (연간)
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .gte('date', yearStart)
    .lte('date', yearEnd)
    .is('deleted_at', null);

  const totalTodos = todos?.length || 0;
  const completedTodos = todos?.filter((t: any) => t.is_done).length || 0;
  const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  // 루틴 통계 (연간)
  // 모든 루틴 조회
  const { data: routines } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId);

  const { data: routineLogs } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', yearStart)
    .lte('date', yearEnd)
    .eq('checked', true);

  // 날짜별로 활성 루틴 수 계산
  let totalPossibleChecks = 0;
  const yearStartDate = new Date(yearStart + 'T00:00:00');
  const yearEndDate = new Date(yearEnd + 'T00:00:00');
  
  for (let d = new Date(yearStartDate); d <= yearEndDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const activeRoutines = routines?.filter((r: any) => isRoutineDue(r, dateStr)) || [];
    totalPossibleChecks += activeRoutines.length;
  }

  const totalChecks = routineLogs?.length || 0;
  const practiceRate = totalPossibleChecks > 0 
    ? (totalChecks / totalPossibleChecks) * 100 
    : 0;

  // 성찰 통계 (연간)
  const { data: reflections } = await supabase
    .from('daily_reflections')
    .select('date')
    .eq('user_id', userId)
    .gte('date', yearStart)
    .lte('date', yearEnd);

  const writtenDays = reflections?.length || 0;
  const totalDays = 365; // 윤년 고려하지 않음 (간단화)
  const writingRate = (writtenDays / totalDays) * 100;

  // 월별 통계 (간단 요약)
  const monthlyStats = [];
  for (let month = 1; month <= 12; month++) {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndDate = new Date(year, month, 0);
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`;
    
    const monthTodos = todos?.filter((t: any) => t.date >= monthStart && t.date <= monthEnd) || [];
    const monthCompleted = monthTodos.filter((t: any) => t.is_done).length;
    const monthTotal = monthTodos.length;
    
    monthlyStats.push({
      month,
      todos: { total: monthTotal, completed: monthCompleted, completionRate: monthTotal > 0 ? (monthCompleted / monthTotal) * 100 : 0 }
    });
  }

  return {
    todos: {
      total: totalTodos,
      completed: completedTodos,
      completionRate: Math.round(completionRate * 10) / 10,
    },
    routines: {
      totalChecks,
      practiceRate: Math.round(practiceRate * 10) / 10,
    },
    reflections: {
      writtenDays,
      writingRate: Math.round(writingRate * 10) / 10,
    },
    monthlyStats,
  };
}

/**
 * 날짜 기준 루틴 필터링 함수 (PRD FR-C5 준수)
 */
function isRoutineDue(routine: any, selectedDate: string): boolean {
  const schedule = typeof routine.schedule === 'string' 
    ? (() => { try { return JSON.parse(routine.schedule); } catch { return routine.schedule; } })()
    : routine.schedule;
  
  if (!schedule) return false;

  // 적용 시작일 확인
  let activeFromDate: string;
  if (schedule.active_from_date) {
    activeFromDate = schedule.active_from_date;
  } else if (routine.created_at) {
    activeFromDate = routine.created_at.substring(0, 10);
  } else {
    return false;
  }

  // 비활성화일 확인
  let deletedAtDate: string | null = null;
  if (routine.deleted_at) {
    deletedAtDate = routine.deleted_at.substring(0, 10);
  }

  // 날짜 범위 체크
  if (activeFromDate > selectedDate) {
    return false;
  }
  if (deletedAtDate && deletedAtDate <= selectedDate) {
    return false;
  }

  // 타입별 필터링
  if (schedule.type === 'daily') return true;
  
  if (schedule.type === 'weekly') {
    const today = new Date(selectedDate);
    const dayOfWeek = today.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    return schedule.days?.includes(adjustedDay);
  }
  
  if (schedule.type === 'monthly') {
    const monthStart = schedule.month;
    const currentMonth = selectedDate.substring(0, 7) + '-01';
    return monthStart === currentMonth;
  }
  
  return false;
}

/**
 * 월별 목표/결과 요약 포맷팅
 */
function formatMonthlyPlansSummary(monthlyPlans: any[]): string {
  if (!monthlyPlans || monthlyPlans.length === 0) {
    return '월간 실천계획 기록이 없습니다.';
  }

  const summaries = monthlyPlans.map((plan: any) => {
    const monthStart = new Date(plan.month_start);
    const month = monthStart.getMonth() + 1;
    const planContent = plan.plan_content || {};
    const resultsContent = plan.results_content || {};

    const parts = [];
    
    // 자기계발
    if (planContent.self_dev || resultsContent.self_dev) {
      parts.push(`자기계발: 계획="${planContent.self_dev || '(없음)'}" | 결과="${resultsContent.self_dev || '(없음)'}"`);
    }
    
    // 관계
    if (planContent.relationship || resultsContent.relationship) {
      parts.push(`관계: 계획="${planContent.relationship || '(없음)'}" | 결과="${resultsContent.relationship || '(없음)'}"`);
    }
    
    // 업무/재정
    if (planContent.work_finance || resultsContent.work_finance) {
      parts.push(`업무/재정: 계획="${planContent.work_finance || '(없음)'}" | 결과="${resultsContent.work_finance || '(없음)'}"`);
    }

    return `${month}월: ${parts.join(' | ')}`;
  });

  return summaries.join('\n').substring(0, 3000); // 최대 3000자
}

/**
 * AI 프롬프트 생성
 */
function generatePrompt(
  stats: any,
  yearlyGoals: any,
  monthlySummary: string,
  year: number
) {
  const nextYear = year + 1;
  
  let goalsText = '연간 목표가 설정되지 않았습니다.';
  if (yearlyGoals) {
    goalsText = `
- 자기계발: ${yearlyGoals.self_dev || '(없음)'}
- 관계: ${yearlyGoals.relationship || '(없음)'}
- 업무/재정: ${yearlyGoals.work_finance || '(없음)'}`;
  }

  return `다음은 ${year}년도의 연간 활동 데이터입니다.

## ${year}년 연간 목표
${goalsText}

## 연간 통계 요약

### 할일
- 전체 할일: ${stats.todos.total}개
- 완료한 할일: ${stats.todos.completed}개
- 완료율: ${stats.todos.completionRate}%

### 루틴
- 체크한 루틴: ${stats.routines.totalChecks}회
- 실천율: ${stats.routines.practiceRate}%

### 성찰
- 작성한 날: ${stats.reflections.writtenDays}일
- 작성률: ${stats.reflections.writingRate}%

## 월별 실천계획 및 결과
${monthlySummary}

---

위 데이터를 바탕으로 다음 형식으로 연간 성찰을 작성해주세요:

# ${year}년 연간 성찰

## 올해 요약
${year}년 한 해 동안의 전반적인 활동과 성과를 요약해주세요. 완료율, 실천율, 성찰 작성률을 종합적으로 평가하세요.

## 잘한 점 👏

올해 잘한 점과 성과를 구체적으로 칭찬해주세요:

- **연간 목표 달성**: 설정한 연간 목표 중 어떤 부분을 잘 실행했는지 구체적으로 언급하세요.
- **월별 실천계획 성과**: 월별로 꾸준히 실천한 점들을 인정하고 긍정적으로 평가하세요.
- **습관 형성**: 루틴 실천율을 바탕으로 잘 정착된 습관들을 칭찬하세요.

자연스럽게 문단으로 작성하거나, 필요하면 소제목(### 또는 볼드)을 사용해도 좋습니다.

## 개선할 점 💪

아쉬웠던 점과 개선이 필요한 부분을 건설적으로 분석해주세요:

### 목표 달성 분석

연간 목표 중 미달성 영역을 분석하고, 각각에 대해 다음과 같은 구체적 개선 방법을 제시하세요:

#### 우선순위 재조정
- 설명: 너무 많은 목표 대신 핵심 2-3개에 집중
- 구체적 예시: 자기계발 목표가 5개라면 가장 중요한 2개만 선택
- 왜 효과적인지: 집중도가 높아지고 완수 가능성이 증가합니다

#### 목표 세분화
- 설명: 큰 목표를 월별/분기별 작은 마일스톤으로 나누기
- 구체적 예시: "영어 공부" → "매일 10분 영어 팟캐스트 듣기"로 구체화
- 왜 효과적인지: 작은 성공이 쌓여 큰 성과로 이어집니다

#### 환경 개선
- 설명: 목표 달성을 방해하는 요소 제거하기
- 구체적 예시: 운동 목표라면 운동복을 미리 준비해두기
- 왜 효과적인지: 실행 장벽이 낮아져 즉각적인 행동을 유도합니다

### 루틴 실천 개선

실천율이 낮았던 부분을 분석하고 개선 방안을 제시하세요.

#### [영역명]
- 원인 분석: 왜 실천이 어려웠는지 (너무 많은 루틴, 현실성 부족, 동기 부족 등)
- 해결 방안: 구체적인 액션 (루틴 개수 줄이기, 난이도 조정, 보상 체계 만들기)

자연스럽게 문단으로 작성하거나, 필요하면 소제목을 사용해도 좋습니다.

## ${nextYear}년 목표 수립 조언 🎯

${nextYear}년 목표를 수립할 때 고려할 점과 구체적인 조언을 제공해주세요:

### SMART 원칙 적용

올해의 경험을 바탕으로 현실적이고 실행 가능한 제안을 해주세요.

#### Specific (구체적)
- 설명: 추상적인 목표를 구체적으로 만드는 방법
- 예시: "건강해지기" → "주 3회 30분 러닝하기"
- 왜 중요한지: 명확한 목표는 실행 가능성을 높입니다

#### Measurable (측정 가능)
- 설명: 진행 상황을 확인할 수 있는 지표 설정
- 예시: "책 많이 읽기" → "매월 2권 완독하기"
- 왜 중요한지: 측정 가능해야 성취감과 동기부여를 얻을 수 있습니다

#### Achievable (달성 가능)
- 설명: 현실적인 목표 수립
- 예시: 작년 실천율을 고려하여 목표 개수와 난이도 조정
- 왜 중요한지: 달성 가능한 목표가 지속 가능한 성장을 만듭니다

### 격려 메시지

긍정적이고 따뜻한 톤으로 새해를 응원하는 메시지를 작성해주세요.
${year}년의 경험이 ${nextYear}년의 밑거름이 된다는 점을 강조하세요.

---

**작성 가이드:**
- 마크다운 형식으로 작성하되, 자연스러운 흐름을 유지하세요
- 헤딩 레벨을 활용하여 위계를 명확히 하세요:
  - h2 (##): 메인 섹션 (예: 개선할 점)
  - h3 (###): 카테고리 (예: 목표 달성 분석)
  - h4 (####): 개별 항목 (예: 우선순위 재조정)
  - 불릿 (-): 세부 내용 (예: 설명, 구체적 예시)
- 통계 숫자만 나열하지 말고, 구체적인 목표와 계획을 언급하며 개인화된 피드백 제공
- 격려와 동기부여가 되는 따뜻한 톤 유지
- 실행 가능한 구체적 액션 아이템 제시
- 글씨 크기로 위계가 명확하게 구분되도록 h2, h3, h4, 불릿을 적절히 사용하세요
`;
}


