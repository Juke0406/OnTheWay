import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Signs a cookie value using JWT
 */
export async function signCookie(
  value: string,
  secret: string
): Promise<string> {
  const token = await new SignJWT({ value })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));
  
  return token;
}

/**
 * Verifies a signed cookie value
 */
export async function verifyCookie(
  signedValue: string,
  secret: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(
      signedValue,
      new TextEncoder().encode(secret)
    );
    
    return payload.value as string;
  } catch (error) {
    console.error("Error verifying cookie:", error);
    return null;
  }
}

/**
 * Sets a signed cookie in the response
 */
export async function setSignedCookie(
  name: string,
  value: string,
  secret: string,
  attributes: Partial<ResponseCookie> = {}
): Promise<void> {
  const signedValue = await signCookie(value, secret);
  cookies().set(name, signedValue, attributes);
}
