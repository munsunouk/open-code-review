# Agent Cloud (Cursor/Codex) — fork ocr 설치

Cursor Cloud Agent 또는 Codex Cloud 같은 host-agent 격리 VM 환경의 **기존 환경**(예: eggtranslate)에 alibaba npm 패키지가 아닌 **fork 브랜치**의 `ocr`을 추가하는 방법입니다.

host-agent 경로(`ocr agent prepare` …)는 OCR LLM provider/API key가 **필요 없습니다**.

## 전제

- Cursor Dashboard → **Cloud Agents** 또는 Codex Cloud 환경이 이미 구성되어 있음
- fork: `https://github.com/munsunouk/open-code-review.git`
- 브랜치: `cursor-agent-adapter`
- VM에 **Go 1.25+** 필요 (`go.mod` 기준). Dockerfile/base image에 없으면 추가

## 방법 1: install 명령에 clone 빌드 추가 (가장 단순)

eggtranslate 환경의 **Install / update command** 끝에 아래를 이어 붙입니다.
(기존 `pnpm install` 등은 그대로 두고 `&&`로 연결)

```bash
&& bash -c "$(curl -fsSL https://raw.githubusercontent.com/munsunouk/open-code-review/cursor-agent-adapter/scripts/agent-cloud-install-ocr.sh)"
```

스크립트는 기본으로 fork를 shallow clone한 뒤 `/usr/local/bin/ocr`에 빌드합니다.

fork URL/브랜치를 바꿀 때:

```bash
&& OCR_FORK_URL=https://github.com/munsunouk/open-code-review.git \
   OCR_BRANCH=cursor-agent-adapter \
   bash -c "$(curl -fsSL https://raw.githubusercontent.com/munsunouk/open-code-review/cursor-agent-adapter/scripts/agent-cloud-install-ocr.sh)"
```

## 방법 2: multi-repo — open-code-review를 두 번째 repo로 추가

eggtranslate만으로 리뷰 대상이 부족하지 않고, **항상 같은 fork 빌드**를 쓰고 싶을 때:

1. Cloud Agents 환경에 repo 추가  
   - `munsunouk/eggtranslate` (또는 실제 repo)  
   - `munsunouk/open-code-review` → branch `cursor-agent-adapter`
2. Install 명령 예시 (clone된 디렉터리 이름은 대시보드에 표시된 경로에 맞게 조정):

```bash
pnpm install \
  && OCR_SOURCE=checkout OCR_REPO_DIR=open-code-review bash -c "$(curl -fsSL https://raw.githubusercontent.com/munsunouk/open-code-review/cursor-agent-adapter/scripts/agent-cloud-install-ocr.sh)"
```

`OCR_REPO_DIR`은 VM에서 `open-code-review`가 checkout된 상대 경로입니다.

## 방법 3: eggtranslate repo에 `.cursor/environment.json`으로 고정

eggtranslate 저장소에 커밋해 팀 전체가 같은 Cloud 설정을 쓰게 할 수 있습니다.

```json
{
  "install": "pnpm install && bash -c \"$(curl -fsSL https://raw.githubusercontent.com/munsunouk/open-code-review/cursor-agent-adapter/scripts/agent-cloud-install-ocr.sh)\""
}
```

Dockerfile을 쓰는 환경이면 Go 설치를 Dockerfile에 넣고, `install`에는 위 스크립트만 두면 됩니다.

## Dockerfile에 Go가 없을 때

`.cursor/Dockerfile` 예시:

```dockerfile
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y curl git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Go 1.25+ — 버전은 go.mod에 맞게 pin
RUN curl -fsSL https://go.dev/dl/go1.25.5.linux-amd64.tar.gz \
  | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"
```

## 확인

환경 저장 후 Cloud Agent를 한 번 띄우고:

```bash
which ocr
ocr version
ocr agent prepare --preview
```

## Open Code Review skill과 함께 쓰기

`ocr`만 설치해도 agent가 `ocr agent …` 워크플로를 실행할 수 있습니다.
Cursor plugin/skill을 쓰려면 fork의 Cursor plugin을 marketplace에 추가하거나,
eggtranslate의 `AGENTS.md`에 host-agent 리뷰 절차를 적어 두세요.

```markdown
## Agent Cloud specific instructions

Code review: run `ocr agent prepare --format json`, review, then
`ocr agent validate-comments` and `ocr agent report`. No OCR LLM API key required.
```

## alibaba npm과의 차이

| | `@alibaba-group/open-code-review` (npm) | fork 소스 빌드 |
|---|---|---|
| 출처 | upstream 릴리스 바이너리 | `munsunouk/open-code-review@cursor-agent-adapter` |
| Cursor adapter 변경 | 반영 안 됨 | fork 브랜치 그대로 반영 |
| Cloud install | `npm install -g …` | `scripts/agent-cloud-install-ocr.sh` |

## 스크립트 위치

Canonical: [`scripts/agent-cloud-install-ocr.sh`](../scripts/agent-cloud-install-ocr.sh)
Compatibility wrappers: [`scripts/cursor-cloud-install-ocr.sh`](../scripts/cursor-cloud-install-ocr.sh), [`scripts/codex-cloud-install-ocr.sh`](../scripts/codex-cloud-install-ocr.sh)

환경 변수: `OCR_SOURCE`, `OCR_FORK_URL`, `OCR_BRANCH`, `OCR_REPO_DIR`, `OCR_INSTALL_DIR`.
