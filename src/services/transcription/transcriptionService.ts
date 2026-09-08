/**
 * COSMO ARCHITECTURE - Serviço de Transcrição
 * Abstração pura e extensível para reconhecimento de voz pt-BR no navegador
 * com suporte a futura substituição por serviços de IA / backend.
 */

// Declaração de tipos para Web Speech API em navegadores com suporte
interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface TranscriptionCallbacks {
  onInterim?: (interimTranscript: string) => void;
  onFinal?: (finalTranscript: string) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

export class BrowserSpeechTranscriptionService {
  private recognition: SpeechRecognitionLike | null = null;
  private isListening = false;
  private fullTranscript = '';

  /**
   * Verifica se a API de reconhecimento de voz está disponível no ambiente atual.
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  /**
   * Inicia o reconhecimento de voz contínuo em português (pt-BR).
   */
  public start(callbacks: TranscriptionCallbacks): void {
    if (!this.isSupported()) {
      callbacks.onError?.('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    try {
      const win = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        callbacks.onError?.('Reconhecimento de voz indisponível.');
        return;
      }

      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'pt-BR';
      this.fullTranscript = '';

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }

        if (final) {
          this.fullTranscript += final;
          callbacks.onFinal?.(this.fullTranscript.trim());
        }

        if (interim) {
          callbacks.onInterim?.(interim);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        // Ignora erros normais de parada
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        let userMsg = `Erro na transcrição: ${event.error}`;
        if (event.error === 'not-allowed') {
          userMsg = 'Permissão para uso do microfone foi negada pelo navegador.';
        } else if (event.error === 'network') {
          userMsg = 'Falha de rede ao tentar realizar transcrição de áudio.';
        }

        callbacks.onError?.(userMsg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        callbacks.onEnd?.();
      };

      this.recognition.start();
      this.isListening = true;
    } catch (err) {
      this.isListening = false;
      callbacks.onError?.((err as Error).message || 'Falha ao iniciar reconhecimento de voz.');
    }
  }

  /**
   * Para a captura e finaliza a transcrição.
   */
  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Ignora
      }
    }
    this.isListening = false;
  }

  /**
   * Aborta o reconhecimento imediatamente.
   */
  public abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignora
      }
    }
    this.isListening = false;
  }

  public getFinalTranscript(): string {
    return this.fullTranscript.trim();
  }
}
