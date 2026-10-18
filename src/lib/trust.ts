export const BSC_ID = "0x38";
export const LWRLD = "0x3899ebf76c768c156df3073031a4518c5f947777";

const BSC = {
  chainId: BSC_ID,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org"],
  blockExplorerUrls: ["https://bscscan.com"],
};

export type TrustProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  providers?: TrustProvider[];
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  isRabby?: boolean;
  isTokenPocket?: boolean;
  isBinance?: boolean;
  isBraveWallet?: boolean;
  isPhantom?: boolean;
  isBitKeep?: boolean;
  isBitget?: boolean;
  isSafePal?: boolean;
  isImToken?: boolean;
  isRainbow?: boolean;
  isZerion?: boolean;
  isExodus?: boolean;
  isKraken?: boolean;
  isCoin98?: boolean;
  isKuCoinWallet?: boolean;
  isDeficonnectProvider?: boolean;
};

type WalletWindow = Window & {
  ethereum?: TrustProvider;
  trustwallet?: TrustProvider;
  okxwallet?: TrustProvider;
  coinbaseWalletExtension?: TrustProvider;
  BinanceChain?: TrustProvider;
  binancew3w?: { ethereum?: TrustProvider };
  bitkeep?: { ethereum?: TrustProvider };
  safepalProvider?: TrustProvider;
  bybitWallet?: TrustProvider;
  deficonnectProvider?: TrustProvider;
};

export const PHANTOM_NOTE =
  "Phantom can hold $LWRLD on BNB Smart Chain but can't connect to BNB Chain sites right now. Paste your Phantom BNB Chain address (starts with 0x) instead, or pick another wallet to connect.";

export type FoundWallet = { id: string; name: string; provider: TrustProvider };

const FLAGS: { name: string; test: (provider: TrustProvider) => boolean }[] = [
  { name: "Trust Wallet", test: (provider) => Boolean(provider.isTrust || provider.isTrustWallet) },
  { name: "Coinbase Wallet", test: (provider) => Boolean(provider.isCoinbaseWallet) },
  { name: "Binance Wallet", test: (provider) => Boolean(provider.isBinance) },
  { name: "OKX Wallet", test: (provider) => Boolean(provider.isOkxWallet || provider.isOKExWallet) },
  { name: "Bitget Wallet", test: (provider) => Boolean(provider.isBitKeep || provider.isBitget) },
  { name: "SafePal", test: (provider) => Boolean(provider.isSafePal) },
  { name: "imToken", test: (provider) => Boolean(provider.isImToken) },
  { name: "TokenPocket", test: (provider) => Boolean(provider.isTokenPocket) },
  { name: "Rainbow", test: (provider) => Boolean(provider.isRainbow) },
  { name: "Zerion", test: (provider) => Boolean(provider.isZerion) },
  { name: "Exodus", test: (provider) => Boolean(provider.isExodus) },
  { name: "Kraken Wallet", test: (provider) => Boolean(provider.isKraken) },
  { name: "Coin98", test: (provider) => Boolean(provider.isCoin98) },
  { name: "KuCoin Wallet", test: (provider) => Boolean(provider.isKuCoinWallet) },
  { name: "Crypto.com Onchain", test: (provider) => Boolean(provider.isDeficonnectProvider) },
  { name: "Rabby", test: (provider) => Boolean(provider.isRabby) },
  { name: "Brave Wallet", test: (provider) => Boolean(provider.isBraveWallet) },
  { name: "Phantom", test: (provider) => Boolean(provider.isPhantom) },
  { name: "MetaMask", test: (provider) => Boolean(provider.isMetaMask) },
];

function labelFor(provider: TrustProvider, announced?: string) {
  if (announced) return announced;
  return FLAGS.find((flag) => flag.test(provider))?.name ?? "Browser wallet";
}

function pushWallet(list: FoundWallet[], provider: TrustProvider | undefined, announced?: string) {
  if (!provider?.request || list.some((item) => item.provider === provider)) return;
  const name = labelFor(provider, announced);
  list.push({ id: `${name}-${list.length}`, name, provider });
}

function injectedWallets() {
  if (typeof window === "undefined") return [];
  const win = window as WalletWindow;
  const list: FoundWallet[] = [];
  pushWallet(list, win.trustwallet);
  pushWallet(list, win.okxwallet);
  pushWallet(list, win.coinbaseWalletExtension);
  pushWallet(list, win.binancew3w?.ethereum);
  pushWallet(list, win.BinanceChain);
  pushWallet(list, win.bitkeep?.ethereum);
  pushWallet(list, win.safepalProvider);
  pushWallet(list, win.bybitWallet, "Bybit Wallet");
  pushWallet(list, win.deficonnectProvider, "Crypto.com Onchain");
  for (const provider of win.ethereum?.providers ?? []) pushWallet(list, provider);
  pushWallet(list, win.ethereum);
  return list;
}

export function findWallets() {
  if (typeof window === "undefined") return Promise.resolve<FoundWallet[]>([]);
  return new Promise<FoundWallet[]>((resolve) => {
    const list = injectedWallets();
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<{ info?: { name?: string; rdns?: string }; provider?: TrustProvider }>).detail;
      pushWallet(list, detail?.provider, detail?.info?.name);
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(list);
    }, 400);
  });
}

export function trustDeepLink() {
  const here = typeof window === "undefined" ? "https://lathosworld.com" : window.location.href;
  return `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(here)}`;
}

export function metamaskDeepLink() {
  if (typeof window === "undefined") return "https://link.metamask.io/dapp/lathosworld.com";
  const here = new URL(window.location.href);
  return `https://link.metamask.io/dapp/${here.host}${here.pathname}${here.search}${here.hash}`;
}

export function coinbaseDeepLink() {
  const here = typeof window === "undefined" ? "https://lathosworld.com" : window.location.href;
  return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(here)}`;
}

export function phantomDeepLink() {
  const here = typeof window === "undefined" ? "https://lathosworld.com" : window.location.href;
  const ref = typeof window === "undefined" ? "https://lathosworld.com" : window.location.origin;
  return `https://phantom.com/ul/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(ref)}`;
}

function hereUrl() {
  return typeof window === "undefined" ? "https://lathosworld.com" : window.location.href;
}

export function binanceDeepLink() {
  const path = `/webview/webview?type=default&needLogin=false&url=${btoa(hereUrl())}`;
  return `https://app.binance.com/en/web3wallet?_dp=${btoa(path)}&ref=W3W`;
}

export function okxDeepLink() {
  const deep = `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(hereUrl())}`;
  return `https://web3.okx.com/download?deeplink=${encodeURIComponent(deep)}`;
}

export function bitgetDeepLink() {
  const query = new URLSearchParams({
    version: "1",
    dappName: "lathosworld",
    action: "DApp",
    actionID: "6f1c0a2e-7b34-4d11-9c2a-8e4b1a0c7777",
    url: hereUrl(),
  });
  return `https://bkcode.vip?${query.toString()}`;
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUnits(hex: string, places = 4) {
  const value = BigInt(hex);
  const whole = value / 10n ** 18n;
  const frac = (value % 10n ** 18n).toString().padStart(18, "0").slice(0, places).replace(/0+$/, "");
  return frac ? `${whole.toString()}.${frac}` : whole.toString();
}

export async function connectTrust(provider: TrustProvider) {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("The wallet did not share an address.");
  const chainId = await ensureBsc(provider);
  const balances = chainId === BSC_ID ? await readBalances(provider, address) : null;
  return { address, chainId, balances };
}

export async function ensureBsc(provider: TrustProvider) {
  const current = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (current === BSC_ID) return current;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_ID }] });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 4902) throw err;
    await provider.request({ method: "wallet_addEthereumChain", params: [BSC] });
  }
  return String(await provider.request({ method: "eth_chainId" })).toLowerCase();
}

export async function readBalances(provider: TrustProvider, address: string) {
  const bnb = String(await provider.request({ method: "eth_getBalance", params: [address, "latest"] }));
  const data = `0x70a08231${address.slice(2).padStart(64, "0")}`;
  const lwrld = String(await provider.request({
    method: "eth_call",
    params: [{ to: LWRLD, data }, "latest"],
  }));
  return { bnb: formatUnits(bnb), lwrld: formatUnits(lwrld) };
}

export type TrustWallet = { name: string; address: string; chainId: string; bnb: string; lwrld: string };

type TrustState = {
  ready: boolean;
  wallets: FoundWallet[];
  provider: TrustProvider | null;
  wallet: TrustWallet | null;
  busy: boolean;
  error: string;
};

let state: TrustState = { ready: false, wallets: [], provider: null, wallet: null, busy: false, error: "" };
const listeners = new Set<() => void>();
let boot: Promise<void> | null = null;
let stopListen: (() => void) | null = null;

function setState(patch: Partial<TrustState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function listen(provider: TrustProvider) {
  stopListen?.();
  if (!provider.on) {
    stopListen = null;
    return;
  }
  const onAccounts = (accounts: unknown) => {
    const next = Array.isArray(accounts) ? String(accounts[0] ?? "") : "";
    if (!state.wallet) return;
    if (!next) {
      setState({ wallet: null, provider: null });
      return;
    }
    setState({ wallet: { ...state.wallet, address: next } });
    readBalances(provider, next)
      .then((balances) => {
        if (state.wallet?.address === next) setState({ wallet: { ...state.wallet, ...balances } });
      })
      .catch(() => {});
  };
  const onChain = (chainId: unknown) => {
    if (!state.wallet) return;
    setState({ wallet: { ...state.wallet, chainId: String(chainId).toLowerCase() } });
  };
  provider.on("accountsChanged", onAccounts);
  provider.on("chainChanged", onChain);
  stopListen = () => {
    provider.removeListener?.("accountsChanged", onAccounts);
    provider.removeListener?.("chainChanged", onChain);
  };
}

export function getTrustState() {
  return state;
}

export function subscribeTrust(listener: () => void) {
  listeners.add(listener);
  if (!boot) {
    boot = findWallets().then((wallets) => setState({ ready: true, wallets }));
  }
  return () => listeners.delete(listener);
}

export async function connectWallet(id: string) {
  const found = state.wallets.find((item) => item.id === id);
  if (!found) return;
  if (found.name === "Phantom") {
    // Phantom holds BNB Smart Chain tokens but can't connect to BNB Chain sites yet.
    setState({ error: PHANTOM_NOTE });
    return;
  }
  setState({ busy: true, error: "" });
  try {
    const result = await connectTrust(found.provider);
    listen(found.provider);
    setState({
      busy: false,
      provider: found.provider,
      wallet: {
        name: found.name,
        address: result.address,
        chainId: result.chainId,
        bnb: result.balances?.bnb ?? "—",
        lwrld: result.balances?.lwrld ?? "—",
      },
      error: result.chainId === BSC_ID ? "" : "Switch the wallet to BNB Smart Chain.",
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    setState({
      busy: false,
      error: code === 4001 ? "The wallet closed the request." : "The wallet did not connect.",
    });
  }
}

export function openTrustApp() {
  if (typeof window !== "undefined") window.location.href = trustDeepLink();
}

export function openMetaMask() {
  if (typeof window !== "undefined") window.location.href = metamaskDeepLink();
}

export function openCoinbase() {
  if (typeof window !== "undefined") window.location.href = coinbaseDeepLink();
}

export function openPhantom() {
  if (typeof window !== "undefined") window.location.href = phantomDeepLink();
}

export function openBinance() {
  if (typeof window !== "undefined") window.location.href = binanceDeepLink();
}

export function openOkx() {
  if (typeof window !== "undefined") window.location.href = okxDeepLink();
}

export function openBitget() {
  if (typeof window !== "undefined") window.location.href = bitgetDeepLink();
}

export async function switchToBsc() {
  if (!state.provider || !state.wallet) return;
  setState({ busy: true, error: "" });
  try {
    const chainId = await ensureBsc(state.provider);
    const balances = await readBalances(state.provider, state.wallet.address);
    setState({ busy: false, wallet: { ...state.wallet, chainId, ...balances } });
  } catch {
    setState({ busy: false, error: "Could not switch to BNB Smart Chain." });
  }
}

export function clearTrust() {
  stopListen?.();
  stopListen = null;
  setState({ wallet: null, provider: null, error: "" });
}
