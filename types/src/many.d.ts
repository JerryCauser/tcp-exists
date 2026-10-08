import { TcpExistsEndpoint, TcpExistsResult } from './chunk.js'

export default function tcpExistsMany (
  endpoints: string | TcpExistsEndpoint[],
  options?: {
    chunkSize?: number
    timeout?: number
    returnOnlyExisted?: boolean
    signal?: AbortSignal
  }
): AsyncIterable<TcpExistsResult[]>
