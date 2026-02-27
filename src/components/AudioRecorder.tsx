import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

interface AudioRecorderProps {
  onAudioRecorded: (blob: Blob) => void;
  audioBlob: Blob | null;
  onClearAudio: () => void;
}

export default function AudioRecorder({ onAudioRecorded, audioBlob, onClearAudio }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!audioBlob) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      return;
    }

    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioBlob]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onAudioRecorded(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      // Keep a simple fallback here; main app errors are handled at a higher level.
      // This avoids breaking UX if microphone access fails.
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {!audioBlob ? (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isRecording ? (
            <>
              <Square className="h-5 w-5" />
              Detener
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              Grabar Audio
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-3 flex-1">
          {audioUrl && <audio controls src={audioUrl} className="flex-1" />}
          <button
            onClick={onClearAudio}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
