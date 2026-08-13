param(
  [string]$IecesUrl = "https://joilvslvsioayrjshuxg.supabase.co",
  [string]$AuthExport = "C:\Users\DepEd\Downloads\Supabase Snippet Untitled query (6).csv",
  [string]$ProfilesExport = "C:\Users\DepEd\Downloads\bmi_profiles_rows.csv",
  [string]$AdminsExport = "C:\Users\DepEd\Downloads\admin_users_rows.csv",
  [string]$OutputDirectory = "D:\AProjects\ieces-admin-dashboard-manager\migration-output",
  [switch]$UseClipboard
)

$ErrorActionPreference = "Stop"

foreach ($path in @($AuthExport, $ProfilesExport, $AdminsExport)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required migration file was not found: $path"
  }
}

if ($UseClipboard) {
  $serviceKey = Get-Clipboard -Raw
  # Windows PowerShell 5 treats an empty string as null for Set-Clipboard.
  # Replace the sensitive clipboard contents with a harmless single space.
  Set-Clipboard -Value " "
  Write-Host "Read the IECES key and cleared the clipboard."
} else {
  $secureKey = Read-Host "Paste the IECES secret/service-role key" -AsSecureString
  $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  try {
    $serviceKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
  }
}

$serviceKey = ($serviceKey -replace '[\x00-\x20\x7F]', '').Trim()

if ([string]::IsNullOrWhiteSpace($serviceKey)) {
  throw "A service-role or secret key is required."
}

$headers = @{
  apikey = $serviceKey
  "Content-Type" = "application/json"
  "User-Agent" = "ieces-server-auth-migration/1.0"
}

# Opaque sb_secret keys belong only in `apikey`; legacy service_role JWTs are
# also sent as a Bearer token for the older Auth Admin API path.
if (-not $serviceKey.StartsWith("sb_secret_")) {
  $headers.Authorization = "Bearer $serviceKey"
}

Write-Host "Reading current IECES Auth users..."
$userResponse = Invoke-RestMethod `
  -Uri "$IecesUrl/auth/v1/admin/users?page=1&per_page=1000" `
  -Headers $headers `
  -Method Get

$targetUsers = if ($userResponse.users) { @($userResponse.users) } else { @($userResponse) }
$sourceUsers = @(Import-Csv -LiteralPath $AuthExport)
$profiles = @(Import-Csv -LiteralPath $ProfilesExport)
$admins = @(Import-Csv -LiteralPath $AdminsExport)

if ($sourceUsers.Count -eq 0) { throw "The BMI Auth export is empty." }

$mapping = @{}
$created = 0
$reused = 0

foreach ($source in $sourceUsers) {
  $normalizedEmail = $source.email.Trim().ToLowerInvariant()
  $target = $targetUsers | Where-Object {
    $_.email -and $_.email.Trim().ToLowerInvariant() -eq $normalizedEmail
  } | Select-Object -First 1

  if ($target) {
    $mapping[$source.old_user_id] = $target.id
    $reused++
    continue
  }

  $userMetadata = @{}
  $appMetadata = @{}
  if (-not [string]::IsNullOrWhiteSpace($source.raw_user_meta_data)) {
    $userMetadata = $source.raw_user_meta_data | ConvertFrom-Json
  }
  if (-not [string]::IsNullOrWhiteSpace($source.raw_app_meta_data)) {
    $appMetadata = $source.raw_app_meta_data | ConvertFrom-Json
  }

  $payload = @{
    email = $source.email
    password_hash = $source.encrypted_password
    email_confirm = -not [string]::IsNullOrWhiteSpace($source.email_confirmed_at)
    user_metadata = $userMetadata
    app_metadata = $appMetadata
  } | ConvertTo-Json -Depth 20

  $createdUser = Invoke-RestMethod `
    -Uri "$IecesUrl/auth/v1/admin/users" `
    -Headers $headers `
    -Method Post `
    -Body $payload

  if (-not $createdUser.id) {
    throw "Supabase did not return an ID for a migrated Auth user."
  }

  $mapping[$source.old_user_id] = $createdUser.id
  $created++
}

if ($mapping.Count -ne $sourceUsers.Count) {
  throw "Not every BMI Auth user received an IECES ID mapping."
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$mappingRows = foreach ($source in $sourceUsers) {
  [pscustomobject]@{
    old_user_id = $source.old_user_id
    new_user_id = $mapping[$source.old_user_id]
    email = $source.email
  }
}
$mappingRows | Export-Csv -LiteralPath (Join-Path $OutputDirectory "bmi_auth_id_mapping.csv") -NoTypeInformation -Encoding utf8

$mappedProfiles = foreach ($profile in $profiles) {
  if (-not $mapping.ContainsKey($profile.id)) {
    throw "A BMI profile has no Auth ID mapping."
  }
  $profile.id = $mapping[$profile.id]
  $profile
}
$mappedProfiles | Export-Csv -LiteralPath (Join-Path $OutputDirectory "bmi_profiles_import.csv") -NoTypeInformation -Encoding utf8

$mappedAdmins = foreach ($admin in $admins) {
  if (-not $mapping.ContainsKey($admin.user_id)) {
    throw "A BMI administrator has no Auth ID mapping."
  }
  $admin.user_id = $mapping[$admin.user_id]
  $admin
}
$mappedAdmins | Export-Csv -LiteralPath (Join-Path $OutputDirectory "admin_users_import.csv") -NoTypeInformation -Encoding utf8

$serviceKey = $null
Write-Host "Auth migration complete. Created: $created; reused: $reused."
Write-Host "Import-ready files were written to $OutputDirectory"
