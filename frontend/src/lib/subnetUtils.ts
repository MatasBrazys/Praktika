// src/lib/subnetUtils.ts
// Pure functions for IP address and CIDR subnet calculations.
// Zero dependencies — can be ported to any language.

/**
 * Converts an IPv4 address string to a 32-bit number.
 * Returns null if the input is not a valid IPv4 address.
 */
export function ipToNumber(ip: string): number | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null

  let result = 0
  for (const part of parts) {
    const num = Number(part)
    if (!Number.isInteger(num) || num < 0 || num > 255) return null
    result = (result << 8) + num
  }
  // Convert to unsigned 32-bit
  return result >>> 0
}

/**
 * Parses a CIDR notation string (e.g. "10.0.0.0/24") into network address and prefix length.
 * Returns null if the input is not valid CIDR.
 */
export function parseCIDR(cidr: string): { network: number; prefix: number } | null {
  const parts = cidr.trim().split('/')
  if (parts.length !== 2) return null

  const network = ipToNumber(parts[0])
  if (network === null) return null

  const prefix = Number(parts[1])
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null

  return { network, prefix }
}

/**
 * Checks if an IPv4 address falls within a CIDR subnet range.
 *
 * Example:
 *   subnetContains("10.0.0.0/24", "10.0.0.1")   → true
 *   subnetContains("10.0.0.0/24", "192.168.1.1") → false
 */
export function subnetContains(cidr: string, ip: string): boolean {
  const parsed = parseCIDR(cidr)
  if (!parsed) return false

  const ipNum = ipToNumber(ip)
  if (ipNum === null) return false

  // Create subnet mask from prefix length
  // e.g. prefix=24 → mask=0xFFFFFF00
  const mask = parsed.prefix === 0 ? 0 : (~0 << (32 - parsed.prefix)) >>> 0

  // IP is in subnet if (ip & mask) === (network & mask)
  return (ipNum & mask) === (parsed.network & mask)
}