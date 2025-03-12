# Prompt the user to enter "Ok"
$userInput = Read-Host "Please enter the word 'Ok' to proceed"

# Check if the input is "Ok" (case insensitive)
if ($userInput -ne "Ok") {
    Write-Host "You did not enter 'Ok'. Exiting the script."
    exit
}

# Define source directory, destination zip file, and exclusions.
$source = "C:\Users\Grady\dev\cw-ai-chatbot"
$zipFile = "C:\Users\Grady\dev\cw-ai-chatbot.zip"
$exclusions = @(".git", ".github", ".next", "node_modules", ".env.local", "package-lock.json","docs")

# Remove existing zip file if it exists.
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Create a temporary folder for assembling files.
$tempDir = Join-Path $env:TEMP "cw-ai-chatbot-temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy top-level items (files/folders) from the source that are not excluded.
Get-ChildItem -Path $source -Force | Where-Object { $exclusions -notcontains $_.Name } | ForEach-Object {
    $destination = Join-Path $tempDir $_.Name
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination $destination -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination $destination -Force
    }
}

# Use 7‑Zip to create the archive.
# Ensure 7z.exe is in your PATH. If not, provide the full path to 7z.exe.
$sevenZip = "7z.exe"
# The command "a" adds files to an archive.
# The wildcard "*" ensures all contents in the temp folder are archived.
& $sevenZip a $zipFile (Join-Path $tempDir "*") | Write-Host

# Clean up the temporary folder.
Remove-Item $tempDir -Recurse -Force


# Upload the zip file to your S3 bucket
aws s3 cp $zipFile s3://cw-ai-chatbot-elastic-beanstalk/

aws elasticbeanstalk update-environment --environment-name cw-ai-chatbot-env-4 --version-label .05