import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FieldTypeService {
  private readonly typeMap: { [key: string]: string } = {
    'text': 'Text Input',
    'email': 'Email Input',
    'password': 'Password Input',
    'number': 'Number Input',
    'tel': 'Phone Input',
    'url': 'URL Input',
    'textarea': 'Text Area',
    'select': 'Select Dropdown',
    'radio': 'Radio Button',
    'checkbox': 'Checkbox',
    'date': 'Date Picker',
    'time': 'Time Picker',
    'datetime-local': 'DateTime Picker',
    'file': 'File Upload',
    'range': 'Range Slider'
  };

  getFieldTypeDisplay(type: string): string {
    return this.typeMap[type] || type;
  }

  getAllFieldTypes(): { [key: string]: string } {
    return { ...this.typeMap };
  }
}
