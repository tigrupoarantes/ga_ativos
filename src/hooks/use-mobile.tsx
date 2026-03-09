import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/** Detecta dispositivo móvel pelo User-Agent (Android / iPhone / iPad / iPod).
 *  Diferente do `useIsMobile`, não depende da largura da janela — janela estreita
 *  no desktop não é considerada mobile. Pode ser chamado fora de componentes React. */
export function isMobileDevice(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
