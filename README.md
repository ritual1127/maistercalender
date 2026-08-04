# 마이스터 캘린더

마이스터고 학생용 시험·일정 캘린더 PWA. 컴활·기능사·한국사(국사편찬위/KBS) 등 자격시험 일정, 학교 학사일정, 개인 목표와 D-day 알림을 한 곳에서 봅니다.

**배포 주소: https://meister-calendar.pages.dev/**

## 구성

```
index.html        # 화면
app.js            # 로직
data.js           # 시험 일정 데이터
manifest.json     # PWA 매니페스트
sw.js             # 서비스 워커 (오프라인 캐시)
icon-192/512.png  # 앱 아이콘
worker/           # NEIS 오픈API 프록시 (Cloudflare Worker)
```

## 로컬 실행

`file://`로 열면 서비스 워커가 동작하지 않으므로 정적 서버로 띄웁니다.

```
npx serve .
```

## 배포

- **프론트엔드** — Cloudflare Pages. 빌드 과정 없이 루트를 그대로 서빙합니다.
- **NEIS 프록시** — `worker/`에서 `npx wrangler deploy`.
  NEIS 인증키는 저장소에 두지 않고 시크릿으로 넣습니다:

  ```
  npx wrangler secret put NEIS_KEY
  ```

  Worker는 허용된 NEIS 엔드포인트(`/schoolInfo`, `/SchoolSchedule`, 급식·시간표)만 통과시키고
  클라이언트가 보낸 `KEY` 파라미터는 무시합니다.

## 데이터 갱신

시험 일정은 `data.js`에 하드코딩되어 있습니다. 연도가 바뀌면 해당 배열을 수정하세요.
