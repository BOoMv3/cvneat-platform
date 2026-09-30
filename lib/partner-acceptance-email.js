/**
 * Email demande partenaire acceptée (HTML + texte).
 */

const logoUrl = 'https://www.cvneat.fr/cvneat-logo.png';
const loginUrl = 'https://www.cvneat.fr/login';
const partnerUrl = 'https://www.cvneat.fr/partner';
const siteUrl = 'https://www.cvneat.fr';

export const PARTNER_ACCEPTANCE_SUBJECT = "Votre demande partenaire CVN'EAT a été acceptée";

function buildCredentialsBlock(loginEmail, password) {
  if (!loginEmail || !password) return '';
  return `
              <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:12px;padding:18px;margin:0 0 20px;">
                <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#1e3a8a;">Vos identifiants de connexion</p>
                <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#1e40af;">
                  <strong>Email :</strong> ${loginEmail}
                </p>
                <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#1e40af;">
                  <strong>Mot de passe :</strong> ${password}
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#1e3a8a;">
                  Connectez-vous sur <a href="${loginUrl}" style="color:#ea580c;font-weight:bold;">cvneat.fr/login</a> puis ouvrez votre espace partenaire.
                  Changez le mot de passe après la première connexion.
                </p>
              </div>`;
}

export function buildPartnerAcceptanceHtml(restaurantName, { loginEmail, password } = {}) {
  const name = restaurantName || 'votre établissement';
  const credentialsHtml = buildCredentialsBlock(loginEmail, password);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partenariat accepté — CVN'EAT</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c 0%,#dc2626 100%);padding:28px 24px;text-align:center;">
              <img src="${logoUrl}" alt="CVN'EAT" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:50%;background:#fff;padding:4px;" />
              <h1 style="margin:0;color:#ffffff;font-size:22px;line-height:1.3;">Partenariat accepté</h1>
              <p style="margin:8px 0 0;color:#ffedd5;font-size:14px;">Bienvenue sur CVN'EAT</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 16px;font-size:16px;">Bonjour,</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                Bonne nouvelle : votre demande de partenariat pour <strong>${name}</strong> a été
                <strong style="color:#16a34a;">acceptée</strong>.
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
                Votre fiche établissement a été créée. Connectez-vous pour la configurer
                (horaires, menu, photos, temps de préparation) avant de recevoir des commandes.
              </p>
              ${credentialsHtml}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:10px;background:#ea580c;">
                    <a href="${partnerUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">
                      Configurer mon établissement
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:18px;margin:0 0 20px;">
                <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#9a3412;">À faire ensuite</p>
                <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#7c2d12;">
                  <li>Renseigner vos horaires d'ouverture</li>
                  <li>Ajouter votre menu et vos photos</li>
                  <li>Confirmer l'ouverture du jour pour apparaître aux clients</li>
                </ol>
              </div>

              <p style="margin:0 0 8px;font-size:14px;color:#374151;">
                Besoin d'aide ? Écrivez-nous à
                <a href="mailto:contact@cvneat.fr" style="color:#ea580c;font-weight:bold;">contact@cvneat.fr</a>
              </p>
              <p style="margin:16px 0 0;font-size:15px;color:#111827;">
                À bientôt,<br>
                <strong>L'équipe CVN'EAT</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#111827;padding:18px 24px;text-align:center;">
              <p style="margin:0 0 4px;color:#f9fafb;font-size:13px;font-weight:bold;">CVN'EAT</p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">Livraison de repas · Ganges et alentours</p>
              <p style="margin:8px 0 0;"><a href="${siteUrl}" style="color:#fb923c;font-size:12px;text-decoration:none;">www.cvneat.fr</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPartnerAcceptanceText(restaurantName, { loginEmail, password } = {}) {
  const name = restaurantName || 'votre établissement';
  const credentials =
    loginEmail && password
      ? `

VOS IDENTIFIANTS DE CONNEXION
Email : ${loginEmail}
Mot de passe : ${password}
Connexion : ${loginUrl}
Espace partenaire : ${partnerUrl}
(Changez le mot de passe après la première connexion.)
`
      : `

Connectez-vous : ${loginUrl}
Espace partenaire : ${partnerUrl}
`;

  return `Bonjour,

Votre demande de partenariat pour ${name} a été acceptée sur CVN'EAT.
Votre fiche établissement a été créée — configurez horaires, menu et photos avant de recevoir des commandes.
${credentials}
À faire ensuite :
1. Renseigner vos horaires
2. Ajouter menu et photos
3. Confirmer l'ouverture du jour pour apparaître aux clients

Support : contact@cvneat.fr
L'équipe CVN'EAT`;
}
