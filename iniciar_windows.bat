@echo off
setlocal EnableExtensions DisableDelayedExpansion
if not exist "%~dp0dist\index.html" goto :missing
start "" "%~dp0ABRIR_DEMONSTRACAO.html"
if errorlevel 1 goto :failed
exit /b 0
:missing
echo Extraia TODO o ZIP antes de executar. A pasta dist precisa estar junto deste arquivo.
pause
exit /b 1
:failed
echo Abra ABRIR_DEMONSTRACAO.html com Edge, Chrome ou Firefox.
pause
exit /b 1
