param(
  [string]$ContainerName = $env:POSTGRES_CONTAINER_NAME,
  [string]$DatabaseName = $env:POSTGRES_DB,
  [string]$DatabaseUser = $env:POSTGRES_USER,
  [string]$BackupDir = $env:BACKUP_DIR
)

if ([string]::IsNullOrWhiteSpace($ContainerName)) {
  $ContainerName = "arkenacore-db-1"
}
if ([string]::IsNullOrWhiteSpace($DatabaseName)) {
  $DatabaseName = "arkena_core"
}
if ([string]::IsNullOrWhiteSpace($DatabaseUser)) {
  $DatabaseUser = "postgres"
}
if ([string]::IsNullOrWhiteSpace($BackupDir)) {
  $BackupDir = "./backups"
}

New-Item -ItemType Directory -Force $BackupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "arkena_core-$timestamp.dump"
$containerPath = "/tmp/$backupFile"
$hostPath = Join-Path $BackupDir $backupFile

docker exec $ContainerName pg_dump -U $DatabaseUser -d $DatabaseName --format=custom --file=$containerPath
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

docker cp "${ContainerName}:$containerPath" $hostPath
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

docker exec $ContainerName rm -f $containerPath | Out-Null
Write-Output $hostPath
