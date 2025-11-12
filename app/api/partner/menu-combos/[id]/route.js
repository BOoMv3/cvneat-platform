import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidId } from '@/lib/validation';
import {
  assembleComboById,
  sanitizeComboPayload,
  ComboApiError,
  ensureAdminClient,
  fetchAuthorizedUser,
  ensureRestaurantOwnership
} from '../utils';

export async function GET(_request, { params }) {
  try {
    const comboId = params?.id;

    if (!comboId || !isValidId(comboId)) {
      return NextResponse.json({ error: 'ID du menu composé invalide' }, { status: 400 });
    }

    const combo = await assembleComboById(comboId);
    return NextResponse.json(combo);
  } catch (error) {
    if (error instanceof ComboApiError) {
      if (error.status >= 500) {
        console.error('❌ API Menu Combos - GET by ID', error.details || error);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('❌ API Menu Combos - GET by ID', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    ensureAdminClient();

    const comboId = params?.id;
    if (!comboId || !isValidId(comboId)) {
      return NextResponse.json({ error: 'ID du menu composé invalide' }, { status: 400 });
    }

    const payload = await request.json();
    const { user_email } = payload || {};

    if (!user_email) {
      return NextResponse.json(
        { error: 'Email utilisateur requis pour la mise à jour du menu composé' },
        { status: 400 }
      );
    }

    const user = await fetchAuthorizedUser(user_email);
    const existingCombo = await assembleComboById(comboId);
    await ensureRestaurantOwnership(existingCombo.restaurant_id, user.id);

    const { comboData, stepsData } = sanitizeComboPayload(payload);

    const { data: updatedCombo, error: updateError } = await supabaseAdmin
      .from('menu_combos')
      .update(comboData)
      .eq('id', comboId)
      .select()
      .single();

    if (updateError || !updatedCombo) {
      throw new ComboApiError(
        'Erreur lors de la mise à jour du menu composé',
        500,
        updateError
      );
    }

    const { data: existingOptionIds, error: existingOptionsError } = await supabaseAdmin
      .from('menu_combo_steps')
      .select('id, menu_combo_options ( id )')
      .eq('combo_id', comboId);

    if (existingOptionsError) {
      throw new ComboApiError(
        'Erreur lors de la préparation de la mise à jour des étapes',
        500,
        existingOptionsError
      );
    }

    const oldStepIds = [];
    const oldOptionIds = [];

    (existingOptionIds || []).forEach((step) => {
      oldStepIds.push(step.id);
      (step.menu_combo_options || []).forEach((option) => {
        oldOptionIds.push(option.id);
      });
    });
    const insertedStepIds = [];

    try {
      for (const step of stepsData) {
        const { options, ...stepData } = step;

        const { data: newStep, error: stepInsertError } = await supabaseAdmin
          .from('menu_combo_steps')
          .insert([
            {
              ...stepData,
              combo_id: comboId
            }
          ])
          .select()
          .single();

        if (stepInsertError || !newStep) {
          throw new ComboApiError(
            `Erreur lors de l'insertion d'une nouvelle étape`,
            500,
            stepInsertError
          );
        }

        insertedStepIds.push(newStep.id);

        for (const option of options) {
          const { variants, base_ingredients, ...optionData } = option;

          const { data: newOption, error: optionInsertError } = await supabaseAdmin
            .from('menu_combo_options')
            .insert([
              {
                ...optionData,
                step_id: newStep.id
              }
            ])
            .select()
            .single();

          if (optionInsertError || !newOption) {
            throw new ComboApiError(
              `Erreur lors de l'insertion d'une option`,
              500,
              optionInsertError
            );
          }

          if (Array.isArray(base_ingredients) && base_ingredients.length > 0) {
            const preparedBaseIngredients = base_ingredients.map((ingredient) => ({
              ...ingredient,
              option_id: newOption.id
            }));

            const { error: baseIngredientsError } = await supabaseAdmin
              .from('menu_combo_option_base_ingredients')
              .insert(preparedBaseIngredients);

            if (baseIngredientsError) {
              throw new ComboApiError(
                `Erreur lors de l'insertion des ingrédients de base`,
                500,
                baseIngredientsError
              );
            }
          }

          if (variants && variants.length > 0) {
            const variantsPayload = variants.map((variant) => ({
              ...variant,
              option_id: newOption.id
            }));

            const { error: variantInsertError } = await supabaseAdmin
              .from('menu_combo_option_variants')
              .insert(variantsPayload);

            if (variantInsertError) {
              throw new ComboApiError(
                `Erreur lors de l'insertion des variantes`,
                500,
                variantInsertError
              );
            }
          }
        }
      }
    } catch (error) {
      if (insertedStepIds.length > 0) {
        await supabaseAdmin
          .from('menu_combo_steps')
          .delete()
          .in('id', insertedStepIds);
      }
      throw error;
    }

    if (oldOptionIds.length > 0) {
      await supabaseAdmin
        .from('menu_combo_option_variants')
        .delete()
        .in('option_id', oldOptionIds);

      await supabaseAdmin
        .from('menu_combo_option_base_ingredients')
        .delete()
        .in('option_id', oldOptionIds);
    }

    if (oldStepIds.length > 0) {
      await supabaseAdmin
        .from('menu_combo_steps')
        .delete()
        .in('id', oldStepIds);
    }

    const comboWithDetails = await assembleComboById(comboId);

    return NextResponse.json({
      success: true,
      combo: comboWithDetails
    });
  } catch (error) {
    if (error instanceof ComboApiError) {
      if (error.status >= 500) {
        console.error('❌ API Menu Combos - PUT', error.details || error);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('❌ API Menu Combos - PUT', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    ensureAdminClient();

    const comboId = params?.id;
    if (!comboId || !isValidId(comboId)) {
      return NextResponse.json({ error: 'ID du menu composé invalide' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    let userEmail = searchParams.get('user_email');

    if (!userEmail) {
      try {
        const body = await request.json();
        userEmail = body?.user_email;
      } catch (_) {
        // Pas de corps JSON, continuer
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email utilisateur requis pour la suppression du menu composé' },
        { status: 400 }
      );
    }

    const user = await fetchAuthorizedUser(userEmail);
    const existingCombo = await assembleComboById(comboId);
    await ensureRestaurantOwnership(existingCombo.restaurant_id, user.id);

    const { error: deleteError } = await supabaseAdmin
      .from('menu_combos')
      .delete()
      .eq('id', comboId);

    if (deleteError) {
      throw new ComboApiError(
        'Erreur lors de la suppression du menu composé',
        500,
        deleteError
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ComboApiError) {
      if (error.status >= 500) {
        console.error('❌ API Menu Combos - DELETE', error.details || error);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('❌ API Menu Combos - DELETE', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

