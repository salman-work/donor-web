// Utility to extract cookie values from a Set-Cookie string
export function parseCookie(
  cookieString: string | null | undefined,
  name: string,
): string | undefined {
  if (!cookieString) return undefined
  const match = cookieString.match(new RegExp(`${name}=([^;]+)`))
  return match ? match[1] : undefined
}
