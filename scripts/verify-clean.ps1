# Verifica que nao sobrou nenhuma referencia a marcas/donos anteriores no
# projeto, incluindo dentro de binarios (exe), imagens e arquivos de build.
#
# Uso:
#   pwsh -File scripts/verify-clean.ps1
#   pwsh -File scripts/verify-clean.ps1 -Root C:\caminho\do\projeto
#
# Sai com codigo 1 se encontrar qualquer ocorrencia, 0 se estiver limpo.
# A busca e byte-level ASCII, entao pega tanto texto UTF-8 quanto binario.

[CmdletBinding()]
param(
    [string]$Root
)

$ErrorActionPreference = 'Stop'

# $PSScriptRoot nao existe no momento em que os defaults de param sao avaliados
# no Windows PowerShell 5.1, entao resolve aqui dentro.
if (-not $Root) {
    $Root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
}
$Root = [System.IO.Path]::GetFullPath($Root)

# Substrings proibidas (case-insensitive).
$forbidden = @('artex', 'autumn', 'secsentry')

# Diretorios ignorados: dependencias de terceiros e cache de build local.
$skipDirs = @('node_modules', '.next', '.git', 'dist-cache')

$files = Get-ChildItem -Path $Root -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object {
        # o proprio verificador contem os termos como literal, nao conta
        if ($PSCommandPath -and $_.FullName -eq $PSCommandPath) { return $false }
        $relative = $_.FullName.Substring($Root.Length).TrimStart('\', '/')
        $segments = $relative -split '[\\/]'
        -not ($segments | Where-Object { $skipDirs -contains $_ })
    }

$hits = New-Object System.Collections.Generic.List[string]
$scanned = 0

foreach ($file in $files) {
    $scanned++
    try {
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    }
    catch {
        continue
    }
    $text = [System.Text.Encoding]::ASCII.GetString($bytes)
    foreach ($needle in $forbidden) {
        $count = [regex]::Matches($text, [regex]::Escape($needle), 'IgnoreCase').Count
        if ($count -gt 0) {
            $hits.Add(('{0}  [{1}] "{2}" x{3}' -f $file.FullName.Substring($Root.Length).TrimStart('\', '/'), $file.Length, $needle, $count))
        }
    }
}

Write-Host ("arquivos verificados: {0}" -f $scanned)
Write-Host ("termos procurados:    {0}" -f ($forbidden -join ', '))

if ($hits.Count -gt 0) {
    Write-Host ""
    Write-Host "FALHOU: ocorrencias encontradas" -ForegroundColor Red
    $hits | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    exit 1
}

Write-Host ""
Write-Host "LIMPO: nenhuma ocorrencia." -ForegroundColor Green
exit 0
