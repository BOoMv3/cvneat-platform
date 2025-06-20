@echo off
echo Initialisation de la base de données CVNeat...

REM Demander le mot de passe MySQL
set /p mysqlPassword="Entrez votre mot de passe MySQL root : "

REM Créer la base de données et les tables
mysql -u root -p%mysqlPassword% < backend/database.sql

if %errorlevel% equ 0 (
    echo Base de données initialisée avec succès !
) else (
    echo Erreur lors de l'initialisation de la base de données.
    echo Vérifiez que MySQL est bien installé et que le mot de passe est correct.
)

pause 