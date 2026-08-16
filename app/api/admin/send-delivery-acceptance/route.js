import { NextResponse } from 'next/server';
import emailService from '@/lib/emailService';

export const dynamic = 'force-dynamic';

const DEFAULT_RECIPIENTS = [
  { email: 'guillierpauline24@gmail.com', prenom: 'Pauline' },
  { email: 'ninamaheli0517@gmail.com', prenom: 'Nina' },
  { email: 'benedicte.noviant@hotmail.fr', prenom: 'Bénédicte' },
  { email: 'asdih.marwan@orange.fr', prenom: 'Marwan' },
  { email: 'lolavigier2@gmail.com', prenom: 'Lola' },
];

const logoUrl = 'https://www.cvneat.fr/cvneat-logo.png';
const loginUrl = 'https://www.cvneat.fr/login';
const siteUrl = 'https://www.cvneat.fr';

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
                  Connectez-vous sur <a href="${loginUrl}" style="color:#ea580c;font-weight:bold;">cvneat.fr/login</a> puis ouvrez votre espace livreur.
                  Nous vous recommandons de changer le mot de passe après la première connexion.
                </p>
              </div>`;
}

function buildHtml(prenom, { loginEmail, password } = {}) {
  const name = prenom || '';
  const credentialsHtml = buildCredentialsBlock(loginEmail, password);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Candidature acceptée — CVN'EAT</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c 0%,#dc2626 100%);padding:28px 24px;text-align:center;">
              <img src="${logoUrl}" alt="CVN'EAT" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:50%;background:#fff;padding:4px;" />
              <h1 style="margin:0;color:#ffffff;font-size:22px;line-height:1.3;">Candidature acceptée</h1>
              <p style="margin:8px 0 0;color:#ffedd5;font-size:14px;">Bienvenue dans l'équipe livreurs CVN'EAT</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 16px;font-size:16px;">Bonjour <strong>${name}</strong>,</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                Bonne nouvelle : votre candidature pour devenir livreur sur <strong>CVN'EAT</strong> a été <strong style="color:#16a34a;">acceptée</strong>.
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
                Votre compte livreur est maintenant activé. Connectez-vous pour accéder à votre espace et commencer les courses.
              </p>
              ${credentialsHtml}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:10px;background:#ea580c;">
                    <a href="${loginUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">
                      Se connecter à mon espace livreur
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:18px;margin:0 0 20px;">
                <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#9a3412;">Obligation légale — Auto-entrepreneur</p>
                <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#7c2d12;">
                  Pour livrer avec CVN'EAT, vous devez <strong>obligatoirement être déclaré en auto-entrepreneur</strong> (micro-entreprise) auprès de l'URSSAF.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#7c2d12;">
                  CVN'EAT ne vous salarie pas : vous êtes <strong>indépendant</strong>. C'est votre responsabilité de créer / avoir votre statut, déclarer votre chiffre d'affaires et payer vos cotisations.
                </p>
              </div>

              <p style="margin:0 0 10px;font-size:16px;font-weight:bold;color:#111827;">Comment fonctionnent les livraisons</p>
              <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:#374151;">
                <li>Connectez-vous sur <a href="${siteUrl}" style="color:#ea580c;">cvneat.fr</a> ou via l'application.</li>
                <li>Ouvrez votre espace <strong>Livreur</strong> et indiquez-vous disponible.</li>
                <li>Les commandes à livrer apparaissent dans votre tableau de bord.</li>
                <li>Acceptez une course, récupérez la commande au restaurant, puis livrez-la au client.</li>
                <li>Validez la livraison dans l'app / le dashboard.</li>
                <li>Vos gains s'accumulent dans votre espace ; le paiement suit les règles CVN'EAT.</li>
              </ol>

              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;margin:0 0 20px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#166534;">
                  <strong>Important :</strong> soyez ponctuel, courtois avec les clients et les restaurants, et respectez le code de la route. Un comportement professionnel est exigé.
                </p>
              </div>

              <p style="margin:0 0 8px;font-size:14px;color:#374151;">
                Besoin d'aide ? Écrivez-nous à
                <a href="mailto:contact@cvneat.fr" style="color:#ea580c;font-weight:bold;">contact@cvneat.fr</a>
              </p>
              <p style="margin:16px 0 0;font-size:15px;color:#111827;">
                À bientôt sur la route,<br>
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

function buildText(prenom, { loginEmail, password } = {}) {
  const credentials =
    loginEmail && password
      ? `

VOS IDENTIFIANTS DE CONNEXION
Email : ${loginEmail}
Mot de passe : ${password}
Connexion : ${loginUrl}
(Changez le mot de passe après la première connexion.)
`
      : `

Connectez-vous : ${loginUrl}
`;

  return `Bonjour ${prenom},

Votre candidature livreur CVN'EAT a été acceptée. Votre compte est activé.
${credentials}
OBLIGATION LÉGALE — AUTO-ENTREPRENEUR
Pour livrer avec CVN'EAT, vous devez obligatoirement être déclaré en auto-entrepreneur (micro-entreprise) auprès de l'URSSAF.
CVN'EAT ne vous salarie pas : vous êtes indépendant.

COMMENT FONCTIONNENT LES LIVRAISONS
1. Connectez-vous sur cvneat.fr ou via l'app
2. Indiquez-vous disponible dans l'espace Livreur
3. Acceptez les courses proposées
4. Récupérez au restaurant et livrez au client
5. Validez la livraison
6. Vos gains s'accumulent dans votre espace

Important : ponctualité, courtoisie et respect du code de la route sont exigés.

Support : contact@cvneat.fr
L'équipe CVN'EAT`;
}

function authorize(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey || !token || token !== serviceKey) {
    return false;
  }
  return true;
}

export async function POST(request) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Un destinataire : { email, prenom, loginEmail?, password? }
    // ou liste : { recipients: [{email,prenom,loginEmail?,password?}] }
    // Sans body → liste par défaut (batch historique)
    let recipients = DEFAULT_RECIPIENTS;
    if (body?.email) {
      recipients = [
        {
          email: String(body.email).trim(),
          prenom: (body.prenom || '').trim() || 'Livreur',
          loginEmail: (body.loginEmail || body.email || '').trim() || null,
          password: body.password ? String(body.password) : null,
        },
      ];
    } else if (Array.isArray(body?.recipients) && body.recipients.length > 0) {
      recipients = body.recipients
        .map((r) => ({
          email: String(r.email || '').trim(),
          prenom: String(r.prenom || '').trim() || 'Livreur',
          loginEmail: (r.loginEmail || r.email || '').trim() || null,
          password: r.password ? String(r.password) : null,
        }))
        .filter((r) => r.email);
    }

    if (!recipients.length) {
      return NextResponse.json({ error: 'Aucun destinataire' }, { status: 400 });
    }

    const subject = "Votre candidature livreur CVN'EAT a été acceptée";
    const results = [];

    for (const r of recipients) {
      try {
        const creds = { loginEmail: r.loginEmail || r.email, password: r.password || null };
        const info = await emailService.sendEmail({
          to: r.email,
          subject,
          html: buildHtml(r.prenom, creds),
          text: buildText(r.prenom, creds),
        });
        results.push({
          email: r.email,
          ok: true,
          id: info?.messageId || null,
        });
      } catch (e) {
        results.push({ email: r.email, ok: false, error: e.message });
      }
    }

    try {
      const firstCreds = {
        loginEmail: recipients[0].loginEmail || recipients[0].email,
        password: recipients[0].password || null,
      };
      const verify = await emailService.sendEmail({
        to: 'contact@cvneat.fr',
        subject: `[COPIE VÉRIFICATION] ${subject}`,
        html:
          buildHtml(recipients[0].prenom, firstCreds) +
          `<p style="padding:16px;font-size:12px;color:#6b7280;">Copie de vérification admin — emails envoyés à : ${recipients.map((x) => x.email).join(', ')}</p>`,
        text:
          buildText(recipients[0].prenom, firstCreds) +
          `\n\nCopie vérification — destinataires: ${recipients.map((x) => x.email).join(', ')}`,
      });
      results.push({
        email: 'contact@cvneat.fr',
        ok: true,
        verifyCopy: true,
        id: verify?.messageId || null,
      });
    } catch (e) {
      results.push({ email: 'contact@cvneat.fr', ok: false, verifyCopy: true, error: e.message });
    }

    const allOk = results.every((r) => r.ok);
    return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 207 });
  } catch (e) {
    console.error('send-delivery-acceptance:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

