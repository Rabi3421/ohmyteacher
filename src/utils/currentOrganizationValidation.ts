import type { LiveOrganizationFormValue } from '../components/organization/LiveOrganizationFormFields';

export type CurrentOrganizationFormErrors = Partial<
  Record<keyof LiveOrganizationFormValue, string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCurrentOrganizationForm(
  value: LiveOrganizationFormValue,
): CurrentOrganizationFormErrors {
  const errors: CurrentOrganizationFormErrors = {};
  const name = value.name.trim();
  if (!name) errors.name = 'Name is required.';
  else if (name.length > 255) errors.name = 'Name is too long.';
  if (value.address.trim().length > 255) {
    errors.address = 'Address must be 255 characters or fewer.';
  }
  if (value.phone.trim().length > 15) {
    errors.phone = 'Phone must be 15 characters or fewer.';
  }
  const email = value.email.trim();
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if ((value.upiId ?? '').trim().length > 100) {
    errors.upiId = 'UPI ID must be 100 characters or fewer.';
  }
  return errors;
}
