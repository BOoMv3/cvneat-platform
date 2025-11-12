import { supabase, supabaseAdmin } from '@/lib/supabase';
import { sanitizeInput, isValidAmount, isValidId } from '@/lib/validation';

export class ComboApiError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.name = 'ComboApiError';
    this.status = status;
    this.details = details;
  }
}

export const ensureAdminClient = () => {
  if (!supabaseAdmin) {
    throw new ComboApiError('Client Supabase administrateur non configuré', 500);
  }
};

export const fetchAuthorizedUser = async (userEmail) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', userEmail)
    .single();

  if (error || !user || user.role !== 'restaurant') {
    throw new ComboApiError('Accès refusé - rôle restaurant requis', 403, error);
  }

  return user;
};

export const ensureRestaurantOwnership = async (restaurantId, userId) => {
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('user_id', userId)
    .single();

  if (error || !restaurant) {
    throw new ComboApiError('Restaurant introuvable ou non autorisé', 404, error);
  }

  return restaurant;
};

const parseInteger = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const parsePrice = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = parseFloat(value);
  if (Number.isNaN(num) || num < 0) {
    throw new ComboApiError('Montant invalide détecté', 400);
  }
  return parseFloat(num.toFixed(2));
};

export const sanitizeComboPayload = (payload = {}) => {
  const {
    nom,
    name,
    title,
    description = '',
    prix_base = 0,
    base_price = 0,
    actif = true,
    active = true,
    ordre_affichage = 0,
    order = 0,
    steps = []
  } = payload;

  const rawName = nom || name || title;
  if (!rawName) {
    throw new ComboApiError('Le nom du menu composé est requis', 400);
  }

  const basePriceValue = prix_base ?? base_price ?? 0;
  if (!isValidAmount(basePriceValue)) {
    throw new ComboApiError('Le prix de base est invalide', 400);
  }

  const comboData = {
    nom: sanitizeInput(rawName),
    description: sanitizeInput(description || ''),
    prix_base: parsePrice(basePriceValue, 0),
    actif: actif !== false && active !== false,
    ordre_affichage: parseInteger(ordre_affichage ?? order, 0)
  };

  const stepsArray = Array.isArray(steps) ? steps : [];
  if (stepsArray.length === 0) {
    throw new ComboApiError('Un menu composé doit contenir au moins une étape', 400);
  }

  const sanitizedSteps = stepsArray.map((step, stepIndex) => {
    const stepTitleRaw = step.title || step.nom || step.name || `Étape ${stepIndex + 1}`;
    const sanitizedTitle = sanitizeInput(stepTitleRaw);
    if (!sanitizedTitle) {
      throw new ComboApiError(`Titre manquant pour l'étape ${stepIndex + 1}`, 400);
    }

    const minRaw = step.min_selections ?? step.min ?? 1;
    const maxRaw = step.max_selections ?? step.max ?? 1;

    const min = Math.max(0, parseInteger(minRaw, 1));
    let max = parseInteger(
      maxRaw,
      min === 0 ? 0 : Math.max(min, 1)
    );
    max = Math.max(0, max);
    if (max < min) {
      max = min;
    }

    const optionsArray = Array.isArray(step.options) ? step.options : [];
    if (optionsArray.length === 0) {
      throw new ComboApiError(`L'étape "${sanitizedTitle}" doit contenir au moins une option`, 400);
    }

    const sanitizedOptions = optionsArray.map((option, optionIndex) => {
      const optionType = option.type === 'custom' ? 'custom' : 'link_to_item';
      let linkedMenuId = null;

      if (optionType === 'link_to_item') {
        linkedMenuId = option.linked_menu_id || option.menu_id || option.id || null;
        if (!linkedMenuId || !isValidId(linkedMenuId)) {
          throw new ComboApiError(`Option ${optionIndex + 1} de l'étape "${sanitizedTitle}": ID d'article lié invalide`, 400);
        }
      }

      const optionNameRaw = option.nom || option.name || option.label || `Option ${optionIndex + 1}`;
      const sanitizedOptionName = sanitizeInput(optionNameRaw);
      if (!sanitizedOptionName) {
        throw new ComboApiError(`Nom manquant pour une option de l'étape "${sanitizedTitle}"`, 400);
      }

      const optionSupplement = option.prix_supplementaire ?? option.prix ?? option.price ?? 0;
      const optionPrice = parsePrice(optionSupplement, 0);

      const variantsArray = Array.isArray(option.variants) ? option.variants : [];
      const baseIngredientsArray = Array.isArray(option.base_ingredients) ? option.base_ingredients : [];
      const sanitizedVariants = variantsArray.map((variant, variantIndex) => {
        const variantNameRaw = variant.nom || variant.name || variant.label || `Variante ${variantIndex + 1}`;
        const sanitizedVariantName = sanitizeInput(variantNameRaw);
        if (!sanitizedVariantName) {
          throw new ComboApiError(`Nom manquant pour une variante de "${sanitizedOptionName}"`, 400);
        }

        const variantSupplement = variant.prix_supplementaire ?? variant.prix ?? variant.price ?? 0;
        const variantPrice = parsePrice(variantSupplement, 0);

        return {
          nom: sanitizedVariantName,
          description: sanitizeInput(variant.description || ''),
          prix_supplementaire: variantPrice,
          is_default: variant.is_default === true || variant.default === true,
          disponible: variant.disponible !== false,
          ordre: parseInteger(variant.ordre, variantIndex)
        };
      });

      const sanitizedBaseIngredients = baseIngredientsArray
        .map((ingredient, ingredientIndex) => {
          const ingredientNameRaw = ingredient?.nom || ingredient?.name || `Ingrédient ${ingredientIndex + 1}`;
          const sanitizedIngredientName = sanitizeInput(ingredientNameRaw);
          if (!sanitizedIngredientName) {
            return null;
          }
          const ingredientSupplement = ingredient?.prix_supplementaire ?? ingredient?.prix ?? 0;
          const ingredientPrice = parsePrice(ingredientSupplement, 0);

          return {
            nom: sanitizedIngredientName,
            prix_supplementaire: ingredientPrice,
            removable: ingredient?.removable !== false,
            ordre: parseInteger(ingredient?.ordre, ingredientIndex)
          };
        })
        .filter(Boolean);

      return {
        type: optionType,
        linked_menu_id: optionType === 'link_to_item' ? linkedMenuId : null,
        nom: sanitizedOptionName,
        description: sanitizeInput(option.description || ''),
        prix_supplementaire: optionPrice,
        image_url: option.image_url || null,
        disponible: option.disponible !== false,
        ordre: parseInteger(option.ordre, optionIndex),
        variants: sanitizedVariants,
        base_ingredients: sanitizedBaseIngredients
      };
    });

    return {
      title: sanitizedTitle,
      description: sanitizeInput(step.description || ''),
      min_selections: min,
      max_selections: max,
      ordre: parseInteger(step.ordre, stepIndex),
      options: sanitizedOptions
    };
  });

  return {
    comboData,
    stepsData: sanitizedSteps
  };
};

const enrichCombos = async (combos) => {
  if (!Array.isArray(combos) || combos.length === 0) {
    return [];
  }

  const comboIds = combos.map((combo) => combo.id);
  const combosWithBase = combos.map((combo) => ({
    ...combo,
    prix_base: combo.prix_base !== null ? parseFloat(combo.prix_base) : 0,
    steps: []
  }));

  const { data: stepsData, error: stepsError } = await supabase
    .from('menu_combo_steps')
    .select('*')
    .in('combo_id', comboIds)
    .order('ordre', { ascending: true })
    .order('created_at', { ascending: true });

  if (stepsError) {
    throw new ComboApiError('Erreur lors de la récupération des étapes du menu composé', 500, stepsError);
  }

  if (!stepsData || stepsData.length === 0) {
    return combosWithBase;
  }

  const stepIds = stepsData.map((step) => step.id);
  const { data: optionsData, error: optionsError } = await supabase
    .from('menu_combo_options')
    .select('*')
    .in('step_id', stepIds)
    .order('ordre', { ascending: true })
    .order('created_at', { ascending: true });

  if (optionsError) {
    throw new ComboApiError('Erreur lors de la récupération des options du menu composé', 500, optionsError);
  }

  const optionIds = optionsData && optionsData.length > 0
    ? optionsData.map((option) => option.id)
    : [];

  let variantsData = [];
  if (optionIds.length > 0) {
    const { data: variants, error: variantsError } = await supabase
      .from('menu_combo_option_variants')
      .select('*')
      .in('option_id', optionIds)
      .order('ordre', { ascending: true })
      .order('created_at', { ascending: true });

    if (variantsError) {
      throw new ComboApiError('Erreur lors de la récupération des variantes du menu composé', 500, variantsError);
    }
    variantsData = variants || [];
  }

  let baseIngredientsData = [];
  if (optionIds.length > 0) {
    try {
      const { data: baseIngredients, error: baseIngredientsError } = await supabase
        .from('menu_combo_option_base_ingredients')
        .select('*')
        .in('option_id', optionIds)
        .order('ordre', { ascending: true })
        .order('created_at', { ascending: true });

      if (baseIngredientsError) {
        throw baseIngredientsError;
      }

      baseIngredientsData = baseIngredients || [];
    } catch (baseIngredientsError) {
      if (baseIngredientsError?.code === '42P01') {
        baseIngredientsData = [];
      } else {
        throw new ComboApiError('Erreur lors de la récupération des ingrédients de base du menu composé', 500, baseIngredientsError);
      }
    }
  }

  const variantsByOption = variantsData.reduce((acc, variant) => {
    const optionId = variant.option_id;
    const list = acc.get(optionId) || [];
    list.push({
      ...variant,
      prix_supplementaire: variant.prix_supplementaire !== null ? parseFloat(variant.prix_supplementaire) : 0
    });
    acc.set(optionId, list);
    return acc;
  }, new Map());

  const baseIngredientsByOption = baseIngredientsData.reduce((acc, ingredient) => {
    const optionId = ingredient.option_id;
    const list = acc.get(optionId) || [];
    list.push({
      ...ingredient,
      prix_supplementaire: ingredient.prix_supplementaire !== null ? parseFloat(ingredient.prix_supplementaire) : 0,
      removable: ingredient.removable !== false
    });
    acc.set(optionId, list);
    return acc;
  }, new Map());

  const optionsByStep = optionsData.reduce((acc, option) => {
    const stepId = option.step_id;
    const list = acc.get(stepId) || [];
    list.push({
      ...option,
      prix_supplementaire: option.prix_supplementaire !== null ? parseFloat(option.prix_supplementaire) : 0,
      variants: variantsByOption.get(option.id) || [],
      base_ingredients: baseIngredientsByOption.get(option.id) || []
    });
    acc.set(stepId, list);
    return acc;
  }, new Map());

  const stepsByCombo = stepsData.reduce((acc, step) => {
    const comboId = step.combo_id;
    const list = acc.get(comboId) || [];
    list.push({
      ...step,
      options: optionsByStep.get(step.id) || []
    });
    acc.set(comboId, list);
    return acc;
  }, new Map());

  return combosWithBase.map((combo) => ({
    ...combo,
    steps: stepsByCombo.get(combo.id) || []
  }));
};

export const assembleCombosForRestaurant = async (restaurantId) => {
  if (!restaurantId) {
    throw new ComboApiError('ID du restaurant requis', 400);
  }

  if (!isValidId(restaurantId)) {
    throw new ComboApiError('ID du restaurant invalide', 400);
  }

  const { data: combos, error } = await supabase
    .from('menu_combos')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('ordre_affichage', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new ComboApiError('Erreur lors de la récupération des menus composés', 500, error);
  }

  return enrichCombos(combos || []);
};

export const assembleComboById = async (comboId) => {
  if (!comboId) {
    throw new ComboApiError('ID du menu composé requis', 400);
  }

  if (!isValidId(comboId)) {
    throw new ComboApiError('ID du menu composé invalide', 400);
  }

  const { data: combo, error } = await supabase
    .from('menu_combos')
    .select('*')
    .eq('id', comboId)
    .single();

  if (error) {
    throw new ComboApiError('Menu composé introuvable', 404, error);
  }

  const combos = await enrichCombos([combo]);
  return combos[0] || null;
};

