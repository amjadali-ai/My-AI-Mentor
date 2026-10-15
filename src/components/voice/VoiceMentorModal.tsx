import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  AlertCircle,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface VoiceMentorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceMentorModal: React.FC<VoiceMentorModalProps> = ({ isOpen, onClose }) => {
  const { addTask } = useApp();

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusText, setStatusText] = useState('Connecting to Gemini 3.8 Live...');
  const [transcripts, setTranscripts] = useState<Array<{ sender: 'user' | 'model'; text: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // Helper to convert float32 to 16-bit PCM base64
  const floatTo16BitPCMBase64 = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Playback raw 24kHz PCM chunk from model
  const playAudioChunk = (base64Audio: string) => {
    if (!outputAudioCtxRef.current) {
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }

    const ctx = outputAudioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  // Connect to WebSocket & start mic
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live-mentor`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      setIsConnected(true);
      setStatusText('Gemini 3.8 Live active. Starting audio stream...');
      await startAudioCapture(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setErrorMessage(data.error);
          setStatusText('Error in Live Session');
          return;
        }

        if (data.audio) {
          setStatusText('Mentor speaking...');
          playAudioChunk(data.audio);
        }

        if (data.text) {
          setTranscripts((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.sender === 'model') {
              return [...prev.slice(0, -1), { sender: 'model', text: last.text + data.text }];
            }
            return [...prev, { sender: 'model', text: data.text }];
          });
        }

        if (data.interrupted) {
          if (outputAudioCtxRef.current) {
            outputAudioCtxRef.current.close().then(() => {
              outputAudioCtxRef.current = null;
              nextPlayTimeRef.current = 0;
            });
          }
          setStatusText('Listening to you...');
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket Live API error:', err);
      setErrorMessage('Unable to connect to Live Voice Mentor.');
      setStatusText('Disconnected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatusText('Session ended');
    };

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const startAudioCapture = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      inputAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const base64Audio = floatTo16BitPCMBase64(inputData);
        ws.send(JSON.stringify({ audio: base64Audio }));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsRecording(true);
      setStatusText('Listening... Speak naturally with your mentor');
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setErrorMessage('Microphone access denied or not available.');
      setStatusText('Mic access error');
    }
  };

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    nextPlayTimeRef.current = 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
          <Radio className={`w-3.5 h-3.5 text-indigo-400 ${isConnected ? 'animate-pulse' : ''}`} />
          <span>Gemini 3.8 Live API · Real-time Voice</span>
        </div>

        {/* Glowing Pulsing Animated Visualizer Orb */}
        <div className="relative my-4 flex items-center justify-center">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isConnected
                ? 'bg-gradient-to-tr from-indigo-600 via-violet-500 to-cyan-400 shadow-[0_0_50px_rgba(99,102,241,0.5)] scale-105'
                : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <div className="w-24 h-24 rounded-full bg-slate-950 flex items-center justify-center">
              {isMuted ? (
                <MicOff className="w-8 h-8 text-rose-400" />
              ) : (
                <Mic className="w-8 h-8 text-indigo-400 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Status text */}
        <h3 className="text-base font-bold text-white mt-4">{statusText}</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Discuss algorithm derivations, brainstorm study schedules, or ask for guidance hands-free.
        </p>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Voice Starters */}
        <div className="mt-6 w-full text-left">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2 text-center">
            Try saying:
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              'Plan my study day',
              'Explain Red-Black tree rotations',
              'Why am I falling behind on Linear Algebra?',
              'Add a task to practice Dijkstra algorithm',
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ text: prompt }));
                    setStatusText(`Sent: "${prompt}"`);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] text-slate-300 transition-colors"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              isMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-3.5 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors"
          >
            End Conversation
          </button>
        </div>
      </div>
    </div>
  );
};
