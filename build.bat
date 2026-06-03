@echo off
REM For Windows developers who need to run the build locally

echo Installing backend dependencies...
cd backend
call npm install
call npx prisma generate

echo Building frontend...
cd ..
call npm install
call npm run build

echo Copying frontend build to backend...
if not exist "backend\public" mkdir "backend\public"
robocopy dist backend\public /E /purge

echo Build complete! Ready for Railway deployment.
