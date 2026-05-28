# url-to-markdown — execution learnings

---
category: task-ordering
applied: discarded
---
## plan 순서를 그대로 유지

**상황**: Step 2, Task 의존성을 식별하고 순서를 결정하는 단계.
**판단**: plan.md가 이미 Task 1(가장 고위험 defuddle 검증) → 2 → 3 → ... → 10 순으로 fail-fast 의존성을 깨끗하게 직선화해 둔 상태였다. 재정렬 이득이 없어 그대로 따랐다.
**다시 마주칠 가능성**: 낮음 — plan-reviewer를 거친 plan에서는 보통 재정렬이 불필요하다. 신호로만 남긴다.

---
category: tooling
applied: not-yet
---
## Vitest와 Playwright가 같은 디렉토리 패턴을 두고 충돌

**상황**: Task 6의 Vitest 풀 런에서 `e2e/smoke.spec.ts` 가 Vitest에 의해 수집됐다. `import { test } from "@playwright/test"` 가 Vitest 컨텍스트에서 평가되며 "two different versions of @playwright/test" 로 깨졌다.
**판단**: `vitest.config.ts` 의 `exclude` 에 `"e2e/**"` 를 추가했다. 두 러너가 같은 레포에 있으면 거의 항상 발생할 충돌이라 즉시 승격해야 한다고 봤고, `CLAUDE.md` Testing 섹션에 "Vitest는 colocated `*.test.tsx`, Playwright는 `e2e/*.spec.ts` 만 본다" 는 경계를 명문화하는 게 다음 feature를 안전하게 한다.
**다시 마주칠 가능성**: 높음 — 새 feature가 e2e 디렉토리에 spec을 추가할 때마다 vitest config가 동기화돼야 한다.

---
category: tooling
applied: not-yet
---
## sonner 가 jsdom 환경에서 `window.matchMedia` 를 요구

**상황**: Task 6 에서 Toaster를 마운트한 Converter 테스트가 `TypeError: window.matchMedia is not a function` 으로 실패. sonner 내부에서 시스템 테마 감지를 한다.
**판단**: `vitest.setup.ts` 에 matchMedia 스텁을 추가. 같은 스택(next-themes 도 matchMedia 를 쓸 수 있음)을 쓰는 다음 feature에도 재발 가능. 다만 한 줄 스텁이라 규칙화하기보다는 setup 파일에 그대로 남겨두고, 비슷한 jsdom 누락이 더 쌓이면 한 번에 회고하는 게 깔끔하다.
**다시 마주칠 가능성**: 중간.

---
category: tooling
applied: not-yet
---
## `userEvent.setup()` 이 자체 clipboard stub을 설치한다

**상황**: Task 6 의 "복사" 버튼 테스트에서 `Object.defineProperty(navigator, "clipboard", ...)` 를 setup 전에 했더니 호출 카운트가 0. 원인: `@testing-library/user-event` v14 `setup()` 이 내부에서 자체 clipboard 객체를 설치하며 우리가 먼저 박아둔 stub을 덮어쓴다.
**판단**: `vi.spyOn(window.navigator.clipboard, "writeText").mockResolvedValue(...)` 를 setup() 호출 **뒤에** 두는 방식으로 우회. user-event 가 깐 객체를 다시 spy 함.
**다시 마주칠 가능성**: 중간 — clipboard 를 다루는 다른 feature에서 동일하게 막힐 패턴. 한 번 더 마주치면 testing helper 로 묶거나 규칙으로 올려도 됨.

---
category: spec-ambiguity
applied: not-yet
---
## URL fallback 파일명은 host의 `.` 을 보존해야 함

**상황**: Task 6 의 `deriveFilename(undefined, "https://example.com/blog/post")` 첫 구현이 `example-com-blog-post.md` 를 반환해 spec 의 `example.com-blog-post.md` 와 어긋남.
**판단**: spec 시나리오 6 의 성공 기준에 `example.com-blog-post.md` 가 명시되어 있었고, 내가 slugify를 무차별로 적용하면서 `.` 까지 hyphen 으로 압축한 게 원인. host 는 dot 보존, path segment 만 slugify 하도록 분리. spec 의 예시 문자열이 곧 acceptance test 라는 점을 다시 확인.
**다시 마주칠 가능성**: 낮음 — 이 feature 한정. 다만 "spec 의 예시 문자열은 그대로 단언으로 옮긴다" 라는 일반 원칙은 다른 feature에도 유효하다.

---
category: tooling
applied: not-yet
---
## JSX attribute string literal 은 escape sequence를 처리하지 않는다

**상황**: Task 8 의 LLMDialog 테스트에서 `transferText="요약해줘\n\n# Title"` 로 prop을 넘겼더니 URL 파라미터 디코딩이 expected `"요약해줘\n\n# Title"` (실제 줄바꿈) 가 아닌 literal `요약해줘\n\n# Title` 로 와서 실패. JSX attribute의 문자열 리터럴은 JS escape를 처리하지 않는다.
**판단**: `transferText={"요약해줘\n\n# Title"}` (expression form) 으로 교체. 진단이 오래 걸린 케이스라 메모로 남긴다.
**다시 마주칠 가능성**: 중간 — 멀티라인/특수문자 fixture를 JSX prop으로 넘길 때 재발 가능.

---
category: code-review
applied: not-yet
---
## 임의 URL을 서버에서 fetch 하면 SSRF 표면이 열린다

**상황**: code-reviewer 가 `/api/convert` 의 fetch 가 사용자 입력 URL을 그대로 받아 내부 네트워크 (loopback, RFC1918, link-local, AWS IMDS 등) 로도 보낼 수 있다고 Critical 로 지적.
**판단**: hostname 기반 차단(localhost/0.0.0.0/127.*/10.*/172.16-31.*/192.168.*/169.254.*/.local)과 `redirect: "manual"`, `AbortSignal.timeout(10s)`, 5MB body cap을 한 번에 추가. DNS rebinding 까지는 막지 못하지만 단일 사용자 용도엔 충분하다고 판단. acceptance: 7개의 internal hostname 패턴에 대해 fetch 가 호출되지 않음을 단언하는 unit test 추가.
**다시 마주칠 가능성**: 높음 — 사용자 입력 URL을 서버가 직접 fetch 하는 패턴(미리보기/스크래핑/oEmbed)은 흔하고, 다음에 또 만들 때 같은 가드를 까는 게 표준이 되어야 한다.

---
category: code-review
applied: not-yet
---
## clipboard.writeText 는 항상 reject 가능 — 반드시 try/catch

**상황**: code-reviewer 가 `ResultPanel.handleCopy` 가 권한 거부 시 silent fail (uncaught promise rejection + 토스트 안 뜸) 한다고 Important 로 지적. `LLMDialog.handleCopyAndOpen` 은 동일 패턴을 이미 try/catch 로 감싸고 있어 일관성도 깨져 있었다.
**판단**: 두 곳 모두 try/catch + 실패 시 `toast.error("클립보드 복사에 실패했습니다")` 로 통일. 비슷한 액션 두 곳이 다른 에러 모델을 갖는 건 즉시 잡아야 할 신호.
**다시 마주칠 가능성**: 높음 — clipboard / Permissions API 계열은 거의 항상 reject 가능. 다음 코드에서 같은 패턴이 나오면 PR 단계에서 미리 잡고 싶다.

---
category: code-review
applied: discarded
---
## fetch 실패의 client-side silent reset

**상황**: code-reviewer 가 `convertUrl` 이 `fetch`/`json()` 의 throw를 잡지 않아 네트워크 오류 시 UI가 placeholder로 되돌아간다고 Important 로 지적.
**판단**: 둘 다 잡기로 결정 — `services/convertUrl.ts` 에 try/catch + `fetch_failed` 변환, 추가로 `services/convertUrl.test.ts` 에 throw 케이스 단위 테스트 작성. 단순 누락이라 규칙화 가치는 약함.
**다시 마주칠 가능성**: 낮음 (이 feature 한정).
