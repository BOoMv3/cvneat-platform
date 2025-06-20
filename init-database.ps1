# Demander le mot de passe MySQL
$mysqlPassword = Read-Host "Entrez le mot de passe root MySQL" -AsSecureString
$mysqlPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword))

# Lire le contenu du fichier SQL
$sql = Get-Content -Path "database.sql" -Raw

# Chemin vers l'exécutable MySQL
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# Vérifier si MySQL est installé
if (-not (Test-Path $mysqlPath)) {
    Write-Error "MySQL n'est pas installé ou le chemin est incorrect. Veuillez installer MySQL et vérifier le chemin."
    exit 1
}

# Exécuter les commandes SQL
try {
    $sql | & $mysqlPath -u root -p$mysqlPassword
    Write-Host "Base de données initialisée avec succès !" -ForegroundColor Green
} catch {
    Write-Error "Erreur lors de l'initialisation de la base de données : $_"
    exit 1
} 