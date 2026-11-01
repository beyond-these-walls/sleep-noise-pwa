<#
  Sleep Noise PWA - Ambient sound sourcing & preparation
  ------------------------------------------------------
  Downloads freely-licensed field recordings from Wikimedia Commons, cuts a clean
  segment, loudness-normalises it and encodes a compact MP3 into ../audio/.

  The seamless loop itself is built at RUNTIME in app.js (equal-power crossfade of
  the segment tail into its head, rendered into a Web Audio buffer that loops
  sample-accurately). That means MP3 encoder padding can never cause a gap.

  White / pink / brown noise are generated procedurally in the browser and need no files.

  Usage:  powershell -ExecutionPolicy Bypass -File tools/fetch_sounds.ps1
  Requires: ffmpeg + curl.exe on PATH.
#>

$ErrorActionPreference = 'Continue'
$root    = Split-Path -Parent $PSScriptRoot
$audio   = Join-Path $root 'audio'
$src     = Join-Path $PSScriptRoot '.src'
$ua      = 'SleepNoisePWA/2.0 (personal offline sleep app; contact: local)'

New-Item -ItemType Directory -Force -Path $audio, $src | Out-Null

# id, output file, source URL, byte range ('' = full file), segment start (s), segment length (s)
$sounds = @(
  @{ out='rain-calm.mp3';            url='https://upload.wikimedia.org/wikipedia/commons/c/cf/Calm_rain.wav';                                   range='0-90000000';  ss=10; t=100 },  # Zuvji, CC BY-SA 4.0
  @{ out='rain-light.mp3';           url='https://upload.wikimedia.org/wikipedia/commons/1/15/Sound_of_light_rainfall.ogg';                      range='';            ss=0.5; t=59 },  # Mijesty, CC BY-SA 4.0
  @{ out='thunderstorm.mp3';         url='https://upload.wikimedia.org/wikipedia/commons/7/70/Rain_on_Concrete_during_storm_with_thunder.wav'; range='0-150000000'; ss=20; t=150 },  # Dakendzor, CC BY-SA 4.0
  @{ out='rain-distant-thunder.mp3'; url='https://upload.wikimedia.org/wikipedia/commons/b/b6/Light_Rain_Distant_Thunder_July_5th_2016.wav';    range='';            ss=2;  t=106 },  # kvgarlic, CC0
  @{ out='ocean-waves.mp3';          url='https://upload.wikimedia.org/wikipedia/commons/6/64/Ocean_Waves_on_a_Tropical_Beach.ogg';             range='';            ss=15; t=120 },  # Jarrod Stanley, CC0
  @{ out='river-stream.mp3';         url='https://upload.wikimedia.org/wikipedia/commons/a/a4/Sanna_river_rapids.ogg';                          range='';            ss=15; t=90 }   # Jarrod Stanley, CC0
)

foreach ($s in $sounds) {
  $name    = [IO.Path]::GetFileNameWithoutExtension($s.out)
  $ext     = [IO.Path]::GetExtension(($s.url -split '\?')[0])
  $rawPath = Join-Path $src ($name + $ext)
  $outPath = Join-Path $audio $s.out

  if (-not (Test-Path $rawPath) -or (Get-Item $rawPath).Length -lt 100000) {
    Write-Host "Downloading $($s.url)"
    $curlArgs = @('-L', '--fail', '--retry', '5', '--retry-delay', '3', '-A', $ua, '-o', $rawPath)
    if ($s.range) { $curlArgs += @('-r', $s.range) }
    $curlArgs += $s.url
    & curl.exe @curlArgs
    if ($LASTEXITCODE -ne 0) { Write-Warning "Download failed for $name"; continue }
  }

  Write-Host "Encoding $($s.out)"
  & ffmpeg -hide_banner -loglevel error -y -ss $s.ss -t $s.t -i $rawPath `
    -af "highpass=f=25,loudnorm=I=-21:TP=-2:LRA=11" `
    -ac 2 -ar 44100 -c:a libmp3lame -b:a 128k $outPath
  if ($LASTEXITCODE -ne 0) { Write-Warning "ffmpeg failed for $name"; continue }
  $kb = [math]::Round((Get-Item $outPath).Length / 1KB)
  Write-Host "  -> $outPath ($kb KB)"
}

Write-Host 'Done.'
