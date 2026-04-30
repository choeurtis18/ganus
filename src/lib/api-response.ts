import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  requestId: string;
  costData?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    model: string;
  };
}

export function generateRequestId(): string {
  return Math.random().toString(36).substring(7);
}

export function successResponse<T>(
  data: T,
  requestId: string,
  costData?: ApiResponse['costData'],
  status = 200
) {
  return NextResponse.json(
    {
      data,
      requestId,
      costData,
    } as ApiResponse<T>,
    { status }
  );
}

export function errorResponse(
  error: string,
  requestId: string,
  status = 400,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    {
      error,
      requestId,
    } as ApiResponse,
    { status, headers }
  );
}
