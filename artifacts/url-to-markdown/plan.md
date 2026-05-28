# URL → Markdown 변환기 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 본문 가져오기 위치 | Next.js Route Handler `app/api/convert/route.ts` (서버) | 외부 URL은 브라우저 CORS로 직접 fetch 불가. 서버 프록시가 표준 해법이며 Next 스택과 자연스럽게 맞물린다 |
| defuddle 실행 모드 | 서버 (Node) | 위와 같이 HTML 파싱·추출을 서버에서 끝내면 클라이언트가 받는 페이로드가 가볍고, 브라우저 DOM 차이로 인한 추출 편차가 사라진다 |
| Markdown 렌더링 | `react-markdown` + `remark-gfm` | spec "렌더링된 Markdown"을 만족하려면 실제 헤딩·리스트로 시각화가 필요. 작고 표준적인 선택 |
| 프롬프트 UI 컴포넌트 | shadcn `ToggleGroup` (single, deselectable) + 별도 Textarea | shadcn 규칙: 2-7개 옵션은 ToggleGroup. "직접 입력"은 ToggleGroup의 4번째 아이템, 선택 시 그 아래 Textarea 노출 |
| 토스트 | shadcn `sonner` | shadcn 규칙: 토스트는 sonner |
| 인라인 에러 표시 | shadcn `Field` data-invalid + `FieldDescription` | URL 입력은 폼 필드 — shadcn 폼 규칙(data-invalid + aria-invalid + FieldDescription)을 그대로 사용 |
| 상태 관리 | 페이지 루트 컴포넌트(Converter) 로컬 state (`useState`) | 단일 페이지·익명·비영속. 별도 store 불필요 |
| LLM 전달 URL 엔드포인트 | ChatGPT: `https://chatgpt.com/?q=<encoded>`, Claude: `https://claude.ai/new?q=<encoded>` | 표준 query 파라미터. Task 8에서 실제 동작을 한 번 확인 후 확정 |
| LLM "클립보드 복사 후 열기" 시 새 탭 | `window.open(host, "_blank")` + `navigator.clipboard.writeText(...)` | 두 작업을 같은 사용자 클릭 이벤트 안에서 실행 (브라우저 팝업 차단 회피) |
| 파일명 규칙 | 제목 있으면 `<slug(title)>.md`, 없으면 `<host>-<path-segments joined>.md` | spec 시나리오 6 성공 기준에 정확히 일치. slug는 영숫자·하이픈 외 → `-`, 연속 하이픈 1개로 압축 |
| 다크모드 토글 위치/저장 | 페이지 우상단 `ThemeToggle`, `next-themes` 사용 (이미 layout.tsx에서 ThemeProvider wired) | spec "새로고침 후 유지" → next-themes localStorage가 자동 처리 |
| 디렉토리 배치 | CLAUDE.md 순서(types → lib → services → components → app) 준수 | 순환 의존 방지 |
| 테스트 경계 | 추출/변환은 fixture HTML (실파일), URL 검증·파일명·LLM 텍스트는 순수 함수 단위테스트, E2E 1개로 happy path (API는 Playwright `route()`로 인터셉트해 결정성 확보) | "기준을 가리지 않는 가장 낮은 경계" 원칙 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| 외부 URL 본문 fetch | 서버 fetch (Edge가 아닌 Node 런타임) | `app/api/convert/route.ts` 상단 `export const runtime = "nodejs"` | Task 1 |

(env var, OAuth, 외부 서비스 키 없음)

## 데이터 모델

### ConvertSuccess
- title?: string
- author?: string
- markdown: string
- url: string (요청에 사용한 원본 URL — fallback 제목 계산용)

### ConvertError
- kind: `"fetch_failed" | "extract_failed"`
- message: string

### PromptState
- choice: `"summarize" | "translate_ko" | "explain_simple" | "custom" | null`
- customText: string (choice === "custom"일 때만 의미 있음)

### ConvertResult (UI 상태)
- status: `"idle" | "loading" | "success" | "error"`
- data?: ConvertSuccess
- error?: ConvertError

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| shadcn | Task 2, 6, 7, 8, 9 | 컴포넌트 추가 (`sonner`, `toggle-group`) — `bunx --bun shadcn@latest add ...`. tsx 작성 시 `.claude/skills/shadcn/rules/` 준수 (FieldGroup+Field, data-invalid, data-icon, no className-override) |
| next-best-practices | Task 1, 2 | Route Handler 패턴, `"use client"` 경계, async patterns, runtime 선택 |
| vercel-react-best-practices | Task 2-9 | useState 패턴, 불필요한 re-render 방지 (특히 onChange 이벤트 다수) |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/conversion.ts` | New | 1 |
| `types/prompt.ts` | New | 7 |
| `lib/extract.ts` | New | 1 (Modify: 5) |
| `lib/extract.test.ts` | New | 1 (Modify: 5) |
| `lib/urlValidation.ts` | New | 3 |
| `lib/urlValidation.test.ts` | New | 3 |
| `lib/filename.ts` | New | 6 |
| `lib/filename.test.ts` | New | 6 |
| `lib/llmTransfer.ts` | New | 8 |
| `lib/llmTransfer.test.ts` | New | 8 |
| `services/convertUrl.ts` | New | 2 |
| `app/api/convert/route.ts` | New | 1 (Modify: 4) |
| `app/api/convert/__tests__/route.test.ts` | New | 1 (Modify: 4) |
| `app/page.tsx` | Modify | 2 |
| `app/layout.tsx` | Modify | 6 (Sonner Toaster 마운트) |
| `components/url-to-markdown/Converter.tsx` | New | 2 (Modify: 3, 4, 5, 6, 7, 8, 9) |
| `components/url-to-markdown/Converter.test.tsx` | New | 2 (Modify: 3, 4) |
| `components/url-to-markdown/PromptSelector.tsx` | New | 7 |
| `components/url-to-markdown/PromptSelector.test.tsx` | New | 7 |
| `components/url-to-markdown/LLMDialog.tsx` | New | 8 |
| `components/url-to-markdown/LLMDialog.test.tsx` | New | 8 |
| `components/url-to-markdown/ThemeToggle.tsx` | New | 9 |
| `components/url-to-markdown/ThemeToggle.test.tsx` | New | 9 |
| `e2e/url-to-markdown.spec.ts` | New | 10 |
| `artifacts/url-to-markdown/fixtures/article.html` | New | 1 (테스트 픽스처) |
| `artifacts/url-to-markdown/fixtures/no-meta.html` | New | 5 |
| `package.json` | Modify | 1 (defuddle, react-markdown, remark-gfm), 6 (sonner via shadcn), 7 (toggle-group via shadcn) |

## Tasks

### Task 1: 본문 추출 API (defuddle 통합 + Route Handler)

- **담당 시나리오**: Scenario 1 (서버 슬라이스만 — happy path)
- **크기**: M (5 파일 + 1 fixture)
- **의존성**: None — **plan 전체에서 가장 고위험 작업**. fail-fast로 가장 먼저 검증한다 (defuddle Node 모드가 기대한 markdown을 내지 않으면 plan 자체를 재조정)
- **참조**:
  - skill: `shadcn` (해당 없음 — 순수 서버 코드)
  - skill: `next-best-practices` (Route Handler, runtime 선택)
  - 외부: defuddle README — `npm view defuddle`로 최신 API 확인 후 import
- **구현 대상**:
  - `types/conversion.ts` — `ConvertSuccess`, `ConvertError` 타입
  - `lib/extract.ts` — `extractFromHtml(html, sourceUrl): ConvertSuccess` (defuddle 호출 + markdown 결과 추출)
  - `lib/extract.test.ts` — fixture HTML 입력 → 제목·저자·markdown 단언
  - `app/api/convert/route.ts` — `POST { url } → ConvertSuccess | ConvertError`, `runtime = "nodejs"`
  - `app/api/convert/__tests__/route.test.ts` — route 함수를 직접 import해 `Request` 객체로 호출, fixture URL로 happy path만 검증
  - `artifacts/url-to-markdown/fixtures/article.html` — 제목·저자·본문 갖춘 정상 기사 HTML
  - `package.json` — `bun add defuddle react-markdown remark-gfm` (react-markdown은 Task 2에서 쓰지만 함께 설치)
- **수용 기준**:
  - [ ] fixture HTML을 `extractFromHtml`에 넣으면 `title`, `author`, `markdown` 세 필드가 모두 채워져 반환된다 (Vitest)
  - [ ] `POST /api/convert { url: "<fixture URL>" }` 응답 body에 `title`·`author`·`markdown`이 포함되고 markdown은 fixture의 핵심 문단 일부를 포함한다 (Vitest, route 핸들러 직접 호출)
- **검증**:
  - `bun run test -- lib/extract app/api/convert`
  - `bun run build` (Route Handler 빌드 통과)

---

### Task 2: 변환 UI 최소 흐름 (UI + API 통합)

- **담당 시나리오**: Scenario 1 (full — UI 포함 happy path)
- **크기**: M (4 파일)
- **의존성**: Task 1 (API가 있어야 호출할 대상이 생긴다)
- **참조**:
  - skill: `shadcn` — Field, FieldGroup, Input, Button, Card, Empty 사용. `data-icon` 패턴
  - skill: `next-best-practices` — `"use client"` (Converter는 useState 사용)
  - skill: `vercel-react-best-practices` — `rerender-functional-setstate`
- **구현 대상**:
  - `services/convertUrl.ts` — `convertUrl(url): Promise<ConvertSuccess | ConvertError>`. fetch `/api/convert`
  - `components/url-to-markdown/Converter.tsx` — `"use client"`. URL Input + 변환/지우기 Button + 로딩 표시 + 결과 영역 (`react-markdown` 렌더). 헤더(`<h1>title</h1>` + `<p>by author</p>`). **이 시점의 placeholder**: 우상단 ThemeToggle 자리는 빈 Button(아이콘만, 클릭 시 no-op) — Task 9에서 실제 토글로 교체. "지우기" 버튼도 no-op — Task 9에서 handleClear 연결
  - `components/url-to-markdown/Converter.test.tsx` — React Testing Library + `convertUrl` mock. (a) 변환 클릭 → 버튼 disabled + 로딩 표시, (b) 응답 후 결과 헤더와 markdown 본문 노출, (c) 액션 버튼 4개 표시 (이 시점은 클릭만 가능, 내부 동작은 Task 6, 8에서 채움)
  - `app/page.tsx` — placeholder를 `<Converter />` 렌더로 교체
- **수용 기준**:
  - [ ] 본문이 있는 일반 기사 URL을 입력하고 "변환"을 누르면 결과 영역에 헤더(제목 텍스트)와 react-markdown으로 렌더링된 본문이 표시된다 (Vitest+RTL, `convertUrl` mock)
  - [ ] 변환이 진행되는 동안 "변환" 버튼은 disabled가 되고 진행 표시(spinner 또는 "변환 중…" 라벨)가 보인다 (RTL)
  - [ ] 변환 성공 후 결과 옆/아래에 4개의 액션 버튼(복사, .md 다운로드, ChatGPT로 열기, Claude로 열기)이 렌더된다 — 클릭 동작은 후속 Task. (RTL: 단순 존재 확인)
- **검증**:
  - `bun run test -- components/url-to-markdown/Converter`
  - 수동: `bun run dev` → `http://localhost:3000` → 임의 URL 입력해 결과 렌더 확인

---

### Task 3: URL 포맷 검증 + 빈 입력 처리

- **담당 시나리오**: Scenario 2 (full)
- **크기**: S (3 파일)
- **의존성**: Task 2
- **참조**:
  - skill: `shadcn` — `Field data-invalid` + `aria-invalid` + `FieldDescription` 패턴 (rules/forms.md)
- **구현 대상**:
  - `lib/urlValidation.ts` — `isValidHttpUrl(input: string): boolean` (`URL` 생성자 + `protocol in {http:, https:}`)
  - `lib/urlValidation.test.ts` — 빈, `not a url`, `https://example.com`, `ftp://...` 등
  - `components/url-to-markdown/Converter.tsx` (Modify) — onChange마다 검증, `data-invalid` + `aria-invalid` + `FieldDescription` 노출, 변환 버튼 disabled 토글
  - `components/url-to-markdown/Converter.test.tsx` (Modify) — 검증 케이스 추가
- **수용 기준**:
  - [ ] 빈 입력 → "변환" 버튼 disabled, 에러 메시지 없음 (FieldDescription 미렌더)
  - [ ] `not a url` 입력 → "변환" disabled + 입력란 아래 "올바른 URL을 입력하세요" 형태의 메시지
  - [ ] 유효한 `https://...` 입력 → 메시지 제거 + "변환" 활성화
- **검증**:
  - `bun run test -- lib/urlValidation components/url-to-markdown/Converter`

---

### Task 4: 변환 실패 처리 (인라인 에러 + URL 보존)

- **담당 시나리오**: Scenario 3 (full)
- **크기**: S (3 파일)
- **의존성**: Task 2, Task 3 (검증 통과 후 시도해야 실패가 의미를 가짐)
- **참조**:
  - skill: `next-best-practices` — Route Handler error handling
  - skill: `shadcn` — 같은 Field 패턴 (서버 에러도 같은 인라인 위치)
- **구현 대상**:
  - `app/api/convert/route.ts` (Modify) — fetch 실패는 `{kind:"fetch_failed"}`, defuddle 추출 결과가 비었거나 본문 누락이면 `{kind:"extract_failed"}` (HTTP 200으로 응답, 에러 본문 포함 — 클라이언트에서 처리)
  - `app/api/convert/__tests__/route.test.ts` (Modify) — 잘못된 host(`http://localhost:1`), 본문 없는 HTML(`<html><body></body></html>`) 두 케이스 추가
  - `components/url-to-markdown/Converter.tsx` (Modify) — 에러 응답 시 결과 영역 비움, `FieldDescription`에 에러 메시지, URL 입력값 유지, 변환 버튼 재활성화
- **수용 기준**:
  - [ ] 가져오기 실패 → 입력란 아래 네트워크 오류 메시지, 결과 영역 비어 있음
  - [ ] 추출 실패(본문 없음) → 입력란 아래 추출 오류 메시지, 결과 영역 비어 있음
  - [ ] 실패 후 URL 값은 입력란에 그대로 보존된다
  - [ ] 실패 후 "변환" 버튼은 다시 활성화되어 재시도 가능
- **검증**:
  - `bun run test -- app/api/convert components/url-to-markdown/Converter`

---

### Task 5: 메타데이터 누락 fallback

- **담당 시나리오**: Scenario 4 (full)
- **크기**: S (3 파일 + 1 fixture)
- **의존성**: Task 1 (extract.ts), Task 2 (Converter 렌더)
- **참조**: 없음 (순수 데이터 fallback)
- **구현 대상**:
  - `lib/extract.ts` (Modify) — title/author를 optional로 반환. defuddle이 빈 값을 주면 undefined
  - `lib/extract.test.ts` (Modify) — 누락 케이스 fixture 두 종 (제목만 없음, 둘 다 없음)
  - `artifacts/url-to-markdown/fixtures/no-meta.html` — 제목/저자 모두 없는 본문만 있는 HTML
  - `components/url-to-markdown/Converter.tsx` (Modify) — title 없으면 헤더에 원본 URL 표시, author 없으면 저자 줄 자체 미렌더
- **수용 기준**:
  - [ ] 제목 없음 + 저자 있음 → 헤더에 원본 URL과 저자
  - [ ] 제목 있음 + 저자 없음 → 헤더에 제목만, 저자 줄 없음 (DOM에 부재)
  - [ ] 제목 없음 + 저자 없음 → 헤더에 원본 URL만
- **검증**:
  - `bun run test -- lib/extract components/url-to-markdown/Converter`

---

### Checkpoint A: Tasks 1-5 이후

- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 변환 → 결과 표시 → 검증·실패·메타 누락이 통합 동작 (수동 확인: dev 서버에서 정상 URL, 잘못된 URL, 본문 없는 URL을 차례로 시도)

---

### Task 6: 액션 — Markdown 복사 + .md 다운로드

- **담당 시나리오**: Scenario 5 (full), Scenario 6 (full)
- **크기**: M (4 파일)
- **의존성**: Task 2 (액션 버튼 자리), Task 5 (제목 없을 때 URL 기반 파일명)
- **참조**:
  - skill: `shadcn` — `sonner` 설치, `toast()` 사용
  - 외부: 없음
- **구현 대상**:
  - `lib/filename.ts` — `deriveFilename(title: string|undefined, url: string): string` (slugify: 영숫자·하이픈 외 → `-`, 연속 하이픈 압축, `.md` 확장자)
  - `lib/filename.test.ts` — `"How React Works" + url → "How-React-Works.md"`, `undefined + "https://example.com/blog/post" → "example.com-blog-post.md"`
  - `components/url-to-markdown/Converter.tsx` (Modify) — 복사 버튼: `navigator.clipboard.writeText(markdown)` + `toast.success("Markdown이 복사되었습니다")`. 다운로드 버튼: `Blob`+`URL.createObjectURL`+익명 `<a download>` 클릭 패턴
  - `app/layout.tsx` (Modify) — Sonner `<Toaster />` 추가
  - shadcn 설치: `bunx --bun shadcn@latest add sonner`
- **수용 기준**:
  - [ ] 복사 직후 클립보드 내용 = 변환된 Markdown 본문 (프롬프트 선택 여부 무관 — 본문만). Vitest에서 `navigator.clipboard.writeText` spy로 인자 확인
  - [ ] 복사 완료 토스트가 표시된다 (RTL: sonner의 알림 텍스트 노출 검증)
  - [ ] 제목 "How React Works" → `deriveFilename` 결과 = `"How-React-Works.md"`
  - [ ] 제목 없음 + URL `https://example.com/blog/post` → `deriveFilename` 결과 = `"example.com-blog-post.md"`
  - [ ] 다운로드 버튼 클릭 시 생성된 Blob의 content = Markdown 본문 (Vitest에서 `URL.createObjectURL` spy로 Blob 인자 확인 — 실제 파일 열기 대신 Blob 콘텐츠로 동등 증명)
- **검증**:
  - `bun run test -- lib/filename components/url-to-markdown/Converter`

---

### Task 7: 프롬프트 선택 (프리셋 3종 + 직접 입력)

- **담당 시나리오**: Scenario 8 (full), Scenario 9 (full)
- **크기**: M (4 파일)
- **의존성**: Task 2
- **참조**:
  - skill: `shadcn` — `ToggleGroup` (type="single", 해제 가능), `Textarea`, `Field`. rules/forms.md, rules/base-vs-radix.md (ToggleGroup defaultValue/type 차이)
- **구현 대상**:
  - `types/prompt.ts` — `PromptChoice`, `PROMPT_PRESETS: {id, label, text}[]` (요약해줘 / 한국어로 번역해줘 / 쉽게 설명해줘)
  - `components/url-to-markdown/PromptSelector.tsx` — props: `value: PromptState`, `onChange(next): void`. ToggleGroup 4개 아이템(3 프리셋 + "직접 입력"). "직접 입력" 선택 시 그 아래 Textarea
  - `components/url-to-markdown/PromptSelector.test.tsx` — (a) 한 번에 하나만 활성, (b) 같은 옵션 재클릭 → 해제, (c) 직접 입력 선택 → 텍스트 인풋 표시, (d) 다른 옵션 선택 시 Textarea 닫힘
  - `components/url-to-markdown/Converter.tsx` (Modify) — `PromptState` state 추가, `<PromptSelector value={...} onChange={...} />` 결과 영역 내부에 배치
  - `components/url-to-markdown/Converter.test.tsx` (Modify) — 위 "불변 규칙 잠금" 수용 기준의 케이스 두 개 추가 (프롬프트 선택 상태에서 복사·다운로드 → Markdown만)
- **수용 기준**:
  - [ ] 프리셋 3종("요약해줘", "한국어로 번역해줘", "쉽게 설명해줘") 중 하나를 선택할 수 있고 한 번에 하나만 선택된다
  - [ ] 선택 해제 가능 (같은 옵션 재클릭 → `choice: null`)
  - [ ] "직접 입력" 선택 → Textarea 표시, 기존 프리셋 선택 해제
  - [ ] 페이지 새로고침 후 PromptState는 초기값 (`{choice: null, customText: ""}`) — 컴포넌트 로컬 state라 자동 충족. RTL에서 mount 시 초기값 검증으로 갈음
  - [ ] 직접 입력 텍스트가 빈 문자열인 상태에서 LLM 액션 호출 → 전달 텍스트가 Markdown 본문만 (Task 8에서 함께 검증)
  - [ ] **불변 규칙 잠금**: `PromptState.choice = "summarize"`로 설정한 상태에서 "복사" 버튼 클릭 → `navigator.clipboard.writeText` 인자는 프롬프트 없는 순수 Markdown 본문 (Converter.test.tsx Modify에 케이스 추가). 마찬가지로 ".md 다운로드" 클릭 → Blob 콘텐츠도 프롬프트 없는 순수 Markdown
- **검증**:
  - `bun run test -- components/url-to-markdown/PromptSelector components/url-to-markdown/Converter`

---

### Task 8: LLM 전달 — 다이얼로그 + 두 방식 (ChatGPT/Claude)

- **담당 시나리오**: Scenario 7 (full), Scenario 8 (LLM 전달 부분), Scenario 9 (LLM 전달 부분)
- **크기**: M (5 파일)
- **의존성**: Task 6 (sonner 마운트, 클립보드 패턴), Task 7 (PromptState 입력)
- **참조**:
  - skill: `shadcn` — `Dialog` (DialogTitle 필수, sr-only 가능), `Button`
  - 외부: ChatGPT (`https://chatgpt.com/?q=`), Claude (`https://claude.ai/new?q=`). Task 8 첫 수동 검증 시 실제 URL이 텍스트를 받아 채팅을 열어주는지 확인
- **구현 대상**:
  - `lib/llmTransfer.ts` — `buildTransferText(promptState, markdown): string` (불변 규칙: 프롬프트 있으면 `<text>\n\n<markdown>`, 없으면 `<markdown>` 그대로). `buildLLMUrl(host: "chatgpt"|"claude", text): string` (URL 인코딩)
  - `lib/llmTransfer.test.ts` — (a) 프리셋 선택 → `"한국어로 번역해줘\n\n<md>"`, (b) 직접 입력 → 입력 텍스트 + `\n\n<md>`, (c) 미선택 → `<md>` 그대로 (앞 줄바꿈 없음), (d) 직접 입력 빈 문자열 → 미선택과 동일 (md만), (e) URL 빌더가 `?q=` 인코딩 정확
  - `components/url-to-markdown/LLMDialog.tsx` — props: `host: "chatgpt"|"claude"`, `transferText: string`, `open`, `onOpenChange`. shadcn Dialog 내부에 두 옵션 버튼 + 다이얼로그 하단에 **전달 텍스트 미리보기 블록**(wireframe Screen 8 참조 — `<code>` 박스에 `transferText`를 그대로 표시; 너무 길면 `line-clamp-3` 등으로 축약). "클립보드 복사 후 열기" 클릭 → `clipboard.writeText` + `window.open(hostUrl, "_blank")`. "URL 파라미터로 전달" → `window.open(buildLLMUrl(host, text), "_blank")`
  - `components/url-to-markdown/LLMDialog.test.tsx` — 두 버튼 클릭별 `clipboard.writeText`·`window.open` spy 인자 확인. **host="chatgpt"·"claude" 두 케이스 각각 작성** — `window.open` URL이 각각 `chatgpt.com`·`claude.ai/new`를 포함하는지 단언. 미리보기 블록이 transferText를 렌더하는지 단언
  - `components/url-to-markdown/Converter.tsx` (Modify) — "ChatGPT로 열기" / "Claude로 열기" 버튼 → 다이얼로그 open. `buildTransferText`로 전달 텍스트 미리 계산해 prop으로 전달
- **수용 기준**:
  - [ ] "ChatGPT로 열기" 클릭 → "클립보드 복사 후 열기" / "URL 파라미터로 전달" 두 옵션이 보이는 다이얼로그
  - [ ] "클립보드 복사 후 열기" 선택 → `clipboard.writeText`에 `<prompt>\n\n<markdown>` (또는 prompt 없으면 markdown만) 전달 + `window.open`이 `chatgpt.com/` 호스트로 호출
  - [ ] "URL 파라미터로 전달" 선택 → `window.open`이 `chatgpt.com/?q=<encoded text>`로 호출
  - [ ] 프롬프트 미선택 상태에서 전달 텍스트 = Markdown 본문만 (앞 줄바꿈 없음) — `buildTransferText` 단위 테스트로 증명
  - [ ] "Claude로 열기"도 같은 흐름 — 호스트만 `claude.ai/new`
- **검증**:
  - `bun run test -- lib/llmTransfer components/url-to-markdown/LLMDialog components/url-to-markdown/Converter`
  - 수동(Task 8 1회): 변환 후 ChatGPT/Claude 각각 두 방식 → 실제 새 탭이 의도한 LLM 화면으로 열리고 텍스트가 채팅에 들어가는지 확인 (한 번 통과하면 결정성 유지)

---

### Checkpoint B: Tasks 6-8 이후

- [ ] `bun run test`, `bun run build` 통과
- [ ] 결과 화면에서 복사·다운로드·프롬프트 선택·LLM 전달 다이얼로그가 모두 동작
- [ ] 불변 규칙(복사/다운로드는 Markdown만, LLM 전달은 spec 형식) 단위 테스트로 잠금

---

### Task 9: 지우기 + 다크모드 토글

- **담당 시나리오**: Scenario 10 (full), Scenario 11 (full)
- **크기**: S (3 파일)
- **의존성**: Task 6, 7, 8 (지우기는 모든 상태를 리셋해야 하므로 prompt·result까지 갖춰진 후)
- **참조**:
  - skill: `shadcn` — `Button` variant
  - 외부: `next-themes` (이미 layout.tsx에 wired) — `useTheme()` hook
- **구현 대상**:
  - `components/url-to-markdown/ThemeToggle.tsx` — `useTheme()`. `Sun01Icon`/`Moon01Icon` (hugeicons). 하이드레이션 mismatch 방지 위해 mounted state로 첫 렌더 가드
  - `components/url-to-markdown/ThemeToggle.test.tsx` — render + click 시 setTheme 호출 검증 (next-themes mock)
  - `components/url-to-markdown/Converter.tsx` (Modify) — `handleClear`: URL/result/error/promptState 전부 초기값으로 setState. `<ThemeToggle />` 우상단 배치
- **수용 기준** (Scenario 10):
  - [ ] 지우기 후 URL 입력란 = 빈 문자열, 결과 영역 미렌더
  - [ ] 지우기 후 인라인 에러가 있었다면 사라진다 (FieldDescription 미렌더)
  - [ ] 지우기 후 PromptState = `{choice: null, customText: ""}`
  - [ ] 다크모드 토글 상태는 지우기 영향 없음 (next-themes localStorage 별도)
- **수용 기준** (Scenario 11):
  - [ ] 다크모드로 전환 → `<html>`에 `class="dark"` 추가 → 배경·텍스트 다크 팔레트 (globals.css `.dark` 토큰)
  - [ ] 새로고침 후에도 다크모드 유지 (next-themes localStorage)
  - [ ] 라이트로 되돌리고 새로고침 → 라이트 모드 유지
- **검증**:
  - `bun run test -- components/url-to-markdown/Converter components/url-to-markdown/ThemeToggle`
  - 새로고침 영속성은 Task 10 Playwright에서 함께 검증

---

### Task 10: E2E 통합 (Playwright happy path)

- **담당 시나리오**: Scenarios 1, 5, 7, 11 (실제 브라우저 흐름 — 클립보드·새 탭·테마 영속)
- **크기**: S (1 파일)
- **의존성**: Task 1-9 전부
- **참조**:
  - 외부: `playwright.config.ts` (이미 `bun run dev` webServer 설정)
- **구현 대상**:
  - `e2e/url-to-markdown.spec.ts`:
    1. `page.goto("/")`
    2. `page.route("**/api/convert", route → route.fulfill({json: <fixture success>}))` — API mock으로 결정성 확보
    3. URL 입력 → 변환 → 결과 헤더·markdown body가 보임
    4. 복사 클릭 → 클립보드 권한 부여(`context.grantPermissions(['clipboard-read'])`) 후 `navigator.clipboard.readText()` 값 = markdown
    5. ChatGPT로 열기 → 다이얼로그 두 옵션 표시 → "URL 파라미터로 전달" 선택 → 새 탭이 `chatgpt.com`을 향한 URL로 열림 (`context.waitForEvent('page')`로 popup 확인, **외부 URL로 실제 이동은 하지 않음** — popup의 URL 문자열만 단언 후 close)
    6. 다크모드 토글 → `<html class="dark">` 확인 → `page.reload()` → 여전히 `class="dark"`
- **수용 기준**:
  - [ ] 위 6단계 시나리오가 한 spec 안에서 모두 통과
- **검증**:
  - `bun run test:e2e`

---

### Checkpoint C: 최종

- [ ] `bun run test` (Vitest) 통과
- [ ] `bun run test:e2e` (Playwright) 통과
- [ ] `bun run build` 통과
- [ ] 수동(Browser MCP): dev 서버 띄워서 wireframe.html과 실제 UI를 Desktop/Mobile에서 비교 — 레이아웃이 와이어프레임과 의도적으로 일치하는지 확인. 캡처는 `artifacts/url-to-markdown/evidence/final-{desktop,mobile}.png`로 저장
- [ ] spec.md 11개 시나리오 성공 기준 일괄 점검 — 누락 없음 보고

---

## 미결정 항목

- **defuddle markdown 출력 보장**: defuddle 최신 버전이 markdown을 1차 출력으로 지원한다는 가정에 의존. Task 1에서 검증 후 만약 HTML만 나오면 `turndown`을 추가 dep으로 도입 (계획 영향 최소: `lib/extract.ts` 내부만 변경)
- **shadcn Empty / Spinner 컴포넌트**: 와이어프레임의 placeholder/스피너 자리에 shadcn `empty`·`spinner`를 쓸지, ad-hoc div로 둘지는 Task 2에서 결정. shadcn 규칙은 `Empty`/`Skeleton` 권장. 사용 시 `bunx --bun shadcn@latest add empty spinner` 추가.
- **LLM URL 파라미터의 길이 제한**: 긴 본문은 URL 파라미터 방식이 실패할 수 있다. 다이얼로그 안내문에 "긴 본문에는 클립보드 방식 권장"을 이미 명시했으나, 실제 한계 임계값(예: 8KB)에서 자동 fallback 할지는 MVP 범위 밖으로 둠.
