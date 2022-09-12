import { TcpExistsEndpoint, TcpExistsResult } from './chunk'

export default function tcpExistsMany(
  endpoints: string | TcpExistsEndpoint[],
  options?: {
    chunkSize?: number
    timeout?: number
    returnOnlyExisted?: boolean
    signal?: AbortSignal
  }
): AsyncIterable<TcpExistsResult[]>
