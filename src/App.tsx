import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Sparkles, Loader2, Sun, Moon } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import AudioRecorder from './components/AudioRecorder';
import TextInput from './components/TextInput';
import InstagramPreview from './components/InstagramPreview';
import MarketplacePreview from './components/MarketplacePreview';
import { supabase } from './lib/supabase';

interface AnalysisResult {
  caption_instagram: string;
  titulo_marketplace: string;
  precio_sugerido: string;
  categoria: string;
  descripcion_detallada: string;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [appError, setAppError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Check initial session and subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error('Error getting session:', error);
        setAuthError('No se pudo verificar la sesión. Intenta recargar la página.');
      }
      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!authName.trim()) {
      setAuthError('Por favor, ingresa tu nombre.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        data: {
          name: authName,
        },
      },
    });

    if (error) {
      console.error('Error during sign up:', error);
      setAuthError(error.message || 'No se pudo crear la cuenta.');
      return;
    }

    setAuthError('Revisa tu correo para confirmar la cuenta antes de iniciar sesión.');
    setAuthMode('signin');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      console.error('Error during sign in:', error);
      setAuthError('Credenciales inválidas o usuario no confirmado.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSelectedImage(null);
    setImagePreview('');
    setAudioBlob(null);
    setAnalysisResult(null);
    setText('');
    setAppError(null);
  };

  const handleImageSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setAppError('El archivo es demasiado grande. El máximo es 5MB.');
      return;
    }
    setSelectedImage(file);
    // Revoke previous URL to avoid memory leaks
    setImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return '';
    });
    setAnalysisResult(null);
  };

  const handleAudioRecorded = (blob: Blob) => {
    setAudioBlob(blob);
  };

  const handleClearAudio = () => {
    setAudioBlob(null);
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCopyToClipboard = async (textToCopy: string, label: string) => {
    if (!textToCopy.trim()) {
      setAppError(`No hay contenido para copiar de ${label}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setAppError(null);
      setCopyMessage(`Texto de ${label} copiado al portapapeles.`);
    } catch {
      setAppError(`No se pudo copiar el texto de ${label}.`);
    }
  };

  const decodeJwtPayload = (jwt: string): any | null => {
    try {
      const parts = jwt.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setAppError('Por favor, selecciona una imagen primero.');
      return;
    }

    if (!session) {
      setAppError('Debes iniciar sesión para generar contenido.');
      return;
    }

    const jwtPayload = decodeJwtPayload(session.access_token);
    const expectedIss = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1`;
    const tokenIss = jwtPayload?.iss;
    const tokenExp = typeof jwtPayload?.exp === 'number' ? jwtPayload.exp : null;
    const now = Math.floor(Date.now() / 1000);
    if (tokenExp && tokenExp < now) {
      setAppError('Tu sesión expiró. Cierra sesión e inicia sesión de nuevo.');
      return;
    }
    if (tokenIss && tokenIss !== expectedIss) {
      setAppError(
        `Tu sesión pertenece a otro proyecto Supabase. Esperado: ${expectedIss}. Recibido: ${tokenIss}. ` +
          `Solución: borra el almacenamiento del sitio (localStorage) y vuelve a iniciar sesión, ` +
          `y confirma que Vercel tiene los env vars correctos para Production/Preview.`
      );
      return;
    }

    setIsAnalyzing(true);
    setAppError(null);

    try {
      const imageBase64 = await convertImageToBase64(selectedImage);

      const imagePath = `${session.user.id}/${Date.now()}_${selectedImage.name}`;
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(imagePath, selectedImage);

      if (uploadError) throw uploadError;

      let audioPath: string | null = null;
      let audioSignedUrl: string | null = null;
      if (audioBlob) {
        audioPath = `${session.user.id}/${Date.now()}_audio.webm`;
        const { error: audioUploadError } = await supabase.storage
          .from('post-audio')
          .upload(audioPath, audioBlob);

        if (audioUploadError) {
          console.error('Audio upload error:', audioUploadError);
          audioPath = null;
        } else {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('post-audio')
            .createSignedUrl(audioPath, 60 * 5);

          if (signedError) {
            console.error('Signed URL error:', signedError);
          } else {
            audioSignedUrl = signedData.signedUrl;
          }
        }
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-product`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          // Use anon key JWT so Edge Function auth never fails with stale/other-project user tokens.
          // This is safe here because the anon key is public anyway.
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          text: text || 'Analiza esta imagen y genera información para venta',
          audioUrl: audioSignedUrl,
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        let details = raw || 'Respuesta vacía del servidor';
        try {
          const parsed = JSON.parse(raw);
          details =
            parsed?.error ||
            parsed?.message ||
            (typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
        } catch {
          // keep raw
        }
        throw new Error(`Error al analizar la imagen (${response.status}): ${details}`);
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);

      await supabase.from('posts').insert({
        user_id: session.user.id,
        image_url: imagePath,
        user_text: text,
        audio_url: audioPath,
        caption_instagram: result.caption_instagram,
        titulo_marketplace: result.titulo_marketplace,
        precio_sugerido: result.precio_sugerido,
        categoria: result.categoria,
        descripcion_detallada: result.descripcion_detallada,
      });

    } catch (error: any) {
      console.error('Error:', error);
      setAppError(
        error?.message ||
          'Hubo un error al analizar la imagen. Por favor, intenta de nuevo.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-gray-400">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  const renderAuthForm = () => (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent text-center">
            Generador de Contenido con IA
          </h1>
          <p className="text-gray-400 text-center mb-6">
            Crea una cuenta o inicia sesión para usar la aplicación.
          </p>

          {authError && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {authError}
            </div>
          )}

          <div className="flex mb-6 rounded-lg bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                authMode === 'signin'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                authMode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form
            onSubmit={authMode === 'signup' ? handleSignUp : handleSignIn}
            className="space-y-4"
          >
            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tu nombre"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {authMode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (!session) {
    return renderAuthForm();
  }

  return (
    <div
      className={
        isDarkMode
          ? 'min-h-screen bg-gray-950 text-gray-100'
          : 'min-h-screen bg-gradient-to-b from-rose-50 via-white to-sky-50 text-slate-900'
      }
    >
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="text-left">
            <h1 className="text-4xl font-bold mb-1 bg-gradient-to-r from-rose-400 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
              Generador de Contenido con IA
            </h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>
              Sube una imagen, añade información y genera contenido optimizado para Instagram y Marketplace
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className={
                isDarkMode
                  ? 'flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-200 hover:bg-gray-800 transition-colors'
                  : 'flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors'
              }
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-3 w-3" />
                  Modo día
                </>
              ) : (
                <>
                  <Moon className="h-3 w-3" />
                  Modo noche
                </>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className={
                isDarkMode
                  ? 'text-sm text-gray-300 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors'
                  : 'text-sm text-rose-700 hover:text-rose-900 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors bg-white'
              }
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {copyMessage && (
          <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {copyMessage}
          </div>
        )}

        {appError && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {appError}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 lg:h-[calc(100vh-7rem)]">
          <div className="space-y-6 lg:overflow-y-auto lg:pr-2">
            <div
              className={
                isDarkMode
                  ? 'bg-gray-900 rounded-xl p-6 border border-gray-800'
                  : 'bg-white rounded-xl p-6 border border-rose-100 shadow-sm'
              }
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                Carga de Imagen
              </h2>
              <ImageUpload
                onImageSelect={handleImageSelect}
                selectedImage={selectedImage}
                onClear={handleClearImage}
              />
            </div>

            <div
              className={
                isDarkMode
                  ? 'bg-gray-900 rounded-xl p-6 border border-gray-800'
                  : 'bg-white rounded-xl p-6 border border-rose-100 shadow-sm'
              }
            >
              <h2 className="text-xl font-semibold mb-4">Información Adicional</h2>
              <div className="space-y-4">
                <TextInput value={text} onChange={setText} />
                <AudioRecorder
                  onAudioRecorded={handleAudioRecorded}
                  audioBlob={audioBlob}
                  onClearAudio={handleClearAudio}
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!selectedImage || isAnalyzing}
              className={
                (!selectedImage || isAnalyzing
                  ? 'w-full bg-gray-600 cursor-not-allowed '
                  : 'w-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-sky-500 hover:from-rose-600 hover:via-fuchsia-600 hover:to-sky-600 ') +
                'text-white font-semibold py-3.5 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-md'
              }
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analizando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generar Contenido
                </>
              )}
            </button>
          </div>

          <div className="space-y-6 lg:overflow-y-auto lg:pl-2">
            <div
              className={
                isDarkMode
                  ? 'bg-gray-900 rounded-xl p-6 border border-gray-800'
                  : 'bg-white rounded-xl p-6 border border-rose-100 shadow-sm'
              }
            >
              <h2 className="text-xl font-semibold mb-4">Vista Previa Instagram</h2>
              {imagePreview ? (
                <InstagramPreview
                  imageUrl={imagePreview}
                  caption={analysisResult?.caption_instagram || ''}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Sube una imagen para ver la vista previa
                </div>
              )}
            </div>

            <div
              className={
                isDarkMode
                  ? 'bg-gray-900 rounded-xl p-6 border border-gray-800'
                  : 'bg-white rounded-xl p-6 border border-rose-100 shadow-sm'
              }
            >
              <h2 className="text-xl font-semibold mb-4">Vista Previa Marketplace</h2>
              {imagePreview ? (
                <MarketplacePreview
                  imageUrl={imagePreview}
                  title={analysisResult?.titulo_marketplace || ''}
                  price={analysisResult?.precio_sugerido || '0.00'}
                  category={analysisResult?.categoria || ''}
                  description={analysisResult?.descripcion_detallada || ''}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Sube una imagen para ver la vista previa
                </div>
              )}
            </div>

            {analysisResult && (
              <div
                className={
                  isDarkMode
                    ? 'bg-gray-900 rounded-xl p-4 border border-gray-800 flex flex-col gap-3'
                    : 'bg-white rounded-xl p-4 border border-rose-100 flex flex-col gap-3 shadow-sm'
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    handleCopyToClipboard(
                      analysisResult.caption_instagram,
                      'Instagram'
                    )
                  }
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-2.5 rounded-full text-sm transition-colors"
                >
                  Copiar caption de Instagram
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyToClipboard(
                      `Título: ${analysisResult.titulo_marketplace}\nPrecio: ${analysisResult.precio_sugerido}\nCategoría: ${analysisResult.categoria}\n\nDescripción:\n${analysisResult.descripcion_detallada}`,
                      'Marketplace'
                    )
                  }
                  className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-medium py-2.5 rounded-full text-sm transition-colors"
                >
                  Copiar ficha de Marketplace
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
