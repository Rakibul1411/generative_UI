export interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  validation?: any;
}
