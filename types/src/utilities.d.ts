import { TcpExistsEndpoint } from './chunk.js'

export function getEndpoints (
  argument: string | string[],
  defaultPorts?: string
): Generator<TcpExistsEndpoint>

export function green (string: string): string
export function red (string: string): string

export const DEFAULT_DELIMITER: string
export const DEFAULT_CHUNK_SIZE: number
export const DEFAULT_TIMEOUT: number
export const DEFAULT_PORTS: string
