# Interpiad AI Office Windows MiniPC prep.
# RUN MANUALLY only after reviewing. Never exposes a public port or changes firewall/DNS.
[CmdletBinding()]
param(
  [string]$InstallRoot = "$env:USERPROFILE\interpiad-ai-office"
)
$ErrorActionPreference = "Stop"
$upstream = "https://github.com/basriayaz/pixel-office.git"
$sha = "4ebfdc7e4538eb68ea987f57ccf2810bc488a39c"
$source = Join-Path $InstallRoot "pixel-office"
$workspace = Join-Path $InstallRoot "workspace"

function CheckExit([string]$step) {
  if ($LASTEXITCODE -ne 0) { throw "$step failed (exit $LASTEXITCODE)" }
}
foreach ($bin in @("git", "node", "npm.cmd")) {
  if (-not (Get-Command $bin -ErrorAction SilentlyContinue)) { throw "$bin is required. Install it first, then retry." }
}
$major = [int](& node -p 'process.versions.node.split(".")[0]')
CheckExit "Node version"
if ($major -lt 20) { throw "Node.js >=20 required" }

New-Item -ItemType Directory -Force -Path $InstallRoot, $workspace | Out-Null
if (-not (Test-Path (Join-Path $source ".git"))) {
  if (Test-Path $source) { throw "Non-git directory exists at $source: aborting." }
  & git clone --no-checkout $upstream $source
  CheckExit "Git clone"
}
$remote = (& git -C $source remote get-url origin).Trim()
CheckExit "Inspect remote"
if ($remote -ne $upstream) { throw "Unexpected Git origin; refusing to modify directory" }
& git -C $source fetch --depth=1 origin $sha
CheckExit "Git fetch pinned upstream"
& git -C $source checkout --detach $sha
CheckExit "Git checkout pinned upstream"
$actual = (& git -C $source rev-parse HEAD).Trim()
CheckExit "Verify commit"
if ($actual -ne $sha) { throw "Unexpected source version; refusing to continue" }

Push-Location $source
try {
  & npm.cmd ci
  CheckExit "npm ci"
  & npm.cmd run typecheck
  CheckExit "Typecheck"
} finally {
  Pop-Location
}
& node (Join-Path $PSScriptRoot "seed-team.mjs") $workspace
CheckExit "Seed isolated AI team"
Write-Host ""
Write-Host "Prepared Pixel Office: $source"
Write-Host "Workspace: $workspace"
Write-Host "NEXT: sign in to Codex CLI interactively on this MiniPC; then launch:"
Write-Host "  Set-Location '$source'; node bin/pixel-office.js start --global --no-open"
Write-Warning "LOCAL ONLY: http://127.0.0.1:4747. Do NOT port-forward. Do NOT expose it before Cloudflare Access validation."
