@echo off
:: Fix for UNC paths (\\Mac\Home...)
pushd "%~dp0"

echo ========================================
echo   CVFlowBuddy - Windows Build Script
echo ========================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python from python.org
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    popd
    exit /b
)

:: 2. Install PyInstaller
echo [1/3] Checking/Installing PyInstaller...
python -m pip install pyinstaller

:: 3. Cleanup
echo [2/3] Cleaning up old build files...
if exist build rd /s /q build
if exist ..\dist rd /s /q ..\dist

:: 4. Build
echo [3/3] Building .exe (this may take a minute)...
:: Запускаем сборку manager.py, который лежит в той же папке desktop/
:: Результат сохраняем в корнeвую папку dist
python -m PyInstaller --windowed --onefile --name "CVFlowBuddy" --icon=icon.ico --distpath=..\dist manager.py

echo.
echo ========================================
echo   Build Successful!
echo   Your file is in the root DIST folder.
echo ========================================

popd
pause
