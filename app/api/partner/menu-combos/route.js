import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidId } from '@/lib/validation';
import {
  assembleCombosForRestaurant,
  assembleComboById,
  sanitizeComboPayload,
  ComboApiError,
  ensureAdminClient,
  fetchAuthorizedUser,
  ensureRestaurantOwnership
} from './utils';

const isMissingTableError = (err, table) => {
  const msg = (err?.message || '').toString().toLowerCase();
  return msg.includes('relation') && msg.includes(table.toLowerCase()) && msg.includes('does not exist');
};

const prepareBaseIngredientsPayload = (baseIngredients, optionId) => {
  const list = Array.isArray(baseIngredients) ? baseIngredients : [];
  return list
    .map((ingredient) => ({
      option_id: optionId,
      nom: ingredient?.nom || ingredient?.name || '',
      prix_supplementaire:
        ingredient?.prix_supplementaire !== null && ingredient?.prix_supplementaire !== undefined
          ? ingredient.prix_supplementaire
          : ingredient?.prix !== null && ingredient?.prix !== undefined
            ? ingredient.prix
            : 0,
      removable: ingredient?.removable !== false,
      ordre:
        ingredient?.ordre !== null && ingredient?.ordre !== undefined
          ? ingredient.ordre
          : 0
    }))
    .filter((x) => x.nom);
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'ID du restaurant requis' }, { status: 400 });
    }

    const combos = await assembleCombosForRestaurant(restaurantId);
    return NextResponse.json(combos);
  } catch (error) {
    if (error instanceof ComboApiError) {
      if (error.status >= 500) {
        console.error('❌ API Menu Combos - GET', error.details || error);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('❌ API Menu Combos - GET', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    ensureAdminClient();

    const payload = await request.json();
    const { restaurant_id, user_email } = payload;

    if (!restaurant_id || !user_email) {
      return NextResponse.json(
        { error: 'ID du restaurant et email utilisateur requis' },
        { status: 400 }
      );
    }

    if (!isValidId(restaurant_id)) {
      return NextResponse.json({ error: 'ID du restaurant invalide' }, { status: 400 });
    }

    const user = await fetchAuthorizedUser(user_email);
    await ensureRestaurantOwnership(restaurant_id, user.id);

    const { comboData, stepsData } = sanitizeComboPayload(payload);

    const { data: combo, error: comboError } = await supabaseAdmin
      .from('menu_combos')
      .insert([
        {
          ...comboData,
          restaurant_id
        }
      ])
      .select()
      .single();

    if (comboError) {
      throw new ComboApiError(
        'Erreur lors de la création du menu composé',
        500,
        comboError
      );
    }

    try {
      for (const step of stepsData) {
        const { options, ...stepData } = step;

        const { data: insertedStep, error: stepError } = await supabaseAdmin
          .from('menu_combo_steps')
          .insert([
            {
              ...stepData,
              combo_id: combo.id
            }
          ])
          .select()
          .single();

        if (stepError) {
          throw new ComboApiError(
            `Erreur lors de la création d'une étape du menu composé`,
            500,
            stepError
          );
        }

        for (const option of options) {
          const { variants, base_ingredients, ...optionData } = option;

          const { data: insertedOption, error: optionError } = await supabaseAdmin
            .from('menu_combo_options')
            .insert([
              {
                ...optionData,
                step_id: insertedStep.id
              }
            ])
            .select()
            .single();

          if (optionError) {
            throw new ComboApiError(
              `Erreur lors de la création d'une option du menu composé`,
              500,
              optionError
            );
          }

          if (Array.isArray(base_ingredients) && base_ingredients.length > 0) {
            const preparedBaseIngredients = prepareBaseIngredientsPayload(base_ingredients, insertedOption.id);

            const { error: baseIngredientsError } = await supabaseAdmin
              .from('menu_combo_option_base_ingredients')
              .insert(preparedBaseIngredients);

            if (baseIngredientsError) {
              // Tolérance schéma: si la table n'existe pas (migration non appliquée), ne pas bloquer la création.
              if (isMissingTableError(baseIngredientsError, 'menu_combo_option_base_ingredients')) {
                console.warn('⚠️ menu_combo_option_base_ingredients manquante: ingrédients de base ignorés (migration à appliquer).');
              } else {
                throw new ComboApiError(
                  `Erreur lors de la création des ingrédients de base du menu composé`,
                  500,
                  baseIngredientsError
                );
              }
            }
          }

          if (variants && variants.length > 0) {
            const variantsPayload = variants.map((variant) => ({
              ...variant,
              option_id: insertedOption.id
            }));

            const { error: variantsError } = await supabaseAdmin
              .from('menu_combo_option_variants')
              .insert(variantsPayload);

            if (variantsError) {
              throw new ComboApiError(
                `Erreur lors de la création des variantes du menu composé`,
                500,
                variantsError
              );
            }
          }
        }
      }
    } catch (error) {
      await supabaseAdmin
        .from('menu_combos')
        .delete()
        .eq('id', combo.id);
      throw error;
    }

    const comboWithDetails = await assembleComboById(combo.id);

    return NextResponse.json(
      {
        success: true,
        combo: comboWithDetails
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ComboApiError) {
      if (error.status >= 500) {
        console.error('❌ API Menu Combos - POST', error.details || error);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('❌ API Menu Combos - POST', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

