@echo off
cd /d "%~dp0"
title POS Printer Server
echo Starting POS Printer Server...
node server.cjs
pause
