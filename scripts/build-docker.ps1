#!/usr/bin/env pwsh
# Build Docker image with version tagging locally

param(
    [string]$Version,
    [string]$Registry = "fuelfinder",
    [switch]$Push,
    [switch]$Latest
)

# Get version from git if not provided
if (-not $Version) {
    $gitTag = git describe --tags --exact-match 2>$null
    if ($gitTag) {
        $Version = $gitTag
    } else {
        $Version = "dev-$(git rev-parse --short HEAD)"
    }
}

$buildDate = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ" -AsUTC
$vcsRef = git rev-parse HEAD
$vcsUrl = git config --get remote.origin.url

Write-Host "🐳 Building Docker image" -ForegroundColor Cyan
Write-Host "   Version: $Version" -ForegroundColor White
Write-Host "   Registry: $Registry" -ForegroundColor White
Write-Host "   Build Date: $buildDate" -ForegroundColor White
Write-Host ""

$tags = @(
    "${Registry}:${Version}"
)

if ($Latest) {
    $tags += "${Registry}:latest"
}

$tagArgs = $tags | ForEach-Object { "-t", $_ }

Write-Host "📋 Tags to be created:" -ForegroundColor Cyan
$tags | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }
Write-Host ""

# Build the image
Write-Host "🔨 Building..." -ForegroundColor Green
docker build `
    --build-arg VERSION=$Version `
    --build-arg BUILD_DATE=$buildDate `
    --build-arg VCS_REF=$vcsRef `
    --build-arg VCS_URL=$vcsUrl `
    @tagArgs `
    .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build successful!" -ForegroundColor Green
    
    # Show image info
    Write-Host ""
    Write-Host "📦 Image details:" -ForegroundColor Cyan
    docker images $Registry --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | Select-Object -First 6
    
    # Show labels
    Write-Host ""
    Write-Host "🏷️  Image labels:" -ForegroundColor Cyan
    docker inspect "${Registry}:${Version}" --format='{{range $k, $v := .Config.Labels}}{{$k}}: {{$v}}{{"\n"}}{{end}}' | Select-String "org.opencontainers.image"
    
    if ($Push) {
        Write-Host ""
        Write-Host "🚀 Pushing images..." -ForegroundColor Cyan
        foreach ($tag in $tags) {
            Write-Host "   Pushing $tag..." -ForegroundColor White
            docker push $tag
        }
        Write-Host "✅ Images pushed!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "💡 To push these images, run:" -ForegroundColor Yellow
        foreach ($tag in $tags) {
            Write-Host "   docker push $tag" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "Or run this script with -Push flag:" -ForegroundColor Yellow
        Write-Host "   .\scripts\build-docker.ps1 -Version $Version -Push" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
