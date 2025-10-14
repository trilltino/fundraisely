@echo off
echo.
echo ================================
echo Fundraisely Solana Build Script
echo ================================
echo.

REM Set environment variables
set HOME=C:\Users\isich
set USERPROFILE=C:\Users\isich
set SBF_SDK_PATH=C:\Users\isich\.cargo\bin\sdk\sbf

echo Environment variables set:
echo   HOME=%HOME%
echo   SBF_SDK_PATH=%SBF_SDK_PATH%
echo.

echo Building Anchor program...
echo.

REM Build
anchor build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================
    echo BUILD SUCCESSFUL!
    echo ================================
    echo.
    echo Generated files:
    echo   - target\deploy\fundraisely.so
    echo   - target\idl\fundraisely.json
    echo   - target\types\fundraisely.ts
    echo.
    echo Next steps:
    echo   1. Deploy: anchor deploy --provider.cluster devnet
    echo   2. Sync ID: anchor keys sync
    echo   3. Test: anchor test --skip-build
    echo.
) else (
    echo.
    echo ================================
    echo BUILD FAILED
    echo ================================
    echo.
    echo Try running as Administrator if permission errors occur.
    echo.
)

pause
