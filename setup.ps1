# ============================================
# Setup script for Mr-Ass Platform (Windows)
# ============================================
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

Write-Host '🚀 Setting up Mr-Ass platform...' -ForegroundColor Cyan

# 1) Check Node
$node = & node -v 2>$null
if (-not $node) {
  Write-Host '❌ Node.js not found. Install Node 18+ first: https://nodejs.org' -ForegroundColor Red
  exit 1
}
Write-Host "✅ Node $node" -ForegroundColor Green

# 2) Install deps
Write-Host '📦 Installing dependencies (this can take a few minutes)...' -ForegroundColor Yellow
& npm install --no-audit --no-fund

# 3) Verify file structure
$required = @(
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/providers.tsx',
  'src/lib/supabase/client.ts',
  'src/lib/supabase/server.ts',
  'src/lib/supabase/middleware.ts',
  'db/schema.sql',
  '.env.local',
  'public/images/instructor.png'
)
$missing = $required | Where-Object { -not (Test-Path $_) }
if ($missing) {
  Write-Host '❌ Missing files:' -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
  exit 1
}
Write-Host '✅ File structure OK' -ForegroundColor Green

# 4) Print next steps
Write-Host ''
Write-Host '🎉 Setup complete!' -ForegroundColor Green
Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host '  1. Open Supabase SQL Editor: https://tkrygfflhrvgveiolhsl.supabase.co' -ForegroundColor White
Write-Host '  2. Run the contents of db/schema.sql' -ForegroundColor White
Write-Host '  3. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (from Supabase → Settings → API)' -ForegroundColor White
Write-Host '  4. npm run dev' -ForegroundColor White
Write-Host ''
Write-Host 'Open http://localhost:3000' -ForegroundColor Green
