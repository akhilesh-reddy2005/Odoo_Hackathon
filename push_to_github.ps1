# PowerShell Script to Push TransitOps to GitHub

Write-Host "==============================================" -ForegroundColor Orange
Write-Host "TransitOps GitHub Publisher" -ForegroundColor Orange
Write-Host "==============================================" -ForegroundColor Orange

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not installed or not in your system PATH. Please install Git and try again."
    Exit
}

# Initialize repository if not already done
if (-not (Test-Path .git)) {
    Write-Host "Initializing Git Repository..." -ForegroundColor Cyan
    git init
} else {
    Write-Host "Git repository already initialized." -ForegroundColor Green
}

# Add all files to staging
Write-Host "Staging files..." -ForegroundColor Cyan
git add .

# Check git status
$status = git status --porcelain
if ($status) {
    Write-Host "Committing changes..." -ForegroundColor Cyan
    git commit -m "Initial commit: TransitOps ERP Platform - production quality Node/Express & React 19 app"
} else {
    Write-Host "No changes to commit." -ForegroundColor Green
}

# Set branch name to main
Write-Host "Setting active branch to 'main'..." -ForegroundColor Cyan
git branch -M main

# Check if origin already exists
$remotes = git remote
if ($remotes -contains "origin") {
    Write-Host "Origin remote already exists. Updating URL..." -ForegroundColor Cyan
    git remote set-url origin https://github.com/akhilesh-reddy2005/Odoo_Hackathon.git
} else {
    Write-Host "Adding origin remote..." -ForegroundColor Cyan
    git remote add origin https://github.com/akhilesh-reddy2005/Odoo_Hackathon.git
}

# Push files to GitHub
Write-Host "Pushing files to GitHub (https://github.com/akhilesh-reddy2005/Odoo_Hackathon.git)..." -ForegroundColor Orange
Write-Host "Note: If prompted, please complete GitHub authentication in the terminal or browser prompt." -ForegroundColor Yellow

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "Success! TransitOps code has been successfully pushed to GitHub." -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
} else {
    Write-Host "==============================================" -ForegroundColor Red
    Write-Host "Error pushing to GitHub. Verify your credentials or repository permissions." -ForegroundColor Red
    Write-Host "==============================================" -ForegroundColor Red
}
