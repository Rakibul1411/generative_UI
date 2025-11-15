export interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | number | boolean | string[];
  validations?: FieldValidation[];
  hint?: string;
}

export type FieldValidationType =
  | 'required'
  | 'email'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern';

export interface FieldValidation {
  type: FieldValidationType;
  value?: number | string;
  message?: string;
}
