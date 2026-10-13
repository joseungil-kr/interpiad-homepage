# Remote access setup — security-first checklist

**Do not publish Pixel Office directly.** The upstream README states it has no built-in login and can run commands in the assigned workspace.

1. Provision a small 24/7 Linux VM after cost approval; keep the app on 127.0.0.1:4747. Do not open inbound 4747 in the firewall.
2. In Cloudflare Zero Trust create a self-hosted Access application for the chosen host **before** adding any Tunnel public route. Configure an owner-approved Allow rule. Everyone else must be denied.
3. Create a Cloudflare Tunnel, enable origin-side validation (Protect with Access), and set the local service to http://127.0.0.1:4747. Never commit a Tunnel token or Cloudflare credential.
4. Test reverse-proxy compatibility: the upstream enforces Host and Origin checks on HTTP and WebSocket upgrades. A public HTTPS hostname will normally be rejected without correct allowlisting/proxy integration. Validate both UI and WebSocket behavior and restrict any bypass to the trusted proxy; never disable the guard globally.
5. Check the login rejection in a private browser without an allowed identity. Test signed-in access from mobile and desktop; verify unauthorized POST, WebSocket and shutdown actions cannot bypass Access.
6. Back up the agent configuration and chat history from the server securely. Both the Pixel Office data directory and provider login storage may contain sensitive content: never upload them to a public GitHub repo.

References:
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- https://developers.cloudflare.com/tunnel/get-started/
- https://github.com/basriayaz/pixel-office#security-notes
