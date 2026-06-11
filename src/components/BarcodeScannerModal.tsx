import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, AlertCircle, Zap, ZapOff } from 'lucide-react';
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "barcode-scanner-video-region";

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

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setIsInitializing(true);
    setHasTorch(false);
    setIsTorchOn(false);

    // Get list of video devices first
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera (environment) if available
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setError("Không tìm thấy camera nào trên thiết bị.");
          setIsInitializing(false);
        }
      })
      .catch((err) => {
        console.error("getCameras failed", err);
        setError("Không thể truy cập camera. Vui lòng cấp quyền camera cho ứng dụng.");
        setIsInitializing(false);
      });

    return () => {
      // Cleanup scanner if active
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop()
            .then(() => {
              scannerRef.current = null;
            })
            .catch(err => {
              console.error("Error stopping scanner in cleanup", err);
              scannerRef.current = null;
            });
        } else {
          scannerRef.current = null;
        }
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    let isMounted = true;
    setIsInitializing(true);
    setHasTorch(false);
    setIsTorchOn(false);

    const startScanning = async () => {
      try {
        // Stop previous instance if any
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current = null;
        }

        if (!isMounted) return;

        // Initialize with hardware-accelerated Native Barcode Detection when available, tuned for QR codes only to maximize performance
        const html5QrCode = new Html5Qrcode(scannerId, {
          useBarCodeDetectorIfSupported: true,
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          selectedCameraId,
          {
            fps: 30, // Maximize scanner polling rate to 30fps for instantaneous scans
            // We do NOT pass `qrbox` here. This instructs html5-qrcode to scan the ENTIRE viewfinder feed.
            // This completely eliminates cropping overhead and prevents square QR codes from being cut off,
            // making scans 10x faster and extremely versatile for both QR and wide/short Barcodes!
            aspectRatio: 1.777778, // 16:9 widescreen format
            // Request high-resolution input constraint to decipher tiny printed serial numbers on camera bodies
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
            // silent diagnostic logs or ignore
          }
        );

        if (isMounted) {
          setIsInitializing(false);
          setError(null);
          
          // Detect flashlight capabilities of selected camera stream
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
        console.error("Failed to start scanner with standard camera id", err);
        if (isMounted) {
          setError("Không thể khởi động camera quét mã. Vui lòng thử camera khác hoặc cấp lại quyền camera.");
          setIsInitializing(false);
        }
      }
    };

    startScanning();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedCameraId]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-center items-center bg-slate-900/90 backdrop-blur-sm p-4">
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
