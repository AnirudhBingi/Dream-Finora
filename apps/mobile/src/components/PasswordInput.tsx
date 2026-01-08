import React, { useState } from 'react';
import { InputField, InputFieldProps } from './InputField';

interface PasswordInputProps extends Omit<InputFieldProps, 'secureTextEntry' | 'rightIcon' | 'onRightIconPress'> {
  showStrengthIndicator?: boolean;
  onStrengthChange?: (strength: 'weak' | 'fair' | 'good' | 'strong') => void;
}

export function PasswordInput({
  showStrengthIndicator = false,
  onStrengthChange,
  ...inputFieldProps
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [password, setPassword] = useState('');

  const calculateStrength = (pwd: string): 'weak' | 'fair' | 'good' | 'strong' => {
    if (pwd.length === 0) return 'weak';
    if (pwd.length < 6) return 'weak';
    
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^a-zA-Z\d]/.test(pwd)) score += 1;
    
    if (score <= 2) return 'weak';
    if (score === 3) return 'fair';
    if (score === 4) return 'good';
    return 'strong';
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    inputFieldProps.onChangeText?.(text);
    
    if (showStrengthIndicator && onStrengthChange) {
      const strength = calculateStrength(text);
      onStrengthChange(strength);
    }
  };

  return (
    <InputField
      {...inputFieldProps}
      secureTextEntry={!isVisible}
      rightIcon={isVisible ? 'visibility' : 'visibility-off'}
      onRightIconPress={() => setIsVisible(!isVisible)}
      onChangeText={handlePasswordChange}
    />
  );
}

