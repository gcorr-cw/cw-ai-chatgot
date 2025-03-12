# Prompt the user to enter "Ok"
$userInput = Read-Host "Please enter the word 'Ok' to proceed"

# Check if the input is "Ok" (case insensitive)
if ($userInput -ne "Ok") {
    Write-Host "You did not enter 'Ok'. Exiting the script."
    exit
}

# Define paths to the necessary files
$sourceFileList = "C:\Users\Grady\dev\sourceFiles.txt"
$iniFilePath = "C:\Users\Grady\dev\projectDocExport.ini"

# Read the destination file name from the .ini file
$destinationFile = ""

# Read the .ini file and extract destination file name
if (Test-Path -Path $iniFilePath) {
    $iniContent = Get-Content -LiteralPath $iniFilePath | ForEach-Object {
        $line = $_.Trim()
        if ($line -match "^(DestinationFileName)=(.+)$") {
            $destinationFile = $matches[2].Trim()
        }
    }
    # Ensure the path is fully qualified by appending the desired directory if necessary
    $destinationFile = Join-Path "C:\Users\Grady\dev" $destinationFile
} else {
    Write-Host "Error: INI file not found. Please provide a valid path."
    exit
}

if (-not $destinationFile) {
    Write-Host "Error: Destination file name not specified in INI file."
    exit
}

# Clear the contents of the destination file if it exists
Clear-Content -LiteralPath $destinationFile -ErrorAction SilentlyContinue

# Process each file listed in the source file
Get-Content -LiteralPath $sourceFileList | ForEach-Object {
    $filePath = $_.Trim()
    
    # Check if the file exists and if it has the desired extensions using -LiteralPath
    if (Test-Path -LiteralPath $filePath -PathType Leaf) {
        if ($filePath -match "\.(ts|tsx|txt|md|js|html)$") {
            # Remove 'C:\Users\Grady\dev' from the path for the relative path
            $relativePath = $filePath -replace [regex]::Escape('C:\Users\Grady\dev'), ''

            # Create header with 5 blank lines above and the updated file path
            $header = @"
     
     
     
     
#################################################################################
###  $relativePath
#################################################################################

"@

            # Output header and file content to the destination file using -LiteralPath
            Add-Content -LiteralPath $destinationFile -Value $header
            Get-Content -LiteralPath $filePath | Add-Content -LiteralPath $destinationFile
        } else {
            Write-Host "Skipped file with unsupported extension: $filePath"
        }
    } else {
        Write-Host "Skipped or invalid file: $filePath"
    }
}

Write-Host "Merging completed. Output saved to $destinationFile"
