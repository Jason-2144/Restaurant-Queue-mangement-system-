import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  text: string;
  size?: number;
  className?: string;
  colorDark?: string;
  colorLight?: string;
}

export function QRCodeDisplay({
  text,
  size = 380,
  className = '',
  colorDark = '#1C1917',
  colorLight = '#FFFFFF',
}: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(text, {
      width: Math.max(size * 2, 600), // high res for crisp scaling
      margin: 1.5,
      color: {
        dark: colorDark,
        light: colorLight,
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setDataUrl(url);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
        setError('QR Generation Error');
      });
  }, [text, size, colorDark, colorLight]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 text-stone-500 rounded-xl text-xs text-center p-4 ${className}`}
      >
        Failed to render QR Code
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`animate-pulse bg-stone-100 rounded-xl flex items-center justify-center aspect-square ${className}`}
      >
        <span className="text-xs text-stone-400 font-medium">Generating QR...</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Queue Scan QR Code"
      className={`object-contain max-h-full max-w-full select-none ${className}`}
    />
  );
}
