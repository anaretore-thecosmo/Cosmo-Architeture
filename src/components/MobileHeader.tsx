export function MobileHeader() {
  return (
    <header
      id="mobile-header"
      className="flex min-[900px]:hidden items-center justify-between h-12 px-4 border-b border-[#E3DCCF] bg-[#FBF9F4] sticky top-0 z-20 pt-safe"
    >
      <div className="flex items-center gap-2">
        <div
          id="mobile-brand-symbol"
          className="w-6.5 h-6.5 rounded-[7px] bg-[#173D3A] text-[#FBF9F4] flex items-center justify-center font-serif text-sm font-semibold leading-none shadow-xs"
          aria-hidden="true"
        >
          C
        </div>
        <span
          id="mobile-brand-title"
          className="text-[13px] font-bold tracking-[0.08em] text-[#272C2B] uppercase font-sans"
        >
          COSMO
        </span>
      </div>

      <div
        id="mobile-status-salvo"
        className="flex items-center gap-1.5 text-[10px] font-mono text-[#68706A] px-2 py-0.5 rounded-[4px] bg-[#E3DCCF]/40"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#173D3A]" aria-hidden="true" />
        <span>Salvo localmente</span>
      </div>
    </header>
  );
}
