import { FormField } from './form-field.model';

export interface FormSchema {
  title: string;
  description: string;
  fields: FormField[];
}
