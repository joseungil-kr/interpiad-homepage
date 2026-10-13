# Interpiad AI Office — isolated cloud bootstrap (MVP)

Status: **source/bootstrap only; not deployed**. This directory is deliberately isolated from the Hugo site. Do **not** merge into `master` or publish a public URL until the security gate passes.

## Reuse choice

Reuse [basriayaz/pixel-office](https://github.com/basriayaz/pixel-office) (MIT, Node.js >=20) with upstream SHA pinned to `4ebfdc7e4538eb68ea987f57ccf2810bc488a39c`. The existing upstream provides the pixel office, Codex/Claude/Gemini agent execution, `list_colleagues`/`message_colleague`, meetings and task board. Avoid rewriting these features.

## Target architecture

```
Phone/desktop browser
  -> Cloudflare Access (identity policy; must be set up with owner's approval)
  -> Cloudflare Tunnel (authenticated origin route)
  -> 127.0.0.1:4747 Pixel Office on a 24/7 Linux VM
  -> Codex CLI (ChatGPT account sign-in, no API key assumed)
  -> isolated workspace (NO production tokens or mounts)
```

Pixel Office has **no native authentication**. Never bind the app to a public network address, port-forward it directly, or publish it without Access policy and successful proxy-origin/WebSocket tests. Pixel Office checks Host/Origin; custom domains behind Access/Tunnel require compatibility testing/configuration before exposure. A connected provider badge is not proof of a working agent turn.

## Installation prep (Linux VM, dedicated unprivileged OS user)

1. Create a dedicated unprivileged `ai-office` Linux user with no access to production Cloudflare/GitHub credentials. Create/provision the VM only after explicit approval.
2. Install Git and Node.js **20+**, and install Codex CLI using the official method after checking the current official instructions.
3. As `ai-office`, clone this repo/branch and run `bash ai-office/deploy/bootstrap.sh` from its working tree. The script checks out the **pinned upstream commit**, installs npm dependencies and seeds **5 Korean role definitions** in the Pixel Office home folder.
4. As the same `ai-office` user, perform an interactive **Codex CLI sign-in** (do not paste credentials into GitHub or this chat). In Pixel Office Settings -> Models, select Codex and confirm that an agent completes a read-only task.
5. The systemd unit template is `ai-office/deploy/interpiad-ai-office@.service`. Verify the Node path, unit account and working directory before enabling it. The service binds only to loopback.
6. The final remote URL is **not active yet**: Cloudflare Tunnel + Access policy need provisioned infrastructure and an approved identity policy. Verify upstream Host/Origin rules and WebSockets through Access before opening the URL.
7. Complete the acceptance checklist `ai-office/ACCEPTANCE.md` before access to any real business repo.

### Roles seeded

- `director`: 업무 분해/취합, 승인 대상 확인
- `researcher`: 시장·GitHub 자료 조사
- `builder`: 격리 작업공간 코드 수정
- `qa`: 테스트·독립 검증
- `watchdog`: 이상 탐지·진단

The seed is idempotent and will not overwrite existing agent prompts, memories or settings. It deliberately defaults to restrained permissions and a sandbox workspace. You must select an available Codex model for employees in the UI.

### Important limitations

- The upstream board **does not automatically start tasks**; the project manager is also not a background polling scheduler.
- A web-accessible office does not mean autonomous 24/7 execution. Add a durable queue/dispatcher **only after** the first verified end-to-end agent-to-agent conversation.
- ChatGPT sign-in use is subject to Codex plan limits and current terms; the VM costs money even if no AI API charges are incurred.
- Never copy browser session cookies, API secrets, local `~/.codex` tokens or production GitHub credentials into this public repository.
- This is **not** connected to live Site Factory actions; connect read-only status first, then explicitly scoped write actions after passing QA.

## Upstream license

Original code belongs to its authors and is MIT licensed. This kit references pinned upstream rather than copying its assets. Examine third-party graphics and dependencies before commercial redistribution.
