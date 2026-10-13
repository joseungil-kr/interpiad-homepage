# Interpiad AI Office — acceptance gates

## Gate 0 — code readiness (this branch only)
- [x] Reuse an identifiable upstream implementation, pin commit SHA and license.
- [x] Isolate changes from the production Hugo site (feature branch only).
- [x] Provide a bootstrap script, five role profiles and an OS service template.
- [ ] Execute npm install/typecheck on the **actual target VM**.
- [ ] Run the seeded roles and verify model login (not yet possible without VM and interactive identity approval).

## Gate 1 — local binding & agent function
- [ ] Node.js >= 20 and pinned upstream are installed under unprivileged user.
- [ ] App listens **only** on 127.0.0.1:4747 (verify ss/netstat).
- [ ] Provider is Connected and researcher responds to a read-only file listing.
- [ ] The researcher actually sends a message via message_colleague to QA.
- [ ] QA sees the message in its own chat and independently replies.
- [ ] Restart the systemd service and verify chat history/memory persist.
- [ ] 5 simultaneous agents do not crash the VM; measure RAM/swap.

## Gate 2 — web auth (requires explicit owner authorization)
- [ ] Cloudflare Access **Self-hosted** app is created FIRST for the exact hostname.
- [ ] Allow policy restricted to owner-approved identities, default deny for everyone else.
- [ ] Cloudflare Tunnel routes only to 127.0.0.1:4747; no open firewall port.
- [ ] Configure Tunnel Protect with Access/JWT validation and verify denied requests.
- [ ] Test Pixel Office's Host/Origin checks through the proxy; adapt narrowly if needed, NEVER disable them.
- [ ] Anonymous user receives Access denial, authenticated user loads UI and WebSocket.
- [ ] Authenticated user can chat and receive worker progress from phone/PC.

## Gate 3 — Site Factory (separate integration)
- [ ] Read-only job state adapter tested with real GitHub Actions/Factory Control data.
- [ ] Job state is shown as running / waiting / failed / completed, with source evidence.
- [ ] One isolated test task is dispatched to the builder and independently verified by QA.
- [ ] No broad GitHub token, production secrets or uncontrolled write privileges in VM.
- [ ] QUARANTINE after repeated failures; no uncontrolled repeated retries.
- [ ] An optional durable scheduler is engineered and tested. Upstream task board alone is NOT one.

## Blockers
No paid VM has been provisioned, no owner login for Codex CLI has been performed on the VM, and no Access/Tunnel identity policy has been approved or created. Therefore there is **no live web URL** or evidence of working AI-to-AI chat yet.
