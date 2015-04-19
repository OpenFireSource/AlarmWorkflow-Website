@echo off
rem -------------------------------------------------
rem AlarmWorkflow build script (RELEASE)
rem 
rem Please change "Framework64" to "Framework" in the following path
rem if you're running this script on a x86 or 32-bit OS.
rem -------------------------------------------------
SET build=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\msbuild.exe

echo -------------------------------------------------
echo Build Website(s)...
%build% Website\Website.sln /p:Configuration=Release /verbosity:minimal

pause