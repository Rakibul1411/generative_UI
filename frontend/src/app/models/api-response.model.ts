import { FormSchema } from './form-schema.model';

export interface ApiResponse {
  success: boolean;
  data?: FormSchema;
  error?: string;
  details?: string;
  meta?: {
    fieldsCount: number;
    generatedAt: string;
  };
}
