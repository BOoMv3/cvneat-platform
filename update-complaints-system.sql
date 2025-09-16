-- ========================================
-- SCRIPT DE MISE À JOUR - SYSTÈME DE RÉCLAMATIONS
-- ========================================
-- À exécuter si les triggers existent déjà

-- 1. Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_validate_complaint_window ON complaints;
DROP TRIGGER IF EXISTS trigger_update_complaint_history ON complaints;
DROP TRIGGER IF EXISTS trigger_convert_feedback_to_complaint ON order_feedback;

-- 2. Recréer les triggers
CREATE TRIGGER trigger_validate_complaint_window
    BEFORE INSERT ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION validate_complaint_window();

CREATE TRIGGER trigger_update_complaint_history
    AFTER INSERT OR UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_complaint_history();

CREATE TRIGGER trigger_convert_feedback_to_complaint
    AFTER INSERT ON order_feedback
    FOR EACH ROW
    EXECUTE FUNCTION convert_feedback_to_complaint();

-- 3. Vérifier que tout est en place
SELECT 'Mise à jour terminée avec succès !' as status;
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%complaint%' 
ORDER BY trigger_name;
