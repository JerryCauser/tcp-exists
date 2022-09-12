export type TcpExistsEndpoint = [host: string, port: string | number]
export type TcpExistsResult = [
  host: string,
  port: string | number,
  result: boolean
]

export default function tcpExistsChunk(
  endpoints: TcpExistsEndpoint[],
  options?: {
    timeout?: number
    returnOnlyExisted?: boolean
    signal?: AbortSignal
  }
): Promise<TcpExistsResult[]>
