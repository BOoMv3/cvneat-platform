'use client';
import { useState, useEffect } from 'react';

// Hook personnalisé pour la validation de formulaire
export function useFormValidation(initialValues, validationRules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Validation en temps réel
  useEffect(() => {
    const newErrors = {};
    let formIsValid = true;

    Object.keys(validationRules).forEach(field => {
      const value = values[field];
      const rules = validationRules[field];
      
      // Validation requise
      if (rules.required && (!value || value.trim() === '')) {
        newErrors[field] = rules.required;
        formIsValid = false;
        return;
      }

      // Validation email
      if (rules.email && value && !isValidEmail(value)) {
        newErrors[field] = rules.email;
        formIsValid = false;
        return;
      }

      // Validation téléphone
      if (rules.phone && value && !isValidPhone(value)) {
        newErrors[field] = rules.phone;
        formIsValid = false;
        return;
      }

      // Validation code postal
      if (rules.postalCode && value && !isValidPostalCode(value)) {
        newErrors[field] = rules.postalCode;
        formIsValid = false;
        return;
      }

      // Validation mot de passe
      if (rules.password && value) {
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.isValid) {
          newErrors[field] = passwordValidation.errors[0];
          formIsValid = false;
          return;
        }
      }

      // Validation longueur minimale
      if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field] = `Minimum ${rules.minLength} caractères requis`;
        formIsValid = false;
        return;
      }

      // Validation longueur maximale
      if (rules.maxLength && value && value.length > rules.maxLength) {
        newErrors[field] = `Maximum ${rules.maxLength} caractères autorisés`;
        formIsValid = false;
        return;
      }

      // Validation personnalisée
      if (rules.custom && value) {
        const customError = rules.custom(value, values);
        if (customError) {
          newErrors[field] = customError;
          formIsValid = false;
        }
      }
    });

    setErrors(newErrors);
    setIsValid(formIsValid && Object.keys(values).length > 0);
  }, [values, validationRules]);

  const handleChange = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsValid(false);
  };

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    reset,
    setValues
  };
}

// Fonctions de validation (réutilisables)
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleanPhone = phone.replace(/[\s\-\.]/g, '');
  const phoneRegex = /^0[1-9][0-9]{8}$/;
  return phoneRegex.test(cleanPhone);
}

export function isValidPostalCode(postalCode) {
  if (!postalCode || typeof postalCode !== 'string') return false;
  const cleanPostalCode = postalCode.trim();
  const postalRegex = /^[0-9]{5}$/;
  return postalRegex.test(cleanPostalCode);
}

export function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Composant d'input avec validation
export function ValidatedInput({ 
  name, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  onBlur, 
  error, 
  touched, 
  required = false,
  className = '',
  ...props 
}) {
  return (
    <div className="w-full">
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        required={required}
        className={`
          w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200
          ${error && touched 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${className}
        `}
        {...props}
      />
      {error && touched && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
}

// Composant de mot de passe avec indicateur de force
export function PasswordInput({ 
  name, 
  placeholder, 
  value, 
  onChange, 
  onBlur, 
  error, 
  touched, 
  required = false,
  className = '',
  ...props 
}) {
  const passwordStrength = validatePassword(value);
  const strengthLevel = passwordStrength.isValid ? 4 : passwordStrength.errors.length;

  const getStrengthColor = (level) => {
    if (level <= 1) return 'bg-red-500';
    if (level <= 2) return 'bg-orange-500';
    if (level <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (level) => {
    if (level <= 1) return 'Très faible';
    if (level <= 2) return 'Faible';
    if (level <= 3) return 'Moyen';
    return 'Fort';
  };

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="password"
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          onBlur={() => onBlur(name)}
          required={required}
          className={`
            w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all duration-200
            ${error && touched 
              ? 'border-red-500 bg-red-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${className}
          `}
          {...props}
        />
      </div>
      
      {/* Indicateur de force du mot de passe */}
      {value && (
        <div className="mt-2">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strengthLevel)}`}
                style={{ width: `${(strengthLevel / 4) * 100}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${
              strengthLevel <= 2 ? 'text-red-600' : 
              strengthLevel <= 3 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {getStrengthText(strengthLevel)}
            </span>
          </div>
        </div>
      )}
      
      {error && touched && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
}
