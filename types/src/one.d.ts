export default tcpExistsOne

declare function tcpExistsOne(
  host: string,
  port: number | string,
  timeout?: number,
  signal?: AbortSignal
): Promise<boolean>
