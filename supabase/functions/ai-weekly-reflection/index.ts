// Supabase Edge Function: 주간 AI 성찰 생성
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const PROMPT_VERSION = 'weekly_reflection_v1';

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

    // 레이트리밋 확인 (주 3회)
    const weekKey = `${weekStartDate.getFullYear()}-W${getWeekNumber(weekStartDate)}`;
    const { data: counter, error: counterError } = await supabase
      .from('ai_usage_counters')
      .select('count')
      .eq('user_id', user.id)
      .eq('scope', 'weekly_reflection')
      .eq('period_key', weekKey)
      .single();

    const currentCount = counter?.count || 0;
    if (currentCount >= 3) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 3 times per week.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 주간 통계 수집
    const stats = await collectWeeklyStats(supabase, user.id, week_start, week_end);

    // 성찰 텍스트 요약 수집
    const reflectionsText = await collectReflectionsText(
      supabase,
      user.id,
      week_start,
      week_end
    );

    // AI 프롬프트 생성
    const prompt = generatePrompt(stats, reflectionsText, week_start, week_end);

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
      const errorData = await geminiResponse.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Gemini API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: errorData }),
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

    // 레이트리밋 카운터 증가
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

  // 루틴 통계
  const { data: routines } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null);

  const { data: routineLogs } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .eq('checked', true);

  const totalPossibleChecks = (routines?.length || 0) * 7;
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

  return {
    todos: {
      total: totalTodos,
      completed: completedTodos,
      completionRate: Math.round(completionRate * 10) / 10,
    },
    routines: {
      totalRoutines: routines?.length || 0,
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
 * AI 프롬프트 생성
 */
function generatePrompt(stats: any, reflectionsText: string, weekStart: string, weekEnd: string) {
  return `다음은 ${weekStart}부터 ${weekEnd}까지의 주간 활동 통계입니다.

## 주간 통계

### 할일
- 전체 할일: ${stats.todos.total}개
- 완료한 할일: ${stats.todos.completed}개
- 완료율: ${stats.todos.completionRate}%

### 루틴
- 전체 루틴 수: ${stats.routines.totalRoutines}개
- 체크한 루틴: ${stats.routines.totalChecks}회
- 실천율: ${stats.routines.practiceRate}%

### 성찰
- 작성한 날: ${stats.reflections.writtenDays}일
- 작성률: ${stats.reflections.writingRate}%

## 일일 성찰 요약
${reflectionsText}

위 통계와 성찰을 바탕으로 다음 형식으로 주간 성찰을 작성해주세요:

# 주간 성찰 (${weekStart} ~ ${weekEnd})

## 이번 주 요약
이번 주의 전반적인 활동을 요약해주세요.

## 잘한 점
이번 주 잘한 점과 성과를 구체적으로 나열해주세요.

## 개선할 점
아쉬웠던 점이나 개선이 필요한 부분을 건설적으로 제시해주세요.

## 다음 주 제안
다음 주를 위한 구체적인 행동 제안을 해주세요.

마크다운 형식으로 작성하고, 격려와 동기부여가 되는 톤으로 작성해주세요.`;
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

