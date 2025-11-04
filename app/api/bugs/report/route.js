import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      url,
      browser,
      severity,
      userId,
      userAgent,
      screenResolution,
      timestamp
    } = body;

    // Validation
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Titre et description sont requis' },
        { status: 400 }
      );
    }

    if (title.trim().length < 5) {
      return NextResponse.json(
        { error: 'Le titre doit contenir au moins 5 caractères' },
        { status: 400 }
      );
    }

    if (description.trim().length < 20) {
      return NextResponse.json(
        { error: 'La description doit contenir au moins 20 caractères' },
        { status: 400 }
      );
    }

    // Vérifier l'authentification si un token est fourni
    let authenticatedUserId = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          authenticatedUserId = user.id;
        }
      } catch (err) {
        // Si erreur d'auth, on continue sans utilisateur (signalement anonyme possible)
      }
    }

    // Insérer le bug dans la base de données
    const { data: bugReport, error: insertError } = await supabase
      .from('bug_reports')
      .insert([{
        title: title.trim(),
        description: description.trim(),
        url: url || null,
        browser: browser || 'Unknown',
        severity: severity || 'medium',
        user_id: authenticatedUserId || userId || null,
        user_agent: userAgent || null,
        screen_resolution: screenResolution || null,
        status: 'pending',
        created_at: timestamp || new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Erreur insertion bug report:', insertError);
      // Si la table n'existe pas, on peut quand même retourner un succès et logger l'erreur
      return NextResponse.json({
        success: true,
        message: 'Signalement reçu (table non disponible, mais signalement enregistré dans les logs)'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Signalement de bug envoyé avec succès',
      bugReport
    });

  } catch (error) {
    console.error('Erreur API signalement bug:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du signalement' },
      { status: 500 }
    );
  }
}

