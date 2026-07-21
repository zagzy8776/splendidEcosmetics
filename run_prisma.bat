@echo off
cd /d "e:\Cosmetic Shop Website Build (2)\backend"
npx prisma db push > prisma_output.txt 2>&1
type prisma_output.txt