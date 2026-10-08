import { TcpExistsEndpoint } from './chunk.js'

/**
 * Throws `RangeError` with code `ERR_INVALID_ENDPOINT` on invalid port or endpoint
 */
export function getEndpoints (
  argument: string | Iterable<string>,
  defaultPorts?: string
): Generator<TcpExistsEndpoint>

export function green (string: string): string
export function red (string: string): string

export const DEFAULT_DELIMITER: string
export const MIN_PORT: number
export const MAX_PORT: number
export const DEFAULT_CHUNK_SIZE: number
export const DEFAULT_TIMEOUT: number
export const DEFAULT_PORTS: string
