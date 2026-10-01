import { memo, useCallback, useMemo, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { BRIDGE_SCRIPT } from './bridge';
import { Header } from './Header';
import { consoleLog, redact } from './log';
import type { GetSession, OnLog } from './types';

export type WebMiniApp = {
  id: string;
  name: string;
  url: string;
  /** Chỉ origin này được nhận session và được điều hướng tới, vd 'https://wallet.example.com'. */
  origin: string;
};

// Thêm '/' để 'https://a.com.evil.com' không lọt qua startsWith.
export const isAllowedUrl = (app: Pick<WebMiniApp, 'origin'>, url: string) =>
  url.startsWith(app.origin + '/');

export type MiniAppWebViewProps = {
  app: WebMiniApp;
  getSession: GetSession;
  onLog?: OnLog;
  onClose?: () => void;
  closeLabel?: string;
};

// memo + props ổn định: WebView không bị render lại/tải lại khi host re-render.
export const MiniAppWebView = memo(function Screen({
  app,
  getSession,
  onLog = consoleLog,
  onClose,
  closeLabel = 'Đóng',
}: MiniAppWebViewProps) {
  const insets = useSafeAreaInsets();
  // WebView<{}>: kiểu mặc định của react-native-webview 14 thành never với TS 6.
  const ref = useRef<WebView<{}>>(null);
  const tag = `mini:${app.id}`;
  const source = useMemo(() => ({ uri: app.url }), [app.url]);
  const whitelist = useMemo(() => [app.origin], [app.origin]);

  const onMessage = useCallback(
    async (e: WebViewMessageEvent) => {
      // Chỉ tin message từ đúng origin của mini app.
      if (!isAllowedUrl(app, e.nativeEvent.url)) {
        onLog('host', 'warn', 'bỏ qua message từ origin lạ:', e.nativeEvent.url);
        return;
      }
      let msg: any;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg?.type === 'log' && Array.isArray(msg.items)) {
        msg.items.forEach((i: any) =>
          onLog(
            tag,
            i.level === 'warn' || i.level === 'error' ? i.level : 'log',
            String(i.msg),
          ),
        );
      } else if (msg?.type === 'getSession') {
        try {
          const session = await getSession(app.id);
          onLog('host', 'log', `gửi session cho ${app.id}:`, redact(session));
          ref.current?.injectJavaScript(
            `window.host && window.host._deliver(${JSON.stringify(session)}); true;`,
          );
        } catch (err) {
          onLog('host', 'error', `không lấy được session cho ${app.id}:`, String(err));
        }
      }
    },
    [app, tag, getSession, onLog],
  );

  // Chặn điều hướng ra ngoài origin; link lạ mở bằng trình duyệt hệ thống.
  const onShouldStart = useCallback(
    (req: { url: string }) => {
      if (isAllowedUrl(app, req.url)) {
        return true;
      }
      onLog('host', 'warn', 'chặn điều hướng:', req.url);
      if (/^https?:/.test(req.url)) {
        Linking.openURL(req.url);
      }
      return false;
    },
    [app, onLog],
  );

  // Dùng lâu, thiếu RAM thì OS kill tiến trình web (màn trắng) → tải lại.
  const reload = useCallback(() => {
    onLog('host', 'warn', `tiến trình web của ${app.id} bị kill, tải lại`);
    ref.current?.reload();
  }, [app.id, onLog]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title={app.name} onClose={onClose} closeLabel={closeLabel} />
      <WebView<{}>
        ref={ref}
        source={source}
        originWhitelist={whitelist}
        injectedJavaScriptBeforeContentLoaded={BRIDGE_SCRIPT}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStart}
        onContentProcessDidTerminate={reload}
        onRenderProcessGone={reload}
        onLoadStart={() => onLog('host', 'log', `mở ${app.id}: ${app.url}`)}
        onError={e =>
          onLog('host', 'error', 'WebView lỗi:', e.nativeEvent.description)
        }
        webviewDebuggingEnabled={__DEV__}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
