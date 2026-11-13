# 작업배정

정보통신 유지보수팀의 하루 작업을 팀원에게 자동으로 배정하고, 배정표를 링크와 엑셀로 공유하는 웹 서비스입니다.
(PRD v1.4 기준 · **모든 데이터는 가상 데이터**)

## 가상 지사 (테스트용)

| 지사 | 보기 링크 | 관리자 비밀번호 |
|---|---|---|
| 수원지사(가상) — 18명 · 루틴 100개 | `/b/sw7Qx2mPa9Lk` | `suwon1234` |
| 테스트지사(가상) — 5명 · 루틴 10개 | `/b/tb3Rn8vKe2Wd` | `test1234` |

관리자 로그인: 보기 링크 뒤에 `/admin` (예: `/b/sw7Qx2mPa9Lk/admin`).
테스트 날 **2026-11-13(금)**: 일일 50개 + 주기 16개 = 66개, 5,220분.

## 내 PC에서 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에 접속합니다. Supabase 환경변수가 없으면 **로컬 저장 모드**(`.data/db.json`)로 동작하고, 처음 실행할 때 가상 데이터가 자동으로 들어갑니다. 로컬 데이터를 처음 상태로 되돌리려면 `.data` 폴더를 지우세요.

```bash
npm test        # 자동 배정 규칙(R1~R7)·양식 반영 테스트
npm run build   # 배포용 빌드 확인
```

## 현재 배포 상태

- Supabase 프로젝트 `work-assign` (서울, 무료) — `https://hmtoukjqpitanktvpgaa.supabase.co`
  - `schema.sql` 적용, 가상 데이터(2개 지사, 23명, 루틴 110개) 입력 완료
- Vercel 프로젝트 `work-assign` 생성 (함수 리전 서울 icn1, Node 22, `SUPABASE_URL` 입력 완료, 운영 주소는 공개·미리보기는 로그인 보호)
  - 남은 환경변수: `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (Vercel 화면에서 직접 입력)
- GitHub: https://github.com/eunpas/work-assign (main)
- 운영 주소: https://work-assign-beta.vercel.app — 가상 수원지사 `/b/sw7Qx2mPa9Lk`
  - Supabase 연결 완료 (`SUPABASE_SERVICE_ROLE_KEY` 입력됨, `SESSION_SECRET`은 자동 생성)

## 배포 (처음 한 번)

1. **Supabase**: 새 프로젝트 → SQL 편집기에서 `supabase/schema.sql` 실행 → `supabase/seed.sql` 실행 → Settings › API에서 프로젝트 URL과 `service_role` 키 복사
   - `seed.sql`은 `npm run seed:sql`로 다시 만들 수 있습니다 (비밀번호 해시가 매번 새로 생성됨).
2. **GitHub**: 새 저장소(예: `work-assign`)를 만들고 이 폴더를 올립니다.
3. **Vercel**: GitHub 저장소 Import → 환경변수 입력 → Deploy

   | 환경변수 | 내용 |
   |---|---|
   | `SUPABASE_URL` | Supabase 프로젝트 주소 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase 비밀 키 (**서버 전용, 절대 공개 금지**) |
   | `SESSION_SECRET` | (선택) 로그인 쿠키 서명용 무작위 문자열 32자 이상. 비우거나 `REPLACE_ME`면 Supabase 비밀 키에서 자동 생성 |

4. 발급된 주소 + `/b/sw7Qx2mPa9Lk` 로 접속해 확인합니다.
5. 이후에는 GitHub에 올리면 Vercel이 자동으로 다시 배포합니다.

> Vercel에서는 파일 저장이 유지되지 않으므로 반드시 Supabase 환경변수를 넣으세요.

## 구조

```
app/                         화면과 서버 기능 (Next.js App Router)
  page.tsx                   첫 화면 + 새 지사 만들기
  b/[code]/                  배정표 보기(링크 공개)
  b/[code]/admin/            관리자 로그인
  b/[code]/admin/(secure)/   배정하기 · 작업 루틴 · 팀원 · 부재 (로그인 필요)
  api/                       서버 API (모든 쓰기는 관리자 쿠키 확인)
lib/
  scheduler/assign.ts        자동 배정 (브라우저 실행, 1.5초 동안 순서를 바꿔 반복 개선)
  scheduler/validate.ts      규칙 위반 검사 (F13)
  excel/                     배정표 엑셀 · 입력 양식 만들기/읽기
  gsheet.ts                  구글 시트 불러오기 (공개 링크 xlsx 내보내기)
  db/                        Supabase / 로컬 저장소
supabase/                    schema.sql · seed.sql
tests/                       자동 배정·양식 테스트
```

## 보안 메모

- Supabase 표는 RLS를 켜고 공개 정책이 없습니다. 브라우저는 DB에 직접 접근하지 않고, 모든 요청은 Next.js 서버를 거칩니다.
- 관리자 쿠키는 HMAC 서명 · httpOnly · 12시간 유지입니다.
- 지사 링크가 곧 열람 권한입니다. 링크가 외부로 퍼지지 않게 주의하세요.
- 구글 시트 "링크가 있는 모든 사용자" 공유는 가상 데이터 테스트용입니다. 실제 인원 정보 전에는 서비스 계정 방식으로 바꾸세요.
