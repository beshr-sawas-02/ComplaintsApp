import { UserType } from "src/users/schemas/user.schema";


export interface JwtPayload {
  sub: string;
  rationalId: string;
  userType: UserType;
  fullName: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    rationalId: string;
    fullName: string;
    userType: UserType;
    phone: string;
    profileImage?: string | null;
  };
}