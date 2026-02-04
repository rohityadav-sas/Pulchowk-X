/**
 * Centralized API Error Handler
 * Provides consistent error handling across all API calls
 */

export class ApiError extends Error {
    constructor(
        public message: string,
        public status?: number,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

/**
 * Wrapper for fetch that provides consistent error handling
 */
export async function apiFetch<T>(
    url: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const defaultOptions: RequestInit = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (options.body instanceof FormData) {
        delete (defaultOptions.headers as Record<string, string>)['Content-Type'];
    }

    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        // Clone response for error debugging
        const responseClone = response.clone();
        
        // Try to parse JSON
        let data: any;
        try {
            data = await response.json();
        } catch (parseError) {
            const text = await responseClone.text();
            console.error('Failed to parse response:', text);
            return {
                success: false,
                message: 'Invalid server response',
            };
        }

        // Handle HTTP errors
        if (!response.ok) {
            return {
                success: false,
                message: data?.message || data?.error || `Request failed with status ${response.status}`,
            };
        }

        // Return the data as-is if it has success field, otherwise wrap it
        if (typeof data === 'object' && 'success' in data) {
            return data;
        }

        return {
            success: true,
            data,
        };
    } catch (error) {
        // Handle network errors
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            return {
                success: false,
                message: 'Network error. Please check your connection.',
            };
        }

        // Handle other errors
        return {
            success: false,
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}

/**
 * GET request helper
 */
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body),
    });
}

/**
 * PUT request helper
 */
export async function apiPut<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, {
        method: 'PUT',
        body: body instanceof FormData ? body : JSON.stringify(body),
    });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
    return apiFetch<T>(url, { method: 'DELETE' });
}

/**
 * Upload file helper
 */
export async function apiUpload<T>(url: string, file: File, fieldName: string = 'file'): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return apiFetch<T>(url, {
        method: 'POST',
        body: formData,
    });
}
