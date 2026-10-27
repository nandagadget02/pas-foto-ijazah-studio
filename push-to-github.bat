@echo off
echo ========================================================
echo   PAS FOTO IJAZAH STUDIO - PUSH TO GITHUB & GH-PAGES
echo ========================================================
echo.
echo 1. Memeriksa koneksi remote origin...
git remote -v
echo.
echo 2. Mendorong branch 'main' (source code final + Android project)...
git push -u origin main
echo.
echo 3. Mendorong branch 'gh-pages' (GitHub Pages Web Deploy)...
git push -u origin gh-pages
echo.
echo ========================================================
echo   SELESAI!
echo   Web GitHub Pages akan aktif di:
echo   https://nanda0078.github.io/pas-foto-ijazah-studio/
echo ========================================================
pause
