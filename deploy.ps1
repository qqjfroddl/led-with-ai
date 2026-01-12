# Vercel 자동 배포 스크립트
# 사용법: .\deploy.ps1 "커밋 메시지"

param(
    [string]$message = "deploy: update"
)

Write-Host "=== Vercel 배포 시작 ===" -ForegroundColor Green

# 1. 빌드
Write-Host "`n[1/4] 빌드 중..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "빌드 실패!" -ForegroundColor Red
    exit 1
}

# 2. Git 상태 확인
Write-Host "`n[2/4] Git 상태 확인..." -ForegroundColor Yellow
git status

# 3. 변경사항 커밋
Write-Host "`n[3/4] 변경사항 커밋..." -ForegroundColor Yellow
git add -A
git commit -m $message
if ($LASTEXITCODE -ne 0) {
    Write-Host "커밋할 변경사항이 없거나 커밋 실패" -ForegroundColor Yellow
}

# 4. GitHub 푸시
Write-Host "`n[4/4] GitHub에 푸시..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "푸시 실패!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 배포 완료! ===" -ForegroundColor Green
Write-Host "Vercel 대시보드에서 배포 상태 확인: https://vercel.com/qqjfroddls-projects/led-with-ai/deployments" -ForegroundColor Cyan
Write-Host "앱 URL: https://led-with-ai.vercel.app" -ForegroundColor Cyan

















