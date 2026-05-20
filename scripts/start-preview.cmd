@echo off
cd /d "%~dp0.."
npm run dev > preview.log 2> preview.err.log
