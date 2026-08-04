// NEIS 오픈API 프록시 — 키는 여기(서버)에만 두고, 클라이언트는 이 Worker만 호출한다.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowed = new Set([
      '/schoolInfo',
      '/SchoolSchedule',
      // 급식·시간표 앱(GumiMealWidget)용. 시간표는 학교급마다 엔드포인트가 다르다.
      '/mealServiceDietInfo',
      '/elsTimetable',
      '/misTimetable',
      '/hisTimetable'
    ]);
    if (!allowed.has(url.pathname)) {
      return new Response('Not found', { status: 404 });
    }

    const upstream = new URL('https://open.neis.go.kr/hub' + url.pathname);
    upstream.searchParams.set('KEY', env.NEIS_KEY);
    for (const [k, v] of url.searchParams) {
      if (k === 'KEY') continue; // 클라이언트가 키를 보내도 무시
      upstream.searchParams.set(k, v);
    }

    const res = await fetch(upstream.toString());
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store'
      }
    });
  }
};
