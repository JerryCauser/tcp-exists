export default function tcpExistsOne(
  host: string,
  port: number | string,
  timeout?: number,
  signal?: AbortSignal
): Promise<boolean>
