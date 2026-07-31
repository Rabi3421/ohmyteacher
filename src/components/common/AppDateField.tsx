import React from 'react';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../icons/AppIcon';
import {
  AppSelectField,
  type AppSelectFieldProps,
} from './AppSelectField';

export type AppDateFieldProps = Omit<AppSelectFieldProps, 'children'>;

export function AppDateField(props: AppDateFieldProps) {
  const theme = useAppTheme();

  return (
    <AppSelectField
      leftIcon={
        <AppIcon
          color={theme.colors.textSecondary}
          name="calendar"
          size={theme.iconSizes.sm}
        />
      }
      placeholder="Select date"
      {...props}
      // AppSelectField owns a standardized affordance; this component exists
      // as a form-ready semantic API for a future date-picker adapter.
      helperText={props.helperText}
    />
  );
}

// Exported for date-picker adapters that need the canonical field icon.
export function AppDateFieldIcon() {
  const theme = useAppTheme();
  return (
    <AppIcon
      color={theme.colors.textSecondary}
      name="calendar"
      size={theme.iconSizes.sm}
    />
  );
}
