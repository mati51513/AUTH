@echo off
REM Push current project to a private GitHub repository

SETLOCAL ENABLEDELAYEDEXPANSION

REM === Configuration ===
REM Edit the following line to your private repo URL (e.g., https://github.com/USER/REPO.git)
set REPO_URL=
set BRANCH=main

IF "%REPO_URL%"=="" (
  echo [ERROR] REPO_URL is not set. Edit push-private.bat and set REPO_URL to your private repo.
  exit /b 1
)

echo [INFO] Initializing git repository
git init

echo [INFO] Setting default branch to %BRANCH%
git branch -M %BRANCH%

echo [INFO] Adding files
git add .

echo [INFO] Committing changes
git commit -m "Project push"

echo [INFO] Adding remote origin: %REPO_URL%
git remote remove origin 2> NUL
git remote add origin %REPO_URL%

echo [INFO] Pushing to %BRANCH%
git push -u origin %BRANCH%

echo [DONE] Push complete.
EXIT /B 0

