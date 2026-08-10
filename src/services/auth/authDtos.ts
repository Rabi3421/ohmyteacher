export interface SendOtpRequestDto {
  phone_number: string;
}

export interface SendOtpResponseDto {
  success: true;
  message: string;
  expires_in_minutes: number;
}

export type ResendOtpRequestDto = SendOtpRequestDto;
export type ResendOtpResponseDto = SendOtpResponseDto;

export interface VerifyOtpRequestDto {
  phone_number: string;
  otp: string;
}

export interface BackendAuthUserDto {
  id: number;
  phone_number: string;
  name: string;
  role: string;
  school: number | null;
  branch: number | null;
  is_active: boolean;
  date_joined: string;
}

export interface VerifyOtpResponseDto {
  success: true;
  is_new_user: boolean;
  message: string;
  user: BackendAuthUserDto;
  access: string;
  refresh: string;
}

export interface RefreshTokenRequestDto {
  refresh: string;
}

export interface RefreshTokenResponseDto {
  success: true;
  access: string;
  refresh?: string | null;
}

export interface CurrentUserResponseDto {
  success: true;
  user: BackendAuthUserDto;
}

export interface UpdateProfileRequestDto {
  name: string;
}

export type UpdateProfileResponseDto = CurrentUserResponseDto;

export interface BackendSchoolDto {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  upi_id: string;
  is_active: boolean;
  created_at: string;
}

export interface CurrentSchoolResponseDto {
  success: true;
  school: BackendSchoolDto;
}

export interface UpdateSchoolRequestDto {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  upi_id?: string;
}

export type UpdateSchoolResponseDto = CurrentSchoolResponseDto;

export interface LogoutRequestDto {
  refresh: string;
}

export interface LogoutResponseDto {
  success: true;
  message: string;
}
