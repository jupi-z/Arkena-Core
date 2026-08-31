param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$ContainerName = $env:POSTGRES_CONTAINER_NAME,
  [string]$DatabaseName = $env:POSTGRES_DB,
  [string]$DatabaseUser = $env:POSTGRES_USER
)

if ($env:ALLOW_RESTORE -ne "true") {
  Write-Error "Refusing restore. Set ALLOW_RESTORE=true after confirming the target database is disposable or in an approved incident procedure."
  exit 1
}

if (-not (Test-Path -LiteralPath $BackupPath)) {
  Write-Error "Backup file not found: $BackupPath"
  exit 1
}

if ([string]::IsNullOrWhiteSpace($ContainerName)) {
  $ContainerName = "arkenacore-db-1"
}
if ([string]::IsNullOrWhiteSpace($DatabaseName)) {
  $DatabaseName = "arkena_core"
}
if ([string]::IsNullOrWhiteSpace($DatabaseUser)) {
  $DatabaseUser = "postgres"
}

$containerPath = "/tmp/arkena_core-restore.dump"

docker cp $BackupPath "${ContainerName}:$containerPath"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

docker exec $ContainerName pg_restore -U $DatabaseUser -d $DatabaseName --clean --if-exists $containerPath
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

docker exec $ContainerName rm -f $containerPath | Out-Null
Write-Output "Restore completed from $BackupPath"
