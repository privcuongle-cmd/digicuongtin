import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, AlertCircle, Zap, ZapOff, Image as ImageIcon } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerId = "barcode-scanner-video-region";

  const handleCaptureAndScan = async () => {
    if (isProcessingCapture) return;
    
    // Find video element inside our active preview container
    const videoEl = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
    if (!videoEl) {
      setCaptureError("Không tìm thấy màn hình camera đang hoạt động.");
      return;
    }

    try {
      setIsProcessingCapture(true);
      setCaptureError(null);

      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Không thể khởi tạo bộ xử lý ảnh.");
      }

      // Draw current video frame to canvas
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob/file
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error("Không thể trích xuất hình ảnh từ camera.");
      }

      const file = new File([blob], "capture.png", { type: "image/png" });

      // Create a hidden host container for the temporary static scanner
      let tempScannerHost = document.getElementById('temp-scanner-host');
      if (!tempScannerHost) {
        tempScannerHost = document.createElement('div');
        tempScannerHost.id = 'temp-scanner-host';
        tempScannerHost.style.display = 'none';
        document.body.appendChild(tempScannerHost);
      }

      const tempScanner = new Html5Qrcode('temp-scanner-host');
      try {
        const decodedText = await tempScanner.scanFile(file, false);
        playBeep();
        onScanSuccess(decodedText);
        onClose();
      } catch (scanErr) {
        console.warn("Static canvas frame scan failed", scanErr);
        setCaptureError("Không nhận diện được mã QR nào từ ảnh chụp. Hãy giữ thẳng đứng camera và nhấn chụp lại.");
        setTimeout(() => setCaptureError(null), 3000);
      } finally {
        setIsProcessingCapture(false);
      }
    } catch (err: any) {
      console.error("Capture and scan error", err);
      setCaptureError(err?.message || "Lỗi khi chụp và xử lý quét mã.");
      setIsProcessingCapture(false);
      setTimeout(() => setCaptureError(null), 3000);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingCapture(true);
      setCaptureError(null);

      let tempScannerHost = document.getElementById('temp-scanner-host');
      if (!tempScannerHost) {
        tempScannerHost = document.createElement('div');
        tempScannerHost.id = 'temp-scanner-host';
        tempScannerHost.style.display = 'none';
        document.body.appendChild(tempScannerHost);
      }

      const tempScanner = new Html5Qrcode('temp-scanner-host');
      const decodedText = await tempScanner.scanFile(file, false);
      playBeep();
      onScanSuccess(decodedText);
      onClose();
    } catch (scanErr) {
      console.warn("File QR scan failed", scanErr);
      setCaptureError("Không tìm thấy mã QR nào trong file ảnh vừa chọn. Vui lòng thử ảnh khác rõ nét hơn!");
      setTimeout(() => setCaptureError(null), 4000);
    } finally {
      setIsProcessingCapture(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Scan success audio or haptic feedback can be done inside onScanSuccess
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz beeping sound
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // beep for 150ms
    } catch (e) {
      console.warn("Audio Context beep error:", e);
    }
  };

  // Manage scanner lifecycle with strict cleanup and synchronization
  useEffect(() => {
    let isMounted = true;
    let localScanner: Html5Qrcode | null = null;

    const stopActiveScanner = async () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (stopErr) {
          console.warn("Error stopping active scanner", stopErr);
        }
        scannerRef.current = null;
      }
      if (localScanner) {
        try {
          if (localScanner.isScanning) {
            await localScanner.stop();
          }
        } catch (stopErr) {
          console.warn("Error stopping local scanner", stopErr);
        }
        localScanner = null;
      }
    };

    const runInitAndScan = async () => {
      // 1. If not open, stop any existing scan and return
      if (!isOpen) {
        await stopActiveScanner();
        if (isMounted) {
          setIsTorchOn(false);
          setHasTorch(false);
        }
        return;
      }

      // 2. Clear former errors & reset states
      setError(null);
      setIsInitializing(true);
      setHasTorch(false);
      setIsTorchOn(false);

      // 3. Stop previous scanner and wait for resource release
      await stopActiveScanner();
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (!isMounted || !isOpen) return;

      // 4. Load cameras if not already loaded
      let camId = selectedCameraId;
      if (cameras.length === 0) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            if (isMounted) setCameras(devices);
            const backCam = devices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('rear') ||
              device.label.toLowerCase().includes('environment')
            );
            camId = backCam ? backCam.id : devices[0].id;
            if (isMounted) setSelectedCameraId(camId);
          } else {
            if (isMounted) {
              setError("Không tìm thấy camera nào trên thiết bị.");
              setIsInitializing(false);
            }
            return;
          }
        } catch (err) {
          console.error("getCameras failed", err);
          if (isMounted) {
            setError("Không thể truy cập camera. Vui lòng cấp quyền camera cho ứng dụng.");
            setIsInitializing(false);
          }
          return;
        }
      }

      if (!camId) return;
      if (!isMounted || !isOpen) return;

      // 5. Initialize & start html5QrCode
      try {
        const html5QrCode = new Html5Qrcode(scannerId, {
          useBarCodeDetectorIfSupported: true,
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        });
        localScanner = html5QrCode;
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          camId,
          {
            fps: 30,
            aspectRatio: 1.777778,
            videoConstraints: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: "environment",
              focusMode: "continuous"
            } as any
          },
          (decodedText) => {
            playBeep();
            onScanSuccess(decodedText);
            onClose();
          },
          (errorMessage) => {
            // ignore constant scan logs
          }
        );

        if (isMounted && isOpen) {
          setIsInitializing(false);
          setError(null);
          
          try {
            const capabilities = html5QrCode.getRunningTrackCameraCapabilities() as any;
            if (capabilities && (capabilities.hasTorch || capabilities.torch)) {
              setHasTorch(true);
            }
          } catch (capsErr) {
            console.log("Failed to query camera capabilities:", capsErr);
          }
        }
      } catch (err: any) {
        console.error("html5QrCode.start failed during scan initialization", err);
        // Retry once after 250ms delay if browser hardware resources take a while to be freed
        if (isMounted && isOpen) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          if (!isMounted || !isOpen) return;

          try {
            const html5QrCode2 = new Html5Qrcode(scannerId, {
              useBarCodeDetectorIfSupported: true,
              verbose: false,
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            });
            localScanner = html5QrCode2;
            scannerRef.current = html5QrCode2;

            await html5QrCode2.start(
              camId,
              {
                fps: 30,
                aspectRatio: 1.777778,
                videoConstraints: {
                  width: { min: 640, ideal: 1280, max: 1920 },
                  height: { min: 480, ideal: 720, max: 1080 },
                  facingMode: "environment"
                } as any
              },
              (decodedText) => {
                playBeep();
                onScanSuccess(decodedText);
                onClose();
              },
              () => {}
            );

            setIsInitializing(false);
            setError(null);
          } catch (retryErr) {
            console.error("Retry start also failed", retryErr);
            setError("Không thể khởi động camera quét mã. Vui lòng thử camera khác hoặc cấp lại quyền camera.");
            setIsInitializing(false);
          }
        }
      }
    };

    runInitAndScan();

    return () => {
      isMounted = false;
      if (localScanner && localScanner.isScanning) {
        localScanner.stop().catch(err => console.warn("Cleanup stop failed", err));
      }
    };
  }, [isOpen, selectedCameraId, cameras.length]);

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.error("Failed to toggle torch", err);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col justify-center items-center bg-slate-900/90 backdrop-blur-sm p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'
      }`}
    >
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-500 animate-pulse" />
            <span className="text-[14px] font-black tracking-tight text-white uppercase">Quét Mã QR thiết bị</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Camera Stage */}
        <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center text-center p-6 text-slate-300 space-y-3">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <p className="text-[13px] font-bold text-slate-200 uppercase tracking-wider">Lỗi camera</p>
              <p className="text-[12px] text-slate-400 max-w-xs">{error}</p>
            </div>
          ) : (
            <>
              {/* HTML5 Qr Code Video Mount */}
              <div id={scannerId} className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
              
              {isInitializing && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Đang kết nối camera...</p>
                </div>
              )}

              {/* Scanning Target Visual Indicator overlay */}
              {!isInitializing && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between items-center p-6">
                  <div className="text-center bg-slate-950/85 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase text-blue-400 border border-slate-900 shadow-md">
                    Đặt mã QR vào khung căn chỉnh
                  </div>
                  
                  {/* Outer laser line scanning pulse */}
                  <div className="w-11/12 max-w-[325px] h-36 md:h-40 relative border border-dashed border-blue-500/50 rounded-xl">
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-xl animate-pulse"></div>
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl-md"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr-md"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl-md"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br-md"></div>
                    {/* Laser line anim */}
                    <div className="absolute left-1 right-1 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[bounce_2s_infinite]"></div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-bold bg-slate-950/70 py-1 px-3 rounded-full uppercase tracking-widest">
                    Tải phân giải cao | Quét laser siêu tốc
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Capture and Album Actions */}
        <div className="flex flex-col gap-2 p-4 bg-slate-950 border-t border-slate-900 border-dashed">
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={handleCaptureAndScan}
              disabled={isInitializing || !!error || isProcessingCapture}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-900 disabled:to-slate-900 text-white font-bold text-[13px] shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-center uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessingCapture ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang Phân Tích...</span>
                </>
              ) : (
                <>
                  <Camera size={16} className="text-white animate-pulse" />
                  <span>Chụp & Quét QR</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingCapture}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 disabled:bg-slate-900 text-slate-300 font-bold text-[13px] border border-slate-800 transition-all active:scale-95 text-center uppercase tracking-wider shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <ImageIcon size={15} className="text-slate-400" />
              <span>Ảnh từ máy</span>
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          {captureError && (
            <div className="mt-1 text-center text-[12px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 py-2 px-3 rounded-xl animate-pulse">
              {captureError}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-900 flex items-center justify-between">
          <div className="flex gap-2">
            {hasTorch && !error && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-bold text-[12px] border transition-colors cursor-pointer active:scale-95 ${
                  isTorchOn 
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                {isTorchOn ? <ZapOff size={14} className="text-amber-400" /> : <Zap size={14} className="text-amber-400 animate-pulse" />}
                {isTorchOn ? 'Tắt Đèn' : 'Bật Đèn'}
              </button>
            )}
          </div>

          {cameras.length > 1 && !error && (
            <button
              type="button"
              onClick={switchCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-white font-bold text-[12px] border border-slate-800 transition-colors cursor-pointer active:scale-95"
            >
              <RefreshCw size={14} className="text-blue-500" />
              Đổi Camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
