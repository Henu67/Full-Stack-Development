@echo off
echo Cloning repository to Desktop...
cd /d "C:\Users\User\Desktop"
if exist "Full-Stack-Development" (
    echo Repo already exists. Deleting old one to start fresh...
    rmdir /s /q "Full-Stack-Development"
)

git clone https://github.com/Henu67/Full-Stack-Development.git
cd Full-Stack-Development

echo Setting up dev branch...
git fetch origin
git checkout -b dev origin/dev
git checkout -b feat/improve-drag-ghost dev

echo Copying the updated DragGhost.tsx file...
copy /Y "C:\Users\User\Downloads\synchboard-template-main (1)\synchboard-template-main\frontend\src\components\DragGhost.tsx" "synchboard\frontend\src\components\DragGhost.tsx"

echo Committing and pushing...
git add .
git commit -m "feat: improve DragGhost shadow and visual effect during drag-and-drop"
git push -u origin feat/improve-drag-ghost

echo.
echo All done Machan! Now you can go to Github and create the Pull Request!
pause
