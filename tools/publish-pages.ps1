param(
    [string]$Repository = 'pirytos25-creator/atlascodex'
)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
function Check-NativeResult {
    if ($LASTEXITCODE -ne 0) { throw 'Polecenie Git/GitHub zakończyło się błędem.' }
}
$tree = & git -C $projectPath rev-parse 'HEAD:dist'
Check-NativeResult
& git -C $projectPath show-ref --verify --quiet refs/heads/gh-pages
if ($LASTEXITCODE -eq 0) {
    $parent = & git -C $projectPath rev-parse refs/heads/gh-pages
    Check-NativeResult
    $commit = 'Publish atlascodex to GitHub Pages' | & git -C $projectPath commit-tree $tree -p $parent
} else {
    $commit = 'Publish atlascodex to GitHub Pages' | & git -C $projectPath commit-tree $tree
}
Check-NativeResult
& git -C $projectPath update-ref refs/heads/gh-pages $commit
Check-NativeResult
& git -C $projectPath push origin main gh-pages
Check-NativeResult
Write-Host "Opublikowano pliki do $Repository. GitHub Pages wdroży gałąź gh-pages."
