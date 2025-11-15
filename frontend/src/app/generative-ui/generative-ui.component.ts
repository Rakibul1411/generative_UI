import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ValidatorFn } from '@angular/forms';
import { GenerativeUiService, FieldTypeService } from '../services';
import { FormSchema, ApiResponse, FormField } from '../models';

@Component({
  selector: 'app-generative-ui',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './generative-ui.component.html',
  styleUrl: './generative-ui.component.css'
})
export class GenerativeUiComponent {
  private generativeUiService = inject(GenerativeUiService);
  private fieldTypeService = inject(FieldTypeService);
  private fb = inject(FormBuilder);

  prompt: string = '';
  isLoading: boolean = false;
  generatedSchema: FormSchema | null = null;
  error: string | null = null;
  apiResponse: ApiResponse | null = null;
  dynamicForm: FormGroup | null = null;
  submittedValues: Record<string, unknown> | null = null;

  generateForm() {
    if (!this.prompt.trim()) {
      this.error = 'Please enter a prompt';
      return;
    }

    if (this.prompt.trim().length < 5) {
      this.error = 'Prompt is too short. Please provide a more detailed description.';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.generatedSchema = null;
    this.apiResponse = null;
    this.dynamicForm = null;
    this.submittedValues = null;

    this.generativeUiService.generateForm(this.prompt).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.apiResponse = response;
        if (response.success && response.data) {
          this.generatedSchema = response.data;
          this.buildDynamicForm(response.data);
        } else {
          this.error = response.error || 'Failed to generate form';
        }
      },
      error: (error: Error) => {
        this.isLoading = false;
        this.error = error.message;
      }
    });
  }

  clearResults() {
    this.generatedSchema = null;
    this.error = null;
    this.apiResponse = null;
    this.prompt = '';
    this.dynamicForm = null;
    this.submittedValues = null;
  }

  resetDynamicForm() {
    this.dynamicForm?.reset();
    this.submittedValues = null;
  }

  getFieldTypeDisplay(type: string): string {
    return this.fieldTypeService.getFieldTypeDisplay(type);
  }

  get submitButtonText(): string {
    return this.generatedSchema?.submitButton?.text || 'Submit';
  }

  onSubmitDynamicForm() {
    if (!this.dynamicForm) {
      return;
    }

    if (this.dynamicForm.invalid) {
      this.dynamicForm.markAllAsTouched();
      return;
    }

    const normalizedValues = this.normalizeFormValues(this.dynamicForm.getRawValue());
    this.submittedValues = normalizedValues;
  }

  trackByFieldName(index: number, field: FormField): string {
    return field.name;
  }

  hasFieldError(fieldName: string): boolean {
    const control = this.getFormControl(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(fieldName: string): string | null {
    const field = this.findField(fieldName);
    const control = this.getFormControl(fieldName);

    if (!field || !control || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return this.getValidationMessage(field, 'required', `${field.label} is required`);
    }

    if (control.errors['email']) {
      return this.getValidationMessage(field, 'email', 'Please enter a valid email address');
    }

    if (control.errors['minlength']) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return this.getValidationMessage(field, 'minLength', `${field.label} must be at least ${requiredLength} characters`);
    }

    if (control.errors['maxlength']) {
      const requiredLength = control.errors['maxlength'].requiredLength;
      return this.getValidationMessage(field, 'maxLength', `${field.label} must be less than ${requiredLength} characters`);
    }

    if (control.errors['min']) {
      const min = control.errors['min'].min;
      return this.getValidationMessage(field, 'min', `${field.label} must be greater than or equal to ${min}`);
    }

    if (control.errors['max']) {
      const max = control.errors['max'].max;
      return this.getValidationMessage(field, 'max', `${field.label} must be less than or equal to ${max}`);
    }

    if (control.errors['pattern']) {
      return this.getValidationMessage(field, 'pattern', `${field.label} is invalid`);
    }

    if (control.errors['minSelected']) {
      return this.getValidationMessage(field, 'required', `Please select at least one ${field.label.toLowerCase()}`);
    }

    return 'Invalid value';
  }

  getCheckboxArray(fieldName: string): FormArray | null {
    const control = this.dynamicForm?.get(fieldName);
    return control instanceof FormArray ? control : null;
  }

  getCheckboxOptions(fieldName: string): string[] {
    return this.findField(fieldName)?.options || [];
  }

  onCheckboxGroupChange(fieldName: string) {
    const control = this.dynamicForm?.get(fieldName);
    control?.markAsTouched();
  }

  private buildDynamicForm(schema: FormSchema) {
    const controls: Record<string, AbstractControl> = {};

    schema.fields.forEach((field) => {
      if (field.type === 'checkbox' && field.options?.length) {
        const defaults = Array.isArray(field.defaultValue) ? field.defaultValue : [];
        const checkboxes = field.options.map((option) => defaults.includes(option));
        const arrayControl = this.fb.array(checkboxes.map((value) => this.fb.control(value)));

        if (field.required) {
          arrayControl.addValidators(this.minSelectedCheckboxesValidator(1));
        }

        controls[field.name] = arrayControl;
        return;
      }

      const defaultValue = this.getDefaultValue(field);
      controls[field.name] = this.fb.control(defaultValue, this.buildValidators(field));
    });

    this.dynamicForm = this.fb.group(controls);
  }

  private getDefaultValue(field: FormField): any {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      if (field.type === 'number') {
        const numeric = Number(field.defaultValue);
        return Number.isNaN(numeric) ? '' : numeric;
      }
      return field.defaultValue;
    }

    if (field.type === 'number') {
      return '';
    }

    if (field.type === 'select' || field.type === 'radio') {
      return '';
    }

    return '';
  }

  private buildValidators(field: FormField): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (field.required) {
      validators.push(Validators.required);
    }

    field.validations?.forEach((rule) => {
      switch (rule.type) {
        case 'email':
          validators.push(Validators.email);
          break;
        case 'minLength':
          if (rule.value !== undefined) {
            validators.push(Validators.minLength(Number(rule.value)));
          }
          break;
        case 'maxLength':
          if (rule.value !== undefined) {
            validators.push(Validators.maxLength(Number(rule.value)));
          }
          break;
        case 'min':
          if (rule.value !== undefined) {
            validators.push(Validators.min(Number(rule.value)));
          }
          break;
        case 'max':
          if (rule.value !== undefined) {
            validators.push(Validators.max(Number(rule.value)));
          }
          break;
        case 'pattern':
          if (rule.value) {
            validators.push(Validators.pattern(String(rule.value)));
          }
          break;
        default:
          break;
      }
    });

    return validators;
  }

  private minSelectedCheckboxesValidator(min: number): ValidatorFn {
    return (formArray: AbstractControl) => {
      if (!(formArray instanceof FormArray)) {
        return null;
      }

      const selectedCount = formArray.controls
        .map((control) => control.value)
        .filter((value) => value).length;

      return selectedCount >= min ? null : { minSelected: { required: min, actual: selectedCount } };
    };
  }

  private normalizeFormValues(values: Record<string, any>): Record<string, any> {
    if (!this.generatedSchema) {
      return values;
    }

    const normalized: Record<string, any> = { ...values };

    this.generatedSchema.fields.forEach((field) => {
      if (field.type === 'checkbox' && field.options?.length) {
        const selections = values[field.name] as boolean[];
        normalized[field.name] = field.options.filter((_, idx) => selections?.[idx]);
      }

      if (field.type === 'number') {
        const numericValue = values[field.name];
        normalized[field.name] = numericValue === '' || numericValue === null ? null : Number(numericValue);
      }
    });

    return normalized;
  }

  private getFormControl(fieldName: string): AbstractControl | null {
    return this.dynamicForm?.get(fieldName) || null;
  }

  private findField(fieldName: string): FormField | undefined {
    return this.generatedSchema?.fields.find((field) => field.name === fieldName);
  }

  private getValidationMessage(field: FormField, type: string, fallback: string): string {
    const customMessage = field.validations?.find((validation) => validation.type === type)?.message;
    return customMessage || fallback;
  }
}
