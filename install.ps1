<#
.SYNOPSIS
    Installs, updates, or uninstalls ModernUI3 side-by-side in a Blue Iris web root.

.DESCRIPTION
    Copies ModernUI3 into its own namespaced files/folders (modernui3.htm, modernui3\,
    and applet\modernui3\) alongside stock Blue Iris UI3 without overwriting stock ui3.htm
    or ui3\*. Installs a fenced redirect shim into ui3\ui3-local-overrides.js so
    Blue Iris updates never overwrite ModernUI3 while keeping untouched stock /ui3.htm?classic=1
    available as an instant fallback.

.PARAMETER TargetPath
    Path to the Blue Iris web root directory (e.g. "C:\Program Files\Blue Iris\www").
    Auto-detected from the Blue Iris registry key or standard install directories if omitted.

.PARAMETER ThemeLogin
    Also injects ModernUI3's Cyber-Lens theme hooks into stock login.htm via
    fenced HTML blocks and installs favicon.ico / BlueIris.png after backing
    up stock files to *.modernui3.bak. Note that Blue Iris updates overwrite
    login.htm; re-run with -ThemeLogin after updating Blue Iris to reapply.

.PARAMETER Uninstall
    Removes ModernUI3 files, strips the fenced redirect block from ui3-local-overrides.js
    (preserving any user overrides), and restores any *.modernui3.bak backups.
#>
[CmdletBinding()]
param(
    [string]$TargetPath,
    [switch]$ThemeLogin,
    [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$BeginMarker    = '// === BEGIN MODERNUI3 REDIRECT ==='
$EndMarker      = '// === END MODERNUI3 REDIRECT ==='
$LoginHeadBegin = '<!-- === BEGIN MODERNUI3 LOGIN HEAD === -->'
$LoginHeadEnd   = '<!-- === END MODERNUI3 LOGIN HEAD === -->'
$LoginBodyBegin = '<!-- === BEGIN MODERNUI3 LOGIN BODY === -->'
$LoginBodyEnd   = '<!-- === END MODERNUI3 LOGIN BODY === -->'

function Resolve-NormalizedPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    $full = [System.IO.Path]::GetFullPath($Path)
    return $full.TrimEnd('\', '/')
}

function Get-BlueIrisConfiguredRoot {
    $regPath = 'HKLM:\SOFTWARE\Perspective Software\Blue Iris\server'
    try {
        if (Test-Path -LiteralPath $regPath) {
            $item = Get-ItemProperty -LiteralPath $regPath -Name 'root' -ErrorAction SilentlyContinue
            if ($item -and $item.root) {
                return [string]$item.root
            }
        }
    } catch {
        return $null
    }
    return $null
}

function Resolve-InstallTarget {
    param(
        [string]$ExplicitPath,
        [Parameter(Mandatory = $true)][string]$RepoRoot
    )

    $normalizedRepo = Resolve-NormalizedPath $RepoRoot
    $regRoot = Get-BlueIrisConfiguredRoot
    $candidates = @()

    if ($ExplicitPath) {
        return @{
            Path = Resolve-NormalizedPath $ExplicitPath
            ConfiguredRegRoot = $regRoot
            RepoFallbackUsed = $false
        }
    }

    $repoFallbackUsed = $false
    if ($regRoot) {
        $normReg = Resolve-NormalizedPath $regRoot
        if ($normReg -ieq $normalizedRepo) {
            $repoFallbackUsed = $true
        } else {
            $candidates += $normReg
        }
    }

    $candidates += @(
        'C:\Program Files\Blue Iris\www',
        'C:\Program Files\Blue Iris 5\www'
    )

    foreach ($cand in $candidates) {
        if ($cand -and (Test-Path -LiteralPath $cand -PathType Container)) {
            $normCand = Resolve-NormalizedPath $cand
            if ($normCand -ine $normalizedRepo) {
                return @{
                    Path = $normCand
                    ConfiguredRegRoot = $regRoot
                    RepoFallbackUsed = $repoFallbackUsed
                }
            }
        }
    }

    throw 'Could not auto-detect the Blue Iris web root directory. Re-run with -TargetPath "C:\Program Files\Blue Iris\www".'
}

function Test-DirectoryWritable {
    param([Parameter(Mandatory = $true)][string]$DirectoryPath)
    $probeName = ".modernui3_write_test_{0}.tmp" -f ([System.Guid]::NewGuid().ToString('N'))
    $probePath = Join-Path $DirectoryPath $probeName
    try {
        [System.IO.File]::WriteAllText($probePath, 'test')
        Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

function Write-Utf8NoBomCrlf {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$Content
    )
    $crlf = [regex]::Replace($Content, "`r?`n", "`r`n")
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($FilePath, $crlf, $utf8NoBom)
}

function Install-RedirectShim {
    param(
        [Parameter(Mandatory = $true)][string]$OverridesPath,
        [Parameter(Mandatory = $true)][string]$ShimSourcePath
    )

    $shimBody = [System.IO.File]::ReadAllText($ShimSourcePath, [System.Text.Encoding]::UTF8).TrimEnd("`r", "`n")
    $fenced = "$BeginMarker`r`n$shimBody`r`n$EndMarker"

    $ui3Dir = Split-Path -Parent $OverridesPath
    if (-not (Test-Path -LiteralPath $ui3Dir -PathType Container)) {
        New-Item -ItemType Directory -Path $ui3Dir -Force | Out-Null
    }

    if (Test-Path -LiteralPath $OverridesPath -PathType Leaf) {
        $existing = [System.IO.File]::ReadAllText($OverridesPath, [System.Text.Encoding]::UTF8)
        $markerPattern = "(?s)$([regex]::Escape($BeginMarker)).*?$([regex]::Escape($EndMarker))"
        if ([regex]::IsMatch($existing, $markerPattern)) {
            $updated = [regex]::Replace(
                $existing,
                $markerPattern,
                [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $fenced }
            )
        } elseif ([string]::IsNullOrWhiteSpace($existing)) {
            $updated = "$fenced`r`n"
        } else {
            $trimmedExisting = $existing.TrimStart("`r", "`n")
            $updated = "$fenced`r`n`r`n$trimmedExisting"
        }
    } else {
        $updated = "$fenced`r`n"
    }

    Write-Utf8NoBomCrlf -FilePath $OverridesPath -Content $updated
}

function Uninstall-RedirectShim {
    param([Parameter(Mandatory = $true)][string]$OverridesPath)

    if (-not (Test-Path -LiteralPath $OverridesPath -PathType Leaf)) {
        return 'not-present'
    }

    $existing = [System.IO.File]::ReadAllText($OverridesPath, [System.Text.Encoding]::UTF8)
    $blockPattern = "(?s)[ \t]*$([regex]::Escape($BeginMarker)).*?$([regex]::Escape($EndMarker))[ \t]*(?:\r?\n)*"
    if (-not [regex]::IsMatch($existing, $blockPattern)) {
        return 'no-markers'
    }

    $cleaned = [regex]::Replace($existing, $blockPattern, '')
    if ([string]::IsNullOrWhiteSpace($cleaned)) {
        Remove-Item -LiteralPath $OverridesPath -Force
        return 'removed-file'
    }

    Write-Utf8NoBomCrlf -FilePath $OverridesPath -Content $cleaned
    return 'stripped-block'
}

function Get-ModernUI3Version {
    param([Parameter(Mandatory = $true)][string]$ModernHtmPath)

    $content = [System.IO.File]::ReadAllText($ModernHtmPath, [System.Text.Encoding]::UTF8)
    $m = [regex]::Match($content, 'var\s+ui_version\s*=\s*"([^"]+)"\s*;')
    if ($m.Success) {
        return $m.Groups[1].Value
    }
    return '1.350.3'
}

function Install-LoginTheme {
    param(
        [Parameter(Mandatory = $true)][string]$LoginPath,
        [Parameter(Mandatory = $true)][string]$BackupPath,
        [Parameter(Mandatory = $true)][string]$Version
    )

    if (-not (Test-Path -LiteralPath $LoginPath -PathType Leaf)) {
        throw "Missing stock login page at '$LoginPath'."
    }

    $content = [System.IO.File]::ReadAllText($LoginPath, [System.Text.Encoding]::UTF8)
    $hasFence = ($content.IndexOf($LoginHeadBegin, [System.StringComparison]::Ordinal) -ge 0) `
        -or ($content.IndexOf($LoginBodyBegin, [System.StringComparison]::Ordinal) -ge 0)
    $isLegacyFullCopy = (-not $hasFence) -and ($content -match '(?i)applet/modernui3/login(?:Scripts\.js|Styles\.css)')

    if ($isLegacyFullCopy) {
        if (Test-Path -LiteralPath $BackupPath -PathType Leaf) {
            Copy-Item -LiteralPath $BackupPath -Destination $LoginPath -Force
            $content = [System.IO.File]::ReadAllText($LoginPath, [System.Text.Encoding]::UTF8)
            Write-Host "  Restored stock login.htm from login.htm.modernui3.bak before applying fenced theme"
        } else {
            throw "Found legacy full-file login.htm replacement without login.htm.modernui3.bak backup at '$LoginPath'. Restore stock Blue Iris login.htm before running -ThemeLogin."
        }
    } elseif (-not $hasFence) {
        Copy-Item -LiteralPath $LoginPath -Destination $BackupPath -Force
        Write-Host "  Backed up login.htm -> login.htm.modernui3.bak"
    }

    $headTemplate = @'
__HEAD_BEGIN__
	<style type="text/css">html,body{background:#090D14!important;color-scheme:dark;}</style>
	<link href="applet/modernui3/login-theme.css?v=__VERSION__" rel="stylesheet" />
	<script type="text/javascript">(function(){try{var vp=document.querySelector('meta[name="viewport"]');if(vp&&vp.content.indexOf('viewport-fit')===-1)vp.content+=', viewport-fit=cover';var tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.content='#090D14';var cs=document.querySelector('meta[name="color-scheme"]');if(!cs){cs=document.createElement('meta');cs.name='color-scheme';cs.content='dark';document.head.appendChild(cs);}var m=document.getElementById('ui3manifest');if(m)m.href='applet/modernui3/manifest.json?v=__VERSION__';var i1=document.getElementById('ui3launcher1');if(i1)i1.href='applet/modernui3/logos/launcher-icon48.png?v=__VERSION__';var i2=document.getElementById('ui3launcher2');if(i2)i2.href='applet/modernui3/logos/launcher-icon256_ios.webp?v=__VERSION__';}catch(e){}})();</script>
__HEAD_END__
'@
    $bodyTemplate = @'
__BODY_BEGIN__
	<script src="applet/modernui3/login-theme.js?v=__VERSION__"></script>
__BODY_END__
'@

    $headBlock = $headTemplate.Replace('__HEAD_BEGIN__', $LoginHeadBegin).Replace('__HEAD_END__', $LoginHeadEnd).Replace('__VERSION__', $Version)
    $bodyBlock = $bodyTemplate.Replace('__BODY_BEGIN__', $LoginBodyBegin).Replace('__BODY_END__', $LoginBodyEnd).Replace('__VERSION__', $Version)

    $headPattern = "(?s)$([regex]::Escape($LoginHeadBegin)).*?$([regex]::Escape($LoginHeadEnd))"
    if ([regex]::IsMatch($content, $headPattern)) {
        $content = [regex]::Replace(
            $content,
            $headPattern,
            [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $headBlock }
        )
    } elseif ([regex]::IsMatch($content, '(?i)</head>')) {
        $headCloseRx = New-Object System.Text.RegularExpressions.Regex('(?i)</head>')
        $content = $headCloseRx.Replace(
            $content,
            [System.Text.RegularExpressions.MatchEvaluator]{ param($m) "$headBlock`r`n$($m.Value)" },
            1
        )
    } else {
        throw "Could not locate </head> tag in '$LoginPath'."
    }

    $bodyPattern = "(?s)$([regex]::Escape($LoginBodyBegin)).*?$([regex]::Escape($LoginBodyEnd))"
    if ([regex]::IsMatch($content, $bodyPattern)) {
        $content = [regex]::Replace(
            $content,
            $bodyPattern,
            [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $bodyBlock }
        )
    } elseif ([regex]::IsMatch($content, '(?i)</body>')) {
        $bodyCloseRx = New-Object System.Text.RegularExpressions.Regex('(?i)</body>')
        $content = $bodyCloseRx.Replace(
            $content,
            [System.Text.RegularExpressions.MatchEvaluator]{ param($m) "$bodyBlock`r`n$($m.Value)" },
            1
        )
    } else {
        throw "Could not locate </body> tag in '$LoginPath'."
    }

    Write-Utf8NoBomCrlf -FilePath $LoginPath -Content $content
}

function Uninstall-LoginTheme {
    param([Parameter(Mandatory = $true)][string]$LoginPath)

    if (-not (Test-Path -LiteralPath $LoginPath -PathType Leaf)) {
        return 'not-present'
    }

    $existing = [System.IO.File]::ReadAllText($LoginPath, [System.Text.Encoding]::UTF8)
    $headPattern = "(?s)[ \t]*$([regex]::Escape($LoginHeadBegin)).*?$([regex]::Escape($LoginHeadEnd))[ \t]*(?:\r?\n)*"
    $bodyPattern = "(?s)[ \t]*$([regex]::Escape($LoginBodyBegin)).*?$([regex]::Escape($LoginBodyEnd))[ \t]*(?:\r?\n)*"

    if ((-not [regex]::IsMatch($existing, $headPattern)) -and (-not [regex]::IsMatch($existing, $bodyPattern))) {
        return 'no-markers'
    }

    $cleaned = [regex]::Replace($existing, $headPattern, '')
    $cleaned = [regex]::Replace($cleaned, $bodyPattern, '')
    Write-Utf8NoBomCrlf -FilePath $LoginPath -Content $cleaned
    return 'stripped-blocks'
}

try {
    $repoRoot = Resolve-NormalizedPath $PSScriptRoot
    $resolution = Resolve-InstallTarget -ExplicitPath $TargetPath -RepoRoot $repoRoot
    $destRoot = $resolution.Path
    $regRoot = $resolution.ConfiguredRegRoot
    $repoFallbackUsed = $resolution.RepoFallbackUsed

    if ($destRoot -ieq $repoRoot) {
        throw "Refusing to install onto the ModernUI3 repository directory itself ('$destRoot'). Specify your Blue Iris web root (e.g. -TargetPath `"C:\Program Files\Blue Iris\www`")."
    }

    if (-not (Test-Path -LiteralPath $destRoot -PathType Container)) {
        throw "Target directory does not exist: '$destRoot'"
    }

    if (-not $Uninstall) {
        $stockUi3Htm = Join-Path $destRoot 'ui3.htm'
        $stockUi3Dir = Join-Path $destRoot 'ui3'
        if (-not (Test-Path -LiteralPath $stockUi3Htm -PathType Leaf) -or -not (Test-Path -LiteralPath $stockUi3Dir -PathType Container)) {
            throw "Target directory '$destRoot' does not look like a Blue Iris web root (missing ui3.htm or ui3\)."
        }
    }

    if (-not (Test-DirectoryWritable -DirectoryPath $destRoot)) {
        Write-Host ""
        Write-Host "[ERROR] Access denied writing to '$destRoot'." -ForegroundColor Red
        Write-Host "Re-run PowerShell as Administrator (Run as Administrator) and try again." -ForegroundColor Yellow
        exit 1
    }

    $overridesPath = Join-Path $destRoot 'ui3\ui3-local-overrides.js'
    $themePairs = @(
        @{ Src = 'applet\modernui3\favicon.ico';   Dst = 'favicon.ico' },
        @{ Src = 'applet\modernui3\BlueIris.png';  Dst = 'BlueIris.png' }
    )
    $restoreBackupTargets = @('login.htm', 'timeout.htm', 'favicon.ico', 'BlueIris.png')

    if ($Uninstall) {
        Write-Host "Uninstalling ModernUI3 from '$destRoot'..." -ForegroundColor Cyan

        foreach ($rel in @('modernui3.htm', 'modernui3', 'applet\modernui3')) {
            $p = Join-Path $destRoot $rel
            if (Test-Path -LiteralPath $p) {
                Remove-Item -LiteralPath $p -Recurse -Force
                Write-Host "  Removed $rel"
            }
        }

        $shimResult = Uninstall-RedirectShim -OverridesPath $overridesPath
        switch ($shimResult) {
            'removed-file'   { Write-Host "  Removed ui3\ui3-local-overrides.js (contained only ModernUI3 redirect)" }
            'stripped-block' { Write-Host "  Removed ModernUI3 redirect block from ui3\ui3-local-overrides.js (existing user overrides preserved)" }
            'no-markers'     { Write-Host "  Left ui3\ui3-local-overrides.js untouched (no ModernUI3 markers found)" }
            default          { Write-Host "  No ui3\ui3-local-overrides.js present" }
        }

        $restoredLoginFromBak = $false
        foreach ($dstRel in $restoreBackupTargets) {
            $dstPath = Join-Path $destRoot $dstRel
            $bakPath = "$dstPath.modernui3.bak"
            if (Test-Path -LiteralPath $bakPath -PathType Leaf) {
                Move-Item -LiteralPath $bakPath -Destination $dstPath -Force
                Write-Host "  Restored backup -> $dstRel"
                if ($dstRel -eq 'login.htm') {
                    $restoredLoginFromBak = $true
                }
            }
        }
        if (-not $restoredLoginFromBak) {
            $loginUninst = Uninstall-LoginTheme -LoginPath (Join-Path $destRoot 'login.htm')
            if ($loginUninst -eq 'stripped-blocks') {
                Write-Host "  Removed ModernUI3 login theme blocks from login.htm"
            }
        }

        Write-Host ""
        Write-Host "ModernUI3 uninstall complete. Stock Blue Iris UI3 files are intact." -ForegroundColor Green
        exit 0
    }

    # Verify source payload exists in repo
    $srcModernHtm = Join-Path $repoRoot 'modernui3.htm'
    $srcModernDir = Join-Path $repoRoot 'modernui3'
    $srcShim      = Join-Path $repoRoot 'modernui3\redirect-shim.js'
    $srcAppletDir = Join-Path $repoRoot 'applet\modernui3'

    foreach ($req in @($srcModernHtm, $srcModernDir, $srcShim, $srcAppletDir)) {
        if (-not (Test-Path -LiteralPath $req)) {
            throw "Required ModernUI3 source path is missing: '$req'"
        }
    }

    Write-Host "Installing ModernUI3 side-by-side into '$destRoot'..." -ForegroundColor Cyan

    # 1. Copy modernui3.htm -> <TargetPath>\modernui3.htm
    Copy-Item -LiteralPath $srcModernHtm -Destination (Join-Path $destRoot 'modernui3.htm') -Force
    Write-Host "  Installed modernui3.htm"

    # 2. Mirror modernui3\ -> <TargetPath>\modernui3\
    $destModernDir = Join-Path $destRoot 'modernui3'
    if (Test-Path -LiteralPath $destModernDir) {
        Remove-Item -LiteralPath $destModernDir -Recurse -Force
    }
    Copy-Item -LiteralPath $srcModernDir -Destination $destModernDir -Recurse -Force
    Write-Host "  Installed modernui3\ (stock ui3\ untouched)"

    # 3. Mirror applet\modernui3\ -> <TargetPath>\applet\modernui3\
    $destAppletRoot = Join-Path $destRoot 'applet'
    if (-not (Test-Path -LiteralPath $destAppletRoot -PathType Container)) {
        New-Item -ItemType Directory -Path $destAppletRoot -Force | Out-Null
    }
    $destAppletModern = Join-Path $destAppletRoot 'modernui3'
    if (Test-Path -LiteralPath $destAppletModern) {
        Remove-Item -LiteralPath $destAppletModern -Recurse -Force
    }
    Copy-Item -LiteralPath $srcAppletDir -Destination $destAppletModern -Recurse -Force
    Write-Host "  Installed applet\modernui3\ (stock applet\ files untouched)"

    # 4. Install fenced redirect shim into <TargetPath>\ui3\ui3-local-overrides.js
    Install-RedirectShim -OverridesPath $overridesPath -ShimSourcePath $srcShim
    Write-Host "  Updated ui3\ui3-local-overrides.js with fenced ModernUI3 redirect shim"

    # 5. Optional themed login & icon files
    if ($ThemeLogin) {
        Write-Host "Applying optional themed login assets (-ThemeLogin)..." -ForegroundColor Cyan
        $uiVersion = Get-ModernUI3Version -ModernHtmPath $srcModernHtm
        $destLoginPath = Join-Path $destRoot 'login.htm'
        Install-LoginTheme -LoginPath $destLoginPath -BackupPath "$destLoginPath.modernui3.bak" -Version $uiVersion
        Write-Host "  Injected fenced ModernUI3 login theme into login.htm"
        foreach ($pair in $themePairs) {
            $srcPath = Join-Path $repoRoot $pair.Src
            $dstPath = Join-Path $destRoot $pair.Dst
            $bakPath = "$dstPath.modernui3.bak"
            if (-not (Test-Path -LiteralPath $srcPath -PathType Leaf)) {
                throw "Missing optional login asset: '$srcPath'"
            }
            if ((Test-Path -LiteralPath $dstPath -PathType Leaf) -and -not (Test-Path -LiteralPath $bakPath -PathType Leaf)) {
                Copy-Item -LiteralPath $dstPath -Destination $bakPath -Force
                Write-Host "  Backed up $($pair.Dst) -> $($pair.Dst).modernui3.bak"
            }
            Copy-Item -LiteralPath $srcPath -Destination $dstPath -Force
            Write-Host "  Applied $($pair.Dst)"
        }
        Write-Host "  [NOTE] Blue Iris updates overwrite login.htm; re-run with -ThemeLogin after BI updates to reapply." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "ModernUI3 installed successfully!" -ForegroundColor Green
    Write-Host "  - Default / & /ui3.htm     -> auto-redirects to /modernui3.htm"
    Write-Host "  - Direct ModernUI3 URLs    -> /modernui3.htm or /modernui3/modernui3.htm"
    Write-Host "  - Untouched Classic UI3    -> /ui3.htm?classic=1 (or click 'Classic UI' in the top bar)"

    if ($repoFallbackUsed -or ($regRoot -and ((Resolve-NormalizedPath $regRoot) -ine $destRoot))) {
        Write-Host ""
        Write-Host "[NOTICE] Blue Iris is currently configured with Web server Root directory:" -ForegroundColor Yellow
        Write-Host "         '$regRoot'" -ForegroundColor Yellow
        Write-Host "         In Blue Iris: Settings > Web server > Advanced > Root directory," -ForegroundColor Yellow
        Write-Host "         point it to '$destRoot' so BI updates never overwrite the repo." -ForegroundColor Yellow
    }

    exit 0
} catch {
    Write-Host ""
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
