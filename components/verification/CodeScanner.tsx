'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { FormDialog, InputField, PortButton } from '@/components/ports';

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function detectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

type CodeScannerProps = {
  open: boolean;
  onClose: () => void;
  onDetect: (value: string) => void;
};

/** Camera QR/barcode scan using the native BarcodeDetector; manual entry always available. */
export default function CodeScanner({ open, onClose, onDetect }: CodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [manual, setManual] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const stop = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => {
    if (!open) {
      stop();
      setManual('');
      setMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = async () => {
    const Ctor = detectorCtor();
    if (!Ctor) {
      setMessage('This browser cannot scan codes. Type the asset code or serial number below.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera access is unavailable. Type the asset code or serial number below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);
      setMessage(null);
      const detector = new Ctor({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const value = results[0]?.rawValue?.trim();
          if (value) {
            stop();
            onDetect(value);
            return;
          }
        } catch {
          // detection errors are transient while the camera warms up
        }
        timerRef.current = window.setTimeout(tick, 350);
      };
      timerRef.current = window.setTimeout(tick, 350);
    } catch {
      setMessage('Could not start the camera. Allow camera access or type the code below.');
      stop();
    }
  };

  const submitManual = () => {
    const value = manual.trim();
    if (!value) return;
    onDetect(value);
  };

  const handleClose = () => {
    stop();
    onClose();
  };

  return (
    <FormDialog
      open={open}
      title="Scan asset code"
      onClose={handleClose}
      footer={
        <PortButton variant="ghost" type="button" onClick={handleClose}>
          Close
        </PortButton>
      }
    >
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-border bg-[#0f1620]">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-white/70">
              <CameraOff size={22} />
              <span>Camera preview appears here</span>
            </div>
          )}
        </div>
        <PortButton variant="primary" onClick={() => void start()} disabled={scanning}>
          <Camera size={15} /> {scanning ? 'Scanning…' : 'Start camera'}
        </PortButton>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            submitManual();
          }}
        >
          <InputField
            label="Asset code, serial, or barcode"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="e.g. AST-000123"
            containerClassName="flex-1"
          />
          <PortButton variant="secondary" type="submit" disabled={!manual.trim()}>
            Find asset
          </PortButton>
        </form>
      </div>
    </FormDialog>
  );
}
