import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token reCAPTCHA manquant' },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY non configurée');
      // En développement, on peut accepter sans vérification si la clé n'est pas configurée
      return NextResponse.json({ success: true, score: 0.9 });
    }

    // Vérifier le token avec Google reCAPTCHA
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    if (data.success) {
      // reCAPTCHA v3 retourne un score entre 0.0 et 1.0
      // 1.0 = très probablement un humain, 0.0 = très probablement un bot
      // On accepte généralement les scores >= 0.5
      const score = data.score || 0;
      const threshold = 0.5;

      if (score >= threshold) {
        return NextResponse.json({ success: true, score });
      } else {
        return NextResponse.json(
          { success: false, error: 'Score reCAPTCHA trop faible', score },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Échec de la vérification reCAPTCHA', errors: data['error-codes'] },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erreur vérification reCAPTCHA:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la vérification' },
      { status: 500 }
    );
  }
}

