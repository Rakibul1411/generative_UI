import { FormField } from './form-field.model';

export interface SubmitButton {
  text: string;
  style?: 'primary' | 'secondary' | 'success';
}

export interface FormSchema {
  formType?: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitButton?: SubmitButton;
}
