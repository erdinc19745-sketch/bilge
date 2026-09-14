import { Component, type ReactNode } from "react";

/**
 * Beklenmeyen bir hata tüm ekranı beyaza çevirmesin (gece 3'te "uygulama bozuldu" hissi vermesin):
 * kısa mesaj + Yenile. Hata metni katlanır alanda; kullanıcı ekran görüntüsünü gönderir.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { try { localStorage.setItem("bilge.lastError", `${new Date().toISOString()} ${err.message}`); } catch { /* */ } }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-2xl font-bold">Bir şey ters gitti</div>
        <p className="text-sm muted">Kayıtların güvende (telefonda ve bulutta). Yenileyince devam eder.</p>
        <button className="btn btn-accent w-full" style={{ minHeight: 52 }} onClick={() => location.reload()}>Yenile</button>
        <details className="text-xs muted w-full text-left"><summary>hata ayrıntısı</summary><pre className="whitespace-pre-wrap break-words mt-1">{String(this.state.err.stack ?? this.state.err.message)}</pre></details>
      </div>
    );
  }
}
