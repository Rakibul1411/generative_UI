import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerativeUiService, FieldTypeService } from '../services';
import { FormSchema, ApiResponse } from '../models';

@Component({
  selector: 'app-generative-ui',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generative-ui.component.html',
  styleUrl: './generative-ui.component.css'
})
export class GenerativeUiComponent {
  private generativeUiService = inject(GenerativeUiService);
  private fieldTypeService = inject(FieldTypeService);

  prompt: string = '';
  isLoading: boolean = false;
  generatedSchema: FormSchema | null = null;
  error: string | null = null;
  apiResponse: ApiResponse | null = null;

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

    this.generativeUiService.generateForm(this.prompt).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.apiResponse = response;
        if (response.success && response.data) {
          this.generatedSchema = response.data;
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
  }

  getFieldTypeDisplay(type: string): string {
    return this.fieldTypeService.getFieldTypeDisplay(type);
  }
}
