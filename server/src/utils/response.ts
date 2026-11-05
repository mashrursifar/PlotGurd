export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface FailureResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

export function successResponse<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

export function failureResponse(
  code: string,
  message: string,
  details: unknown[] = [],
): FailureResponse {
  return {
    success: false,
    error: { code, message, details },
  };
}
