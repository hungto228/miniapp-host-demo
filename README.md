# @tinasoft/miniapp-host-demo

Open mini apps inside your React Native app, super-app style.

- **Web mini apps** in a WebView, with a token bridge that only answers the mini app's own origin, navigation locked to that origin, and the mini app's `console` / JS errors forwarded to the host.
- **React Native mini apps** loaded at runtime with [Re.Pack](https://re-pack.dev) Module Federation, receiving the session as props, with render errors contained.

Tokens are never put in URLs or pre-injected into pages, and the library masks them (`***`) in every log line it emits. Anything a mini app itself logs is forwarded as is.

## Install

```sh
npm install @tinasoft/miniapp-host-demo react-native-webview react-native-safe-area-context
cd ios && pod install
```

Wrap your app in `SafeAreaProvider` from `react-native-safe-area-context`.

## Web mini app

```tsx
import { MiniAppWebView } from '@tinasoft/miniapp-host-demo';

<MiniAppWebView
  app={{
    id: 'profile',
    name: 'Profile',
    url: 'https://profile.example.com/',
    origin: 'https://profile.example.com',
  }}
  getSession={async appId => ({ token, expiresAt, user })}
  onLog={(tag, level, ...args) => console[level](`[${tag}]`, ...args)}
  onClose={() => setOpen(null)}
/>
```

Inside the web page:

```js
const { token, user } = await window.host.getSession();
console.log('hello host'); // shows up in the host as [mini:profile] hello host
```

## React Native mini app (Re.Pack)

The host must be built with Re.Pack and declare the remote in `rspack.config.mjs`
(`new Repack.plugins.ModuleFederationPluginV2({ remotes: { wallet: 'wallet@https://cdn.example.com/wallet/ios/mf-manifest.json' } })`).

```tsx
import { RnMiniAppHost } from '@tinasoft/miniapp-host-demo';

const loadWallet = () => import('wallet/App'); // keep it outside the component

<RnMiniAppHost
  app={{ id: 'wallet', name: 'Wallet' }}
  load={loadWallet}
  getSession={getSession}
  onClose={() => setOpen(null)}
/>
```

The mini app exposes `./App`, a component that receives `MiniAppProps`:

```tsx
import type { MiniAppProps } from '@tinasoft/miniapp-host-demo';

export default function App({ session, log }: MiniAppProps) {
  log('log', 'opened by', session.user.id);
  return null;
}
```

## API

| Export | What it is |
| --- | --- |
| `MiniAppWebView` | Screen that hosts a web mini app (`app`, `getSession`, `onLog?`, `onClose?`, `closeLabel?`) |
| `RnMiniAppHost` | Screen that hosts a Re.Pack mini app (`app`, `load`, `getSession`, `onLog?`, `onClose?`, `closeLabel?`) |
| `isAllowedUrl(app, url)` | Origin check used for messages and navigation |
| `redact(value)` | `JSON.stringify` with every `token` field masked |
| `consoleLog` | Default `onLog`: console with `[tag]` prefix and masking |
| `BRIDGE_SCRIPT` | The script injected into web mini apps |

## License

MIT
