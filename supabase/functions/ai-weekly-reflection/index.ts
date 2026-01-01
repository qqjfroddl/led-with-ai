// Supabase Edge Function: 주간 AI 성찰 생성
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const PROMPT_VERSION = 'weekly_reflection_v3';

interface RequestBody {
  week_start: string;
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
    const { week_start } = body;

    if (!week_start) {
      return new Response(
        JSON.stringify({ error: 'week_start is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 주 종료일 계산
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const week_end = weekEndDate.toISOString().split('T')[0];

    // 주간 통계 수집
    const stats = await collectWeeklyStats(supabase, user.id, week_start, week_end);

    // 루틴별 상세 통계 수집 (v2 추가)
    const { data: allRoutines } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', user.id);

    const routineDetails = await collectRoutineDetails(
      supabase,
      user.id,
      week_start,
      week_end,
      allRoutines || []
    );

    // 할일 이월 패턴 분석 (v2 추가)
    const todoPatterns = await collectTodoPatterns(
      supabase,
      user.id,
      week_start,
      week_end
    );

    // 성찰 텍스트 요약 수집
    const reflectionsText = await collectReflectionsText(
      supabase,
      user.id,
      week_start,
      week_end
    );

    // AI 프롬프트 생성 (v2: 파라미터 추가)
    const prompt = generatePrompt(stats, reflectionsText, week_start, week_end, routineDetails, todoPatterns);

    // Gemini API 호출
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const systemInstruction = '당신은 사용자의 주간 활동을 분석하고 성찰을 제공하는 AI 어시스턴트입니다. 한국어로 답변하세요.';
    
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
        maxOutputTokens: 8000, // 2000 → 8000으로 증가 (Gemini 2.5 Flash는 최대 65,536까지 가능)
      },
    };
    
    // systemInstruction을 별도 필드로 추가 (지원되는 경우)
    // 참고: 일부 모델은 systemInstruction을 지원하지 않을 수 있음
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
      
      // 에러 메시지 추출
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

    // DB에 저장 (upsert)
    const { error: saveError } = await supabase
      .from('weekly_ai_reflections')
      .upsert(
        {
          user_id: user.id,
          week_start,
          week_end,
          content_md: contentMd,
          model: GEMINI_MODEL,
          prompt_version: PROMPT_VERSION,
        },
        { onConflict: 'user_id,week_start' }
      );

    if (saveError) {
      console.error('Error saving reflection:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save reflection', details: saveError }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 사용량 카운터 증가 (통계용, 제한 없음)
    const weekKey = `${weekStartDate.getFullYear()}-W${getWeekNumber(weekStartDate)}`;
    const { data: counter } = await supabase
      .from('ai_usage_counters')
      .select('count')
      .eq('user_id', user.id)
      .eq('scope', 'weekly_reflection')
      .eq('period_key', weekKey)
      .maybeSingle();

    const currentCount = counter?.count || 0;
    await supabase
      .from('ai_usage_counters')
      .upsert(
        {
          user_id: user.id,
          scope: 'weekly_reflection',
          period_key: weekKey,
          count: currentCount + 1,
        },
        { onConflict: 'user_id,scope,period_key' }
      );

    // 성공 응답
    return new Response(
      JSON.stringify({
        success: true,
        week_start,
        week_end,
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
    // active_from_date가 없으면 created_at의 날짜 부분 사용
    activeFromDate = routine.created_at.substring(0, 10);
  } else {
    return false; // 시작일을 알 수 없으면 제외
  }

  // 비활성화일 확인
  let deletedAtDate: string | null = null;
  if (routine.deleted_at) {
    deletedAtDate = routine.deleted_at.substring(0, 10);
  }

  // 날짜 범위 체크: 적용 시작일 <= 선택 날짜 < 비활성화일
  if (activeFromDate > selectedDate) {
    return false; // 아직 적용 시작 전
  }
  if (deletedAtDate && deletedAtDate <= selectedDate) {
    return false; // 이미 비활성화됨
  }

  // 타입별 필터링
  if (schedule.type === 'daily') return true;
  
  if (schedule.type === 'weekly') {
    const today = new Date(selectedDate);
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일...
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 일요일을 7로 변환
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
 * 루틴별 상세 통계 수집 (v2 추가)
 */
async function collectRoutineDetails(
  supabase: any,
  userId: string,
  weekStart: string,
  weekEnd: string,
  routines: any[]
) {
  const routineStats = [];
  
  for (const routine of routines) {
    // 해당 주에 활성 상태였던 날짜 수 계산
    let activeDays = 0;
    const weekStartDate = new Date(weekStart + 'T00:00:00');
    const weekEndDate = new Date(weekEnd + 'T00:00:00');
    
    for (let d = new Date(weekStartDate); d <= weekEndDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (isRoutineDue(routine, dateStr)) {
        activeDays++;
      }
    }
    
    if (activeDays === 0) continue;
    
    // 체크된 횟수 조회
    const { data: logs } = await supabase
      .from('routine_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('routine_id', routine.id)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .eq('checked', true);
    
    const checked = logs?.length || 0;
    const rate = (checked / activeDays) * 100;
    
    routineStats.push({
      title: routine.title,
      checked,
      total: activeDays,
      rate: Math.round(rate * 10) / 10
    });
  }
  
  // 실천율 기준 정렬
  routineStats.sort((a, b) => b.rate - a.rate);
  
  return {
    top3: routineStats.slice(0, 3),
    bottom3: routineStats.slice(-3).reverse(),
    all: routineStats
  };
}

/**
 * 할일 이월 패턴 분석 (v2 추가)
 */
async function collectTodoPatterns(
  supabase: any,
  userId: string,
  weekStart: string,
  weekEnd: string
) {
  // 이번 주 동안 이월된 할일 조회
  const { data: carriedTodos } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .not('carried_over_at', 'is', null)
    .is('deleted_at', null);
  
  // 카테고리별 집계
  const categoryCount: Record<string, number> = {};
  const categoryNames: Record<string, string> = {
    work: 'Work',
    job: 'Job',
    self_dev: 'Growth',
    personal: 'Personal'
  };
  const todoDetails: any[] = [];
  
  carriedTodos?.forEach((todo: any) => {
    categoryCount[todo.category] = (categoryCount[todo.category] || 0) + 1;
    todoDetails.push({
      title: todo.title,
      category: categoryNames[todo.category] || todo.category
    });
  });
  
  const mostCarriedCategory = Object.entries(categoryCount)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';
  
  return {
    carriedOver: carriedTodos?.length || 0,
    mostCarriedCategory: categoryNames[mostCarriedCategory] || mostCarriedCategory,
    carriedOverDetails: todoDetails.slice(0, 5) // 상위 5개만
  };
}

/**
 * 주간 통계 수집
 */
async function collectWeeklyStats(
  supabase: any,
  userId: string,
  weekStart: string,
  weekEnd: string
) {
  // 할일 통계
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .is('deleted_at', null);

  const totalTodos = todos?.length || 0;
  const completedTodos = todos?.filter((t: any) => t.is_done).length || 0;
  const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  // ✅ PRD 요구사항: is_active 조건 없이 모든 루틴 조회 (비활성화된 루틴 포함)
  const { data: routines } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId);
    // is_active 조건 제거
    // deleted_at 조건 제거 (날짜 기준으로 필터링)

  const { data: routineLogs } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .eq('checked', true);

  // ✅ 날짜별로 활성 루틴 수 계산 (루틴 변경 반영)
  let totalPossibleChecks = 0;
  const weekStartDate = new Date(weekStart + 'T00:00:00');
  const weekEndDate = new Date(weekEnd + 'T00:00:00');
  
  for (let d = new Date(weekStartDate); d <= weekEndDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // 해당 날짜에 활성인 루틴 필터링
    const activeRoutines = routines?.filter((r: any) => isRoutineDue(r, dateStr)) || [];
    totalPossibleChecks += activeRoutines.length;
  }

  const totalChecks = routineLogs?.length || 0;
  const practiceRate =
    totalPossibleChecks > 0 ? (totalChecks / totalPossibleChecks) * 100 : 0;

  // 성찰 통계
  const { data: reflections } = await supabase
    .from('daily_reflections')
    .select('date')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd);

  const writtenDays = reflections?.length || 0;
  const writingRate = (writtenDays / 7) * 100;

  // 전체 루틴 수는 주간 평균으로 계산 (표시용)
  const avgRoutinesPerDay = totalPossibleChecks / 7;

  return {
    todos: {
      total: totalTodos,
      completed: completedTodos,
      completionRate: Math.round(completionRate * 10) / 10,
    },
    routines: {
      totalRoutines: Math.round(avgRoutinesPerDay * 10) / 10, // 평균 루틴 수 (소수점 첫째 자리)
      totalChecks,
      practiceRate: Math.round(practiceRate * 10) / 10,
    },
    reflections: {
      writtenDays,
      writingRate: Math.round(writingRate * 10) / 10,
    },
  };
}

/**
 * 성찰 텍스트 요약 수집
 */
async function collectReflectionsText(
  supabase: any,
  userId: string,
  weekStart: string,
  weekEnd: string
) {
  const { data: reflections } = await supabase
    .from('daily_reflections')
    .select('date, grateful, well_done, regret, tomorrow_promise')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date', { ascending: true });

  if (!reflections || reflections.length === 0) {
    return '성찰 기록이 없습니다.';
  }

  // 각 성찰을 간단히 요약 (최대 200자씩)
  const summaries = reflections.map((r: any) => {
    const parts = [];
    if (r.grateful) parts.push(`감사한 일: ${r.grateful.substring(0, 100)}`);
    if (r.well_done) parts.push(`잘한 일: ${r.well_done.substring(0, 100)}`);
    if (r.regret) parts.push(`아쉬운 일: ${r.regret.substring(0, 100)}`);
    if (r.tomorrow_promise) parts.push(`내일의 다짐: ${r.tomorrow_promise.substring(0, 100)}`);
    return `${r.date}: ${parts.join(' | ')}`;
  });

  return summaries.join('\n').substring(0, 3000); // 최대 3000자
}

/**
 * AI 프롬프트 생성 (v2.4 - 숫자 리스트로 명확한 구분)
 */
function generatePrompt(
  stats: any,
  reflectionsText: string,
  weekStart: string,
  weekEnd: string,
  routineDetails: any,
  todoPatterns: any
) {
  return `다음은 ${weekStart}부터 ${weekEnd}까지의 주간 활동 통계입니다.

## 주간 통계

### 할일
- 전체 할일: ${stats.todos.total}개
- 완료한 할일: ${stats.todos.completed}개
- 완료율: ${stats.todos.completionRate}%
- 이월된 할일: ${todoPatterns.carriedOver}개
${todoPatterns.carriedOver > 0 ? `- 가장 많이 이월된 카테고리: ${todoPatterns.mostCarriedCategory}` : ''}

### 루틴
- 전체 루틴 수: ${stats.routines.totalRoutines}개
- 체크한 루틴: ${stats.routines.totalChecks}회
- 실천율: ${stats.routines.practiceRate}%

#### 잘 실천한 루틴 (상위 3개)
${routineDetails.top3.length > 0 
  ? routineDetails.top3.map((r: any) => `- ${r.title}: ${r.rate}% (${r.checked}/${r.total}회)`).join('\n')
  : '- 루틴이 없습니다.'}

#### 실천이 부족한 루틴 (하위 3개)
${routineDetails.bottom3.length > 0
  ? routineDetails.bottom3.map((r: any) => `- ${r.title}: ${r.rate}% (${r.checked}/${r.total}회)`).join('\n')
  : '- 루틴이 없습니다.'}

### 성찰
- 작성한 날: ${stats.reflections.writtenDays}일
- 작성률: ${stats.reflections.writingRate}%

${todoPatterns.carriedOver > 0 ? `## 이월된 할일 상세
${todoPatterns.carriedOverDetails.map((t: any) => `- [${t.category}] ${t.title}`).join('\n')}
` : ''}
## 일일 성찰 요약
${reflectionsText}

---

위 통계와 성찰을 바탕으로 다음 형식으로 주간 성찰을 작성해주세요:

# 주간 성찰 (${weekStart} ~ ${weekEnd})

## 이번 주 요약
이번 주의 전반적인 활동을 요약해주세요. 완료율, 실천율, 성찰 작성률을 종합적으로 평가하세요.

## 잘한 점 👏

이번 주 잘한 점들을 구체적으로 칭찬하고 격려해주세요.

실천율이 높은 루틴들의 **구체적인 루틴명**을 언급하며 왜 잘했는지, 어떤 점이 좋았는지 설명하고, 완료한 할일들의 성과도 함께 인정해주세요.

자연스럽게 문단으로 작성하거나, 필요하면 불릿 리스트를 사용해도 좋습니다.

## 개선할 점 💪

아쉬웠던 점과 개선이 필요한 부분을 건설적으로 분석해주세요.

**실천이 부족한 루틴**

실천율이 낮은 루틴들의 **구체적인 루틴명**을 언급하며 분석하고, 왜 실천이 어려웠을지 원인을 추측해주세요(시간 부족, 난이도, 동기부여 등).

그리고 다음과 같은 구체적이고 실행 가능한 개선 방법을 제시해주세요. 각 개선 방법은 **볼드 제목 + 불릿 리스트** 형식으로 작성하세요:

**시간대 조정**: 저녁 루틴이 어렵다면 아침으로 변경하는 등의 방법
- 구체적 예시: ○○ 루틴을 저녁 9시 → 아침 7시로 이동
- 왜 효과적인지: 아침은 피로도가 낮아 집중력이 높음

**루틴 난이도 낮추기**: 30분 목표를 10분으로 줄여서 지속 가능하게 만들기
- 구체적 예시: 독서 30분 → 책 한 페이지만 읽기
- 왜 효과적인지: 작은 성공이 쌓여 동기부여와 자신감 향상

**트리거 설정**: 자동으로 떠올릴 수 있는 계기 만들기
- 구체적 예시: 아침 커피 마신 직후 = ○○ 루틴 시작
- 왜 효과적인지: 기존 습관에 연결하면 자동으로 실행됨

**환경 개선**: 필요한 도구나 공간을 미리 준비해두어 실천 장벽 낮추기
- 구체적 예시: 운동복을 침대 옆에 미리 준비
- 왜 효과적인지: 준비 과정이 간소화되어 즉시 시작 가능

**마크다운 형식**: 
- 각 개선 방법은 **볼드로 제목** 작성 (예: **시간대 조정**: 설명)
- 하위 항목은 불릿 리스트 (-)로 들여쓰기
- 숫자는 사용하지 마세요

**마크다운 형식 중요**: 
- 개선 방법은 **볼드 제목 (예: **시간대 조정**: 설명)**으로 작성
- 하위 항목(예시, 이유)은 **들여쓰기 후 불릿 리스트 (-)**로 작성
- 숫자는 사용하지 마세요
- 이렇게 하면 볼드 제목과 불릿이 명확히 구분됩니다

${todoPatterns.carriedOver > 0 ? `
**이월된 할일**

계속 미뤄지는 할일들에 대해 각각 분석해주세요. 각 할일을 **볼드 제목 + 불릿 리스트** 형식으로 나열하고, 원인과 해결 방안을 하위 불릿으로 설명하세요:

**[카테고리] 할일 제목**: 간단한 설명
- 원인 분석: 왜 미뤄지는지 (너무 큰 일, 애매한 일, 두려움, 중요도 낮음 등)
- 해결 방안: 구체적인 액션 (작은 단위로 쪼개기, 명확한 시간 블록 할당 등)

**[카테고리] 할일 제목**: 간단한 설명
- 원인 분석: ...
- 해결 방안: ...

**[카테고리] 할일 제목**: 간단한 설명
- 원인 분석: ...
- 해결 방안: ...

**중요**: 각 할일은 볼드 제목으로, 하위 항목은 불릿 리스트로 작성하세요. 숫자는 사용하지 마세요.

(최대 5개까지만 나열)
` : ''}
## 다음 주 실행 계획 🎯

다음 주를 위한 구체적이고 실행 가능한 계획을 제시해주세요.

**루틴 개선 액션**

실천율이 낮은 루틴 1-2개를 선택하여, 구체적이고 실행 가능한 개선 액션을 **볼드 제목 + 불릿 리스트** 형식으로 제시하세요:

**○○ 루틴 개선**: 구체적 액션 설명
- 예시: "매일 아침 7시 알람과 함께 ○○ 루틴 시작하기"
- 목표: 주 5회 이상 실천

**△△ 루틴 개선**: 구체적 액션 설명
- 예시: "○○ 루틴은 10분으로 줄이고 매일 실천하기"
- 목표: 매일 실천

**중요**: 각 루틴 개선은 볼드 제목으로, 하위 항목은 불릿 리스트로 작성하세요. 숫자는 사용하지 마세요.

**할일 관리 전략**

이월을 줄이고 완료율을 높이기 위한 구체적인 전략을 **볼드 제목 + 불릿 리스트** 형식으로 제시하세요:

**전략 이름**: 구체적 설명
- 예시: "큰 할일은 3개 이하의 작은 할일로 나누기"
- 실행 방법: 매일 아침 할일 검토 시 큰 일 분해

**전략 이름**: 구체적 설명
- 예시: "매일 아침 가장 중요한 할일 1개 먼저 처리하기"
- 실행 방법: 하루 시작 30분은 최우선 할일에만 집중

**중요**: 각 전략은 볼드 제목으로, 하위 항목은 불릿 리스트로 작성하세요. 숫자는 사용하지 마세요.

**격려 메시지**

긍정적이고 따뜻한 톤으로 다음 주를 응원하는 메시지를 작성해주세요. 작은 진전도 큰 성과임을 강조하세요.

---

**작성 가이드:**
- 마크다운 형식으로 작성하되, 자연스러운 흐름을 유지하세요
- **개선 방법, 이월된 할일, 액션 아이템은 볼드 제목 + 불릿 리스트 조합**으로 작성
- **각 항목의 제목은 볼드 (예: **시간대 조정**: 설명)**로 작성
- **하위 항목(예시, 이유, 방법)은 들여쓰기 후 불릿 리스트 (-)**로 작성
- **숫자는 절대 사용하지 마세요**
- 이렇게 하면 볼드 제목과 불릿이 명확히 구분됩니다
- 통계 숫자만 나열하지 말고, **구체적인 루틴명과 할일을 언급**하며 개인화된 피드백 제공
- 격려와 동기부여가 되는 따뜻한 톤 유지
- 실행 가능한 구체적 액션 아이템 제시`;
}

/**
 * 주차 번호 계산
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

