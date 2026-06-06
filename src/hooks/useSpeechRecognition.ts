import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  error: string | null;
  permission: 'prompt' | 'granted' | 'denied' | 'unknown';
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
  hasSupport: boolean;
  requestPermission: () => Promise<boolean>;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const interimRef = useRef('');

  const hasSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  /** 请求麦克风权限 */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // 方法1：使用 navigator.permissions API 检查
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermission(result.state as 'prompt' | 'granted' | 'denied');

        if (result.state === 'denied') {
          setError('麦克风权限被拒绝，请在浏览器设置中开启');
          return false;
        }

        // 方法2：通过 getUserMedia 实际请求权限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // 立即释放
        setPermission('granted');
        setError(null);
        return true;
      }

      // 降级：直接尝试 getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermission('granted');
      setError(null);
      return true;
    } catch (e: any) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setPermission('denied');
        setError('麦克风权限被拒绝，请在浏览器设置中开启');
      } else if (e.name === 'NotFoundError') {
        setError('未检测到麦克风设备');
      } else {
        setError(`无法访问麦克风: ${e.message}`);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (!hasSupport) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setTranscript(finalText || interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('麦克风权限被拒绝，请在浏览器设置中开启');
        setPermission('denied');
      } else if (event.error === 'no-speech') {
        setError('未检测到语音，请再试一次');
      } else if (event.error === 'network') {
        setError('网络错误，语音识别需要联网');
      } else {
        setError(`语音识别错误: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [hasSupport]);

  /** 检查权限状态（静默） */
  useEffect(() => {
    if (!navigator.permissions || !navigator.permissions.query) return;
    navigator.permissions.query({ name: 'microphone' as PermissionName }).then(result => {
      setPermission(result.state as 'prompt' | 'granted' | 'denied');
      result.onchange = () => {
        setPermission(result.state as 'prompt' | 'granted' | 'denied');
      };
    });
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('浏览器不支持语音识别');
      return;
    }
    if (permission === 'denied') {
      setError('麦克风权限被拒绝，请在浏览器设置中开启');
      return;
    }
    setTranscript('');
    setError(null);
    interimRef.current = '';
    try {
      recognitionRef.current.start();
    } catch {
      // Already started or error
    }
  }, [permission]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    interimRef.current = '';
  }, []);

  return {
    isListening,
    transcript,
    error,
    permission,
    startListening,
    stopListening,
    reset,
    hasSupport,
    requestPermission,
  };
}
