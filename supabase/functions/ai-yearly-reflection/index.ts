// Supabase Edge Function: 연간 AI 성찰 생성
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const PROMPT_VERSION = 'yearly_reflection_v1';

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
    
    // Gemini API 요청 본문 구성
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
        maxOutputTokens: 8000, // 연간 리포트는 상세하므로 8000 토큰
      },
    };
    
    // systemInstruction을 별도 필드로 추가 (지원되는 경우)
    if (GEMINI_MODEL.includes('2.5') || GEMINI_MODEL.includes('2.0')) {
      requestBody.systemInstruction = {
        parts: [
          {
            text: systemInstruction,
          },
        ],
      };
    } else {
      // systemInstruction을 지원하지 않는 경우 프롬프트에 포함
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
      let errorData: any;
      try {
        const errorText = await geminiResponse.text();
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: `HTTP ${geminiResponse.status}: ${geminiResponse.statusText}` };
      }
      
      console.error('Gemini API error:', errorData);
      
      // 에러 메시지 추출 (Gemini API 에러 형식에 맞춰)
      let errorMessage = errorData.error?.message || errorData.message || 'Unknown error';
      
      // 전체 에러 정보를 details에 포함
      return new Response(
        JSON.stringify({ 
          error: 'AI generation failed', 
          message: errorMessage,
          details: errorData 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const geminiData = await geminiResponse.json();
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
          model: GEMINI_MODEL,
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

    // 성공 응답
    return new Response(
      JSON.stringify({
        success: true,
        year,
        content_md: contentMd,
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

위 데이터를 바탕으로 다음 형식으로 연간 성찰을 작성해주세요:

# ${year}년 연간 성찰

## 올해 요약
${year}년 한 해 동안의 전반적인 활동과 성과를 요약해주세요.

## 잘한 점
올해 잘한 점과 성과를 구체적으로 나열해주세요. 월별 실천계획과 결과를 참고하여 작성해주세요.

## 개선할 점
아쉬웠던 점이나 개선이 필요한 부분을 건설적으로 제시해주세요.

## ${nextYear}년 목표 수립 조언
${nextYear}년 목표를 수립할 때 고려할 점과 구체적인 조언을 제공해주세요. 올해의 경험을 바탕으로 현실적이고 실행 가능한 제안을 해주세요.

마크다운 형식으로 작성하고, 격려와 동기부여가 되는 톤으로 작성해주세요.`;
}


