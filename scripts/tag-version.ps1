#!/usr/bin/env pwsh
# PowerShell script for creating and pushing version tags

param(
    [Parameter(Mandatory=$true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version,
    
    [string]$Message = "Release version",
    
    [switch]$Push
)

$tag = "v$Version"

Write-Host "🏷️  Creating Git tag: $tag" -ForegroundColor Cyan

# Check if tag already exists
$existingTag = git tag -l $tag
if ($existingTag) {
    Write-Host "❌ Tag $tag already exists!" -ForegroundColor Red
    Write-Host "   Use 'git tag -d $tag' to delete it first if you want to recreate it." -ForegroundColor Yellow
    exit 1
}

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Warning: You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y') {
        Write-Host "❌ Aborted" -ForegroundColor Red
        exit 1
    }
}

# Create annotated tag
Write-Host "📝 Creating annotated tag..." -ForegroundColor Green
git tag -a $tag -m "$Message $tag"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Tag created successfully!" -ForegroundColor Green
    
    # Show tag info
    Write-Host "`n📋 Tag information:" -ForegroundColor Cyan
    git show $tag --quiet
    
    if ($Push) {
        Write-Host "`n🚀 Pushing tag to remote..." -ForegroundColor Cyan
        git push origin $tag
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Tag pushed to remote!" -ForegroundColor Green
            Write-Host "`n🐳 Docker images will be built with tags:" -ForegroundColor Cyan
            Write-Host "   - $tag" -ForegroundColor White
            Write-Host "   - v$($Version -replace '\.\d+$', '')" -ForegroundColor White
            Write-Host "   - v$($Version -replace '\.\d+\.\d+$', '')" -ForegroundColor White
            Write-Host "   - latest (if on main branch)" -ForegroundColor White
        } else {
            Write-Host "❌ Failed to push tag" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "`n💡 To push this tag, run:" -ForegroundColor Yellow
        Write-Host "   git push origin $tag" -ForegroundColor White
        Write-Host "`nOr run this script with -Push flag:" -ForegroundColor Yellow
        Write-Host "   .\scripts\tag-version.ps1 -Version $Version -Push" -ForegroundColor White
    }
    
    Write-Host "`n📦 Current tags:" -ForegroundColor Cyan
    git tag -l "v*" | Sort-Object -Descending | Select-Object -First 5
} else {
    Write-Host "❌ Failed to create tag" -ForegroundColor Red
    exit 1
}
