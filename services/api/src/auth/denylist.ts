const deniedTokens = new Set<string>()

export function denyToken(token: string): void {
  deniedTokens.add(token)
}

export function isTokenDenied(token: string): boolean {
  return deniedTokens.has(token)
}
