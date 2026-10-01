export type LogLevel = 'log' | 'warn' | 'error';

/** Dữ liệu host cấp cho mini app. `user` tuỳ app, tối thiểu có `id`. */
export type Session = {
  token: string;
  expiresAt: number;
  user: { id: string } & Record<string, unknown>;
};

/** Host tự quyết lấy session thế nào (token giả, hoặc gọi backend đổi token). */
export type GetSession = (miniAppId: string) => Session | Promise<Session>;

/** Nơi host nhận log của chính nó (`tag = 'host'`) và của mini app (`tag = 'mini:<id>'`). */
export type OnLog = (tag: string, level: LogLevel, ...args: unknown[]) => void;

/** Props mà mini app React Native nhận từ host. */
export type MiniAppProps = {
  session: Session;
  log: (level: LogLevel, ...args: unknown[]) => void;
};
