import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse } from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GenerativeUiService {
  private http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  generateForm(prompt: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiBaseUrl}/generate-form`, {
      prompt: prompt
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else {
        errorMessage = 'Failed to connect to the server. Please make sure the backend is running.';
      }
    }

    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
