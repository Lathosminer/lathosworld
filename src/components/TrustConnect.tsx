import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import {
  BSC_ID,
  bitgetDeepLink,
  binanceDeepLink,
  clearTrust,
  coinbaseDeepLink,
  connectWallet,
  getTrustState,
  metamaskDeepLink,
  okxDeepLink,
  openBinance,
  openBitget,
  openCoinbase,
  openMetaMask,
  openOkx,
  openPhantom,
  openTrustApp,
  phantomDeepLink,
  shortAddress,
  subscribeTrust,
  switchToBsc,
  trustDeepLink,
} from "@/lib/trust";

const GUIDES = [
  {
    name: "Trust Wallet",
    how: "Scan the Trust Wallet code. The app opens this page. Press Connect and approve. Switch to BNB Smart Chain if it asks.",
    href: "https://trustwallet.com/blog/academy/how-to-use-dapps-with-trust-wallet-a-beginners-guide",
    help: "Trust Wallet dapp guide",
  },
  {
    name: "MetaMask",
    how: "Scan the MetaMask code. It opens this page inside the MetaMask app. Press Connect.",
    href: "https://support.metamask.io/more-web3/dapps/connecting-to-a-dapp",
    help: "MetaMask: connect to a dapp",
  },
  {
    name: "Coinbase Wallet",
    how: "Scan the Coinbase Wallet code. Approve the connection in the app, then switch to BNB Smart Chain if asked.",
    href: "https://help.coinbase.com/en/wallet/getting-started/coinbase-wallet-extension",
    help: "Coinbase Wallet extension help",
  },
  {
    name: "Binance Wallet",
    how: "Scan the Binance code. It opens this page in the Binance Web3 browser. Press Binance Wallet and approve. A keyless exchange login will not connect.",
    href: "https://www.binance.com/en/support/faq/detail/99532b46a51b454a9fd2e061a99619bd",
    help: "Binance Wallet extension",
  },
  {
    name: "OKX Wallet",
    how: "Scan the OKX code. The OKX app opens this page. Press OKX Wallet and approve.",
    href: "https://web3.okx.com/help/section/faq-web3-wallet",
    help: "OKX Wallet help",
  },
  {
    name: "Bitget Wallet",
    how: "Scan the Bitget code. The Bitget app opens this page. Press Bitget Wallet and approve.",
    href: "https://web3.bitget.com",
    help: "Bitget Wallet",
  },
  {
    name: "Bybit Wallet",
    how: "On a phone, open the Bybit app, switch to the Web3 wallet, and open this site in its browser. On a computer, install the Bybit Wallet extension, refresh, then press Bybit Wallet. An exchange login will not connect.",
    href: "https://www.bybit.com/en/help-center/article/How-to-Connect-Your-Bybit-Wallet-to-DApp",
    help: "Bybit: connect a wallet to a dapp",
  },
  {
    name: "KuCoin Wallet",
    how: "Open the KuCoin app and switch to Web3 Wallet. Open this site in its browser, press KuCoin Wallet, and approve. On a computer, use the KuCoin extension and refresh this page.",
    href: "https://www.kucoin.com/web3",
    help: "KuCoin Web3",
  },
  {
    name: "Crypto.com Onchain",
    how: "Use Crypto.com Onchain, the self-custody wallet, not the exchange account. Open this site in its browser or the Chrome extension, then press Crypto.com Onchain.",
    href: "https://help.crypto.com/en/articles/10124151-getting-started-with-crypto-com-onchain",
    help: "Crypto.com Onchain help",
  },
  {
    name: "Gate Web3",
    how: "Open the Gate app, tap Web3, then Discover. Open this site, press the wallet button, and approve. On a computer, use the Gate Web3 extension and refresh.",
    href: "https://www.gate.com/web3",
    help: "Gate Web3",
  },
  {
    name: "Phantom",
    how: "Scan the Phantom code. In Phantom’s browser, press Connect. Do not use the phone’s normal browser.",
    href: "https://help.phantom.com/articles/29995498642195",
    help: "Phantom: connect to an app",
  },
  {
    name: "TokenPocket",
    how: "Open TokenPocket, open Discover, go to this site, press TokenPocket, and approve.",
    href: "https://help.tokenpocket.pro/en/security-knowledge/security-measure/dapp",
    help: "TokenPocket dapp notes",
  },
  {
    name: "SafePal",
    how: "Open SafePal, go to DApp, open this site, press SafePal, and approve.",
    href: "https://safepalsupport.zendesk.com/hc/en-us/articles/18877484820379-How-to-connect-SafePal-wallet-to-a-third-party-DApp-in-the-DApp-Store",
    help: "SafePal: connect a dapp",
  },
  {
    name: "imToken",
    how: "Open imToken, tap Browser, enter this site, then press imToken and approve.",
    href: "https://support.token.im/hc/en-us/articles/360015520514-How-to-Use-the-DApp-Browser-in-imToken",
    help: "imToken dapp browser",
  },
  {
    name: "Brave Wallet",
    how: "Open this site in the Brave app. Turn Brave Wallet on, refresh, then press Brave Wallet.",
    href: "https://brave.com/wallet/",
    help: "Brave Wallet",
  },
  {
    name: "Uniswap Wallet",
    how: "On a computer, install the Uniswap extension, refresh this page, and press Uniswap Wallet. BNB Smart Chain is supported. The phone app is for Uniswap itself; if this site is not inside it, use Trust, MetaMask, Coinbase, or Binance.",
    href: "https://wallet.uniswap.org",
    help: "Uniswap Wallet",
  },
  {
    name: "Rainbow",
    how: "If the Rainbow extension is installed, refresh and press Rainbow. On a phone, Rainbow does not open this page from a camera code. Use Trust, MetaMask, Coinbase, or Phantom instead.",
    href: "https://rainbow.me/",
    help: "Rainbow",
  },
  {
    name: "Exodus",
    how: "Install the Exodus extension on a computer, refresh this page, then press Exodus. Approve the connection and switch to BNB Smart Chain.",
    href: "https://www.exodus.com/",
    help: "Exodus",
  },
  {
    name: "Kraken Wallet",
    how: "Open Kraken Wallet, not the exchange login. Use its browser or extension, open this site, press Kraken Wallet, and approve.",
    href: "https://www.kraken.com/wallet",
    help: "Kraken Wallet",
  },
  {
    name: "Coin98",
    how: "Open Coin98, go to its browser, enter this site, press Coin98, and approve on BNB Smart Chain.",
    href: "https://coin98.com/",
    help: "Coin98",
  },
  {
    name: "Rabby",
    how: "Rabby is a computer extension. On a phone, use Trust Wallet, MetaMask, Coinbase Wallet, or Phantom instead.",
    href: "https://support.rabby.io/en/",
    help: "Rabby help center",
  },
  {
    name: "Ledger",
    how: "Ledger is a hardware wallet. On a computer, connect the device through MetaMask or Rabby, then press that wallet here. Never type the recovery phrase into this site.",
    href: "https://www.ledger.com/",
    help: "Ledger",
  },
] as const;

const PHONE = [
  { name: "Trust Wallet", href: trustDeepLink, open: openTrustApp },
  { name: "MetaMask", href: metamaskDeepLink, open: openMetaMask },
  { name: "Coinbase Wallet", href: coinbaseDeepLink, open: openCoinbase },
  { name: "Binance Wallet", href: binanceDeepLink, open: openBinance },
  { name: "OKX Wallet", href: okxDeepLink, open: openOkx },
  { name: "Bitget Wallet", href: bitgetDeepLink, open: openBitget },
  { name: "Phantom", href: phantomDeepLink, open: openPhantom },
] as const;

function QrImg({ value, alt }: { value: string; alt: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let dead = false;
    QRCode.toDataURL(value, { margin: 1, width: 220, color: { dark: "#05080c", light: "#ffffff" } })
      .then((url) => { if (!dead) setSrc(url); })
      .catch(() => {});
    return () => { dead = true; };
  }, [value]);
  if (!src) return <div className="qr-slot" aria-hidden="true" />;
  return <img className="qr" src={src} width={220} height={220} alt={alt} />;
}

export function TrustConnect({ compact = false }: { compact?: boolean }) {
  const { ready, wallets, wallet, busy, error } = useSyncExternalStore(subscribeTrust, getTrustState, getTrustState);
  const [more, setMore] = useState(false);
  const primaryPhone = PHONE.filter((item) => item.name === "Trust Wallet" || item.name === "MetaMask");
  const morePhone = PHONE.filter((item) => item.name !== "Trust Wallet" && item.name !== "MetaMask");
  const primaryGuides = GUIDES.filter((guide) => guide.name === "Trust Wallet" || guide.name === "MetaMask");
  const moreGuides = GUIDES.filter((guide) => guide.name !== "Trust Wallet" && guide.name !== "MetaMask");

  if (compact) {
    if (wallet) return <a className="btn btn-ghost" href="#token">{shortAddress(wallet.address)}</a>;
    return <a className="btn btn-ghost" href="#token">Wallets</a>;
  }

  return (
    <div className="wallet">
      {wallet ? (
        <>
          <p className="note">{wallet.name} · {shortAddress(wallet.address)}</p>
          <dl className="wallet-balances">
            <div>
              <dt>BNB</dt>
              <dd>{wallet.chainId === BSC_ID ? wallet.bnb : "—"}</dd>
            </div>
            <div>
              <dt>$LWRLD</dt>
              <dd>{wallet.chainId === BSC_ID ? wallet.lwrld : "—"}</dd>
            </div>
          </dl>
          <div className="cta-row">
            {wallet.chainId !== BSC_ID ? (
              <button className="btn btn-cyan" type="button" onClick={switchToBsc} disabled={busy}>Use BNB Smart Chain</button>
            ) : null}
            <button className="btn btn-ghost" type="button" onClick={clearTrust}>Disconnect</button>
          </div>
        </>
      ) : (
        <div className="wallet-choices">
          {wallets.map((item) => (
            <button key={item.id} className="btn btn-ghost" type="button" onClick={() => connectWallet(item.id)} disabled={!ready || busy}>
              {item.name}
            </button>
          ))}
        </div>
      )}
      {error ? <p className="wallet-error">{error}</p> : null}
      <div className="wallet-help">
        <p className="note">On a computer, scan a code with the phone camera. It opens this page inside that wallet. Then press Connect and approve. Use BNB Smart Chain. On a phone, press the name under a code, or open this site in that app’s own browser. An exchange login is not a wallet. This site never asks for a seed phrase.</p>
        <div className="qr-grid">
          {primaryPhone.map((item) => (
            <div key={item.name} className="qr-card">
              <QrImg value={item.href()} alt={`QR code to open this page in ${item.name}`} />
              <button className={item.name === "Trust Wallet" ? "btn btn-cyan" : "btn btn-ghost"} type="button" onClick={item.open}>{item.name}</button>
            </div>
          ))}
        </div>
        <ul className="wallet-guides">
          {primaryGuides.map((guide) => (
            <li key={guide.name} className="wallet-guide">
              <strong>{guide.name}</strong>
              <p>{guide.how}</p>
              <a href={guide.href} target="_blank" rel="noopener noreferrer">{guide.help}</a>
            </li>
          ))}
        </ul>
        <div className="cta-row">
          <button className="btn btn-ghost" type="button" aria-expanded={more} onClick={() => setMore((open) => !open)}>
            {more ? "Fewer wallets" : "More wallets"}
          </button>
        </div>
        {more ? (
          <>
            <div className="qr-grid">
              {morePhone.map((item) => (
                <div key={item.name} className="qr-card">
                  <QrImg value={item.href()} alt={`QR code to open this page in ${item.name}`} />
                  <button className="btn btn-ghost" type="button" onClick={item.open}>{item.name}</button>
                </div>
              ))}
            </div>
            <ul className="wallet-guides">
              {moreGuides.map((guide) => (
                <li key={guide.name} className="wallet-guide">
                  <strong>{guide.name}</strong>
                  <p>{guide.how}</p>
                  <a href={guide.href} target="_blank" rel="noopener noreferrer">{guide.help}</a>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
