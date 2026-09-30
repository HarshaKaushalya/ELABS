$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$driveLetter = (Split-Path -Path $root.Path -Qualifier).TrimEnd(":")
$drive = Get-PSDrive -Name $driveLetter
$minFreeBytes = 3GB
if ($drive.Free -lt $minFreeBytes) {
  $freeGb = [math]::Round($drive.Free / 1GB, 2)
  throw "Low disk space: ${freeGb}GB free on drive $driveLetter. Free at least 3GB, then re-run init-dev.ps1."
}

Write-Host "Installing Node dependencies..."
npm --prefix packages/shared install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "Command failed: npm --prefix packages/shared install --no-audit --no-fund" }

npm --prefix packages/api install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "Command failed: npm --prefix packages/api install --no-audit --no-fund" }

npm --prefix packages/web install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "Command failed: npm --prefix packages/web install --no-audit --no-fund" }

npm --prefix packages/mobile install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "Command failed: npm --prefix packages/mobile install --no-audit --no-fund" }

Write-Host "Installing Python services..."
python -m pip install --no-cache-dir wheel
if ($LASTEXITCODE -ne 0) { throw "Command failed: python -m pip install --no-cache-dir wheel" }

python -m pip install --no-cache-dir --no-build-isolation packages/ai
if ($LASTEXITCODE -ne 0) { throw "Command failed: python -m pip install --no-cache-dir --no-build-isolation packages/ai" }

python -m pip install --no-cache-dir --no-build-isolation packages/vision
if ($LASTEXITCODE -ne 0) { throw "Command failed: python -m pip install --no-cache-dir --no-build-isolation packages/vision" }

python -m pip install --no-cache-dir pytest
if ($LASTEXITCODE -ne 0) { throw "Command failed: python -m pip install --no-cache-dir pytest" }

Write-Host "Bootstrap complete. Run: docker compose up --build"
