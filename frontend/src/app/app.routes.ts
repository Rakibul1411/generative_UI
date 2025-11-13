import { Routes } from '@angular/router';
import { GenerativeUiComponent } from './generative-ui/generative-ui.component';

export const routes: Routes = [
  { path: '', component: GenerativeUiComponent },
  { path: '**', redirectTo: '' }
];
