// Supabase Edge Function: 월간 AI 성찰 생성
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const PROMPT_VERSION = 'monthly_reflection_v8'; // v1 → v2: 월실천계획 추가, v2 → v3: 계획 분석 강화(실패), v3 → v4: 월실천계획 리뷰 별도 섹션, v4 → v5: 가독성 개선(글머리기호 간격, 번호 중복 방지), v5 → v6: 마크다운 형식 통일(• + → 방식, 숫자 리스트 금지), v6 → v7: 제목 볼드 처리 + 월실천계획 리뷰 줄바꿈 개선, v7 → v8: 클로징 멘트 추가

interface RequestBody {
  month_start: string;
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
    const { month_start } = body;

    if (!month_start) {
      return new Response(
        JSON.stringify({ error: 'month_start is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 월 종료일 계산 (YYYY-MM-01 형식에서 해당 월의 마지막 날 계산)
    const monthStartDate = new Date(month_start);
    const monthEndDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0);
    const month_end = monthEndDate.toISOString().split('T')[0];
    
    // 월의 일수 계산
    const totalDays = monthEndDate.getDate(); // 28, 29, 30, 31

    // 월간 통계 수집
    const stats = await collectMonthlyStats(supabase, user.id, month_start, month_end, totalDays);

    // 성찰 텍스트 요약 수집 (월간은 더 짧게 요약)
    const reflectionsText = await collectReflectionsText(
      supabase,
      user.id,
      month_start,
      month_end
    );

    // 월실천계획 수집
    const monthlyPlan = await collectMonthlyPlan(supabase, user.id, month_start);

    // 디버깅: 월실천계획 데이터 확인
    console.log('=== Monthly Plan Debug ===');
    console.log('Month start:', month_start);
    console.log('Monthly plan exists:', !!monthlyPlan);
    if (monthlyPlan) {
      console.log('Plan content:', JSON.stringify(monthlyPlan.plan_content, null, 2));
      console.log('Results content:', JSON.stringify(monthlyPlan.results_content, null, 2));
    }

    // AI 프롬프트 생성
    const prompt = generatePrompt(stats, reflectionsText, monthlyPlan, month_start, month_end, totalDays);
    
    // 디버깅: 프롬프트 미리보기
    console.log('=== Prompt Preview ===');
    console.log('Prompt length:', prompt.length);
    console.log('First 2000 chars:', prompt.substring(0, 2000));

    // Gemini API 호출
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const systemInstruction = '당신은 사용자의 월간 활동을 분석하고 성찰을 제공하는 AI 어시스턴트입니다. 한국어로 답변하세요.';
    
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
        maxOutputTokens: 8000, // 주간과 동일하게 8000 토큰
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

    // DB에 저장 (upsert) - month_start만 저장 (PRD 확인)
    const { error: saveError } = await supabase
      .from('monthly_ai_reflections')
      .upsert(
        {
          user_id: user.id,
          month_start,
          content_md: contentMd,
          model: GEMINI_MODEL,
          prompt_version: PROMPT_VERSION,
        },
        { onConflict: 'user_id,month_start' }
      );

    if (saveError) {
      console.error('Error saving reflection:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save reflection', details: saveError }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 사용량 카운터 증가 (통계용, 제한 없음)
    const monthKey = `${monthStartDate.getFullYear()}-${String(monthStartDate.getMonth() + 1).padStart(2, '0')}`;
    const { data: counter } = await supabase
      .from('ai_usage_counters')
      .select('count')
      .eq('user_id', user.id)
      .eq('scope', 'monthly_reflection')
      .eq('period_key', monthKey)
      .maybeSingle();

    const currentCount = counter?.count || 0;
    await supabase
      .from('ai_usage_counters')
      .upsert(
        {
          user_id: user.id,
          scope: 'monthly_reflection',
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
 * 월간 통계 수집
 */
async function collectMonthlyStats(
  supabase: any,
  userId: string,
  monthStart: string,
  monthEnd: string,
  totalDays: number
) {
  // 할일 통계
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
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
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .eq('checked', true);

  // ✅ 날짜별로 활성 루틴 수 계산 (루틴 변경 반영)
  let totalPossibleChecks = 0;
  const monthStartDate = new Date(monthStart + 'T00:00:00');
  const monthEndDate = new Date(monthEnd + 'T00:00:00');
  
  for (let d = new Date(monthStartDate); d <= monthEndDate; d.setDate(d.getDate() + 1)) {
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
    .gte('date', monthStart)
    .lte('date', monthEnd);

  const writtenDays = reflections?.length || 0;
  const writingRate = (writtenDays / totalDays) * 100;

  // 전체 루틴 수는 월간 평균으로 계산 (표시용)
  const avgRoutinesPerDay = totalPossibleChecks / totalDays;

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
 * 성찰 텍스트 요약 수집 (월간은 더 짧게 요약)
 */
async function collectReflectionsText(
  supabase: any,
  userId: string,
  monthStart: string,
  monthEnd: string
) {
  const { data: reflections } = await supabase
    .from('daily_reflections')
    .select('date, grateful, well_done, regret, tomorrow_promise')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .order('date', { ascending: true });

  if (!reflections || reflections.length === 0) {
    return '성찰 기록이 없습니다.';
  }

  // 각 성찰을 간단히 요약 (일별 50자씩, 월간은 더 짧게)
  const summaries = reflections.map((r: any) => {
    const parts = [];
    if (r.grateful) parts.push(`감사: ${r.grateful.substring(0, 50)}`);
    if (r.well_done) parts.push(`잘함: ${r.well_done.substring(0, 50)}`);
    if (r.regret) parts.push(`아쉬움: ${r.regret.substring(0, 50)}`);
    if (r.tomorrow_promise) parts.push(`다짐: ${r.tomorrow_promise.substring(0, 50)}`);
    return `${r.date}: ${parts.join(' | ')}`;
  });

  return summaries.join('\n').substring(0, 1500); // 최대 1500자 (주간 3000자의 절반)
}

/**
 * 월실천계획 수집
 */
async function collectMonthlyPlan(
  supabase: any,
  userId: string,
  monthStart: string
) {
  const { data: plan } = await supabase
    .from('monthly_plans')
    .select('plan_content, results_content')
    .eq('user_id', userId)
    .eq('month_start', monthStart)
    .eq('source', 'manual')  // manual 레코드만 조회 (사용자가 직접 입력한 것)
    .maybeSingle();

  if (!plan) {
    return null;
  }

  return {
    plan_content: plan.plan_content || { self_dev: '', relationship: '', work_finance: '' },
    results_content: plan.results_content || { self_dev: '', relationship: '', work_finance: '' },
  };
}

/**
 * AI 프롬프트 생성
 */
function generatePrompt(
  stats: any, 
  reflectionsText: string, 
  monthlyPlan: any,
  monthStart: string, 
  monthEnd: string, 
  totalDays: number
) {
  let prompt = `다음은 ${monthStart}부터 ${monthEnd}까지의 월간 활동 통계입니다.

## 월간 통계

### 할일
- 전체 할일: ${stats.todos.total}개
- 완료한 할일: ${stats.todos.completed}개
- 완료율: ${stats.todos.completionRate}%

### 루틴
- 평균 일일 루틴 수: ${stats.routines.totalRoutines}개
- 체크한 루틴: ${stats.routines.totalChecks}회
- 실천율: ${stats.routines.practiceRate}%

### 성찰
- 작성한 날: ${stats.reflections.writtenDays}일 (${totalDays}일 중)
- 작성률: ${stats.reflections.writingRate}%
`;

  // 월실천계획이 있으면 추가
  if (monthlyPlan) {
    const { plan_content, results_content } = monthlyPlan;
    
    prompt += `
## 이번 달 실천계획
`;
    if (plan_content.self_dev) {
      prompt += `### 자기계발\n${plan_content.self_dev}\n\n`;
    }
    if (plan_content.relationship) {
      prompt += `### 관계\n${plan_content.relationship}\n\n`;
    }
    if (plan_content.work_finance) {
      prompt += `### 업무/재정\n${plan_content.work_finance}\n\n`;
    }

    prompt += `
## 월말 결과
`;
    if (results_content.self_dev) {
      prompt += `### 자기계발\n${results_content.self_dev}\n\n`;
    }
    if (results_content.relationship) {
      prompt += `### 관계\n${results_content.relationship}\n\n`;
    }
    if (results_content.work_finance) {
      prompt += `### 업무/재정\n${results_content.work_finance}\n\n`;
    }
  }

  prompt += `
## 일일 성찰 요약
${reflectionsText}

위 통계와 성찰을 바탕으로 다음 형식으로 월간 성찰을 작성해주세요:

# 월간 성찰 (${monthStart.substring(0, 7)})

## 1. 이번 달 요약
이번 달의 전반적인 활동을 통계와 성찰을 기반으로 요약해주세요. 할일 완료율, 루틴 실천율, 성찰 작성률 등 주요 지표를 언급하고, 일일 성찰에서 반복적으로 나타난 키워드나 패턴을 짚어주세요.

## 2. 잘한 점
이번 달 잘한 점과 성과를 다음 형식으로 작성해주세요:

• **잘한 점 제목**
→ 구체적인 설명 (통계, 일일 성찰 기반)

통계상 좋았던 부분, 일일 성찰에서 긍정적이었던 내용들을 중심으로 작성해주세요.

## 3. 개선할 점
아쉬웠던 점이나 개선이 필요한 부분을 다음 형식으로 작성해주세요:

• **개선할 점 제목**
→ 구체적인 설명 및 개선 제안

통계상 부족했던 부분, 일일 성찰에서 반복적으로 나타난 아쉬움을 중심으로 작성해주세요.

${monthlyPlan ? `
## 4. 월실천계획 리뷰 📊
위에서 제공된 "이번 달 실천계획"과 "월말 결과"를 바탕으로 영역별 분석을 해주세요.

### 자기계발

**📋 계획**
→ [계획 내용 간단히 요약]

**✅ 결과**
→ [결과 내용 간단히 요약]

**💡 평가**
→ 계획 대비 실행 정도를 평가하고, 잘한 점과 부족한 점을 구체적으로 피드백해주세요.

### 관계

**📋 계획**
→ [계획 내용 간단히 요약]

**✅ 결과**
→ [결과 내용 간단히 요약]

**💡 평가**
→ 계획 대비 실행 정도를 평가하고, 잘한 점과 부족한 점을 구체적으로 피드백해주세요.

### 업무/재정

**📋 계획**
→ [계획 내용 간단히 요약]

**✅ 결과**
→ [결과 내용 간단히 요약]

**💡 평가**
→ 계획 대비 실행 정도를 평가하고, 잘한 점과 부족한 점을 구체적으로 피드백해주세요.

### 종합 평가
3개 영역을 종합하여 이번 달 계획 실행력을 평가해주세요. 전체적으로 계획 대비 얼마나 실행했는지, 주요 방해 요인은 무엇이었는지 분석해주세요.
` : `
## 4. 월실천계획 리뷰 📊
이번 달에는 월실천계획이 등록되지 않았습니다.
다음 달에는 목표 관리 탭에서 구체적인 실천계획을 세워보세요.
명확한 계획은 목표 달성의 첫걸음입니다.
`}

## 5. 다음 달 제안
위의 1~4번 내용을 종합하여 다음 달을 위한 구체적인 행동 제안을 다음 형식으로 작성해주세요:

• **제안 제목**
→ 구체적인 실행 방법 및 세부 내용

${monthlyPlan ? '미완료된 계획이 있다면 다음 달 실행 방안을 제안해주세요.' : '월실천계획을 세우는 것도 포함해서 제안해주세요.'}

---

## 마무리 💪

이번 달의 성찰을 마무리하며, 따뜻하고 격려하는 톤으로 클로징 멘트를 작성해주세요. 사용자의 노력을 인정하고, 다음 달에 대한 응원과 희망의 메시지를 전달해주세요. (2-3문장)

---

**작성 지침:**
- 마크다운 형식으로 작성하세요.
- 격려와 동기부여가 되는 톤으로 작성하세요.
- 구체적이고 실행 가능한 피드백을 제공하세요.
- **모든 섹션에서 글머리 기호(•)를 사용하세요. 숫자 리스트(1., 2., 3.)는 절대 사용하지 마세요.**
- **각 항목의 제목(• 바로 다음)은 반드시 볼드 처리(**제목**)하세요.**
- **각 항목의 상세 설명은 반드시 다음 줄에 화살표(→)로 시작하세요.**
- **각 글머리 기호(•) 항목 사이에는 반드시 빈 줄을 넣어 가독성을 높이세요.**
- **4번 섹션(월실천계획 리뷰)에서는 계획/결과/평가를 각각 별도 줄로 구분하여 작성하세요. 볼드 처리된 소제목(**📋 계획**, **✅ 결과**, **💡 평가**)을 사용하고, 각 내용은 다음 줄에 화살표(→)로 시작하세요.**
- **작성 형식 예시:**
  • **항목 제목**
  → 상세 설명 내용...
  
  • **다음 항목 제목**
  → 상세 설명 내용...
${monthlyPlan ? '- 4번 섹션에서는 반드시 위에 제공된 월실천계획 데이터를 참고하여 작성하세요.' : ''}`;

  return prompt;
}



