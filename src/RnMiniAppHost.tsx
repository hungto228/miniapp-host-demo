import {
  Component,
  ComponentType,
  lazy,
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from './Header';
import { consoleLog, redact } from './log';
import type { GetSession, LogLevel, MiniAppProps, OnLog, Session } from './types';

export type RnMiniApp = { id: string; name: string };

export type RnMiniAppHostProps = {
  app: RnMiniApp;
  /**
   * Tải module mini app, vd `() => import('wallet/App')` với remote khai báo
   * trong rspack.config của host. Truyền hàm cố định (khai báo ngoài component).
   */
  load: () => Promise<{ default: ComponentType<MiniAppProps> }>;
  getSession: GetSession;
  onLog?: OnLog;
  onClose?: () => void;
  closeLabel?: string;
};

// Mini app chạy chung runtime với host: lỗi render của nó phải bị chặn ở đây,
// nếu không sẽ làm sập cả app cha.
class Boundary extends Component<
  { tag: string; onLog: OnLog; children: ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    this.props.onLog(this.props.tag, 'error', error.message);
  }
  render() {
    return this.state.error ? (
      <Text style={styles.error}>
        Không tải được mini app: {this.state.error.message}
      </Text>
    ) : (
      this.props.children
    );
  }
}

export function RnMiniAppHost({
  app,
  load,
  getSession,
  onLog = consoleLog,
  onClose,
  closeLabel = 'Đóng',
}: RnMiniAppHostProps) {
  const insets = useSafeAreaInsets();
  const tag = `mini:${app.id}`;
  // Bundle chỉ được tải khi mini app được mở lần đầu.
  const Remote = useMemo(() => lazy(load), [load]);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.resolve(getSession(app.id)).then(
      s => {
        if (!alive) return;
        onLog('host', 'log', `gửi session cho ${app.id}:`, redact(s));
        setSession(s);
      },
      err => onLog('host', 'error', `không lấy được session cho ${app.id}:`, String(err)),
    );
    return () => {
      alive = false;
    };
  }, [app.id, getSession, onLog]);

  const miniLog = useCallback(
    (level: LogLevel, ...args: unknown[]) => onLog(tag, level, ...args),
    [tag, onLog],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title={app.name} onClose={onClose} closeLabel={closeLabel} />
      <Boundary tag={tag} onLog={onLog}>
        <Suspense fallback={<ActivityIndicator style={styles.loading} />}>
          {session ? (
            <Remote session={session} log={miniLog} />
          ) : (
            <ActivityIndicator style={styles.loading} />
          )}
        </Suspense>
      </Boundary>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { marginTop: 40 },
  error: { margin: 16, color: '#dc2626' },
});
