export type TcpExistsEndpoint = [host: string, port: string | number]
export type TcpExistsResult = [
  host: string,
  port: string | number,
  result: boolean
]

/**
 * @deprecated will be removed in v2.0.0, use `tcpExistsMany` instead
 */
export default function tcpExistsChunk (
  endpoints: Iterable<TcpExistsEndpoint>,
  options?: {
    timeout?: number
    returnOnlyExisted?: boolean
    signal?: AbortSignal
  }
): Promise<TcpExistsResult[]>
