@echo off
chcp 65001 >nul
set PYTHONUTF8=1
title Neuroatlas - serwer lokalny
cd /d "%~dp0"
set NEUROATLAS_PYTHON=
where py >nul 2>nul && set NEUROATLAS_PYTHON=py -3
if not defined NEUROATLAS_PYTHON where python >nul 2>nul && set NEUROATLAS_PYTHON=python
if not defined NEUROATLAS_PYTHON if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" set NEUROATLAS_PYTHON="%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if not defined NEUROATLAS_PYTHON (
  echo Nie znaleziono Pythona. Zainstaluj Python 3 z https://www.python.org/ i uruchom ponownie.
  pause
  exit /b 1
)
%NEUROATLAS_PYTHON% "%~dp0tools\serve.py"
pause
