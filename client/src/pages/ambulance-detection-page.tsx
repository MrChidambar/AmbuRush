import { useState, useRef, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Check, XCircle, Ambulance, Info, Camera, Volume2, RefreshCcw } from "lucide-react";
import { AmbulanceDetector } from "@/utils/ambulance-detector";

// Define the detection interface
interface Detection {
  timestamp: Date;
  confidence: number;
  imageUrl?: string;
  className?: string;
  bbox?: [number, number, number, number];
}

/**
 * Ambulance siren detector using audio frequency analysis
 */
class AmbulanceSirenDetector {
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  mediaStream: MediaStream | null = null;
  isListening: boolean = false;
  
  // Typical ambulance siren frequency ranges (Hz)
  sirenRanges = [
    { min: 700, max: 1000 },  // Lower pitch sound
    { min: 1300, max: 1700 }  // Higher pitch sound
  ];
  
  // Detection sensitivity threshold (0-1)
  threshold = 0.4;
  
  // Initialize audio context and analyzer
  async initialize(): Promise<boolean> {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      // Improve frequency resolution
      this.analyser.smoothingTimeConstant = 0.85;
      
      return true;
    } catch (error) {
      console.error("Failed to initialize audio detector:", error);
      return false;
    }
  }
  
  // Start listening for ambulance sirens
  async startListening(): Promise<boolean> {
    if (!this.audioContext || !this.analyser) {
      await this.initialize();
    }
    
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext!.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser!);
      
      this.isListening = true;
      return true;
    } catch (error) {
      console.error("Failed to access microphone:", error);
      return false;
    }
  }
  
  // Stop listening
  stopListening(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isListening = false;
  }
  
  // Track previous audio samples for pattern recognition
  private audioHistory: number[] = [];
  private readonly historyLength = 10; // Keep track of samples
  private lastDetection: number = 0; // Time of last detection
  
  // Check if an ambulance siren is detected
  detectSiren(): { detected: boolean; confidence: number } {
    if (!this.analyser || !this.isListening) {
      return { detected: false, confidence: 0 };
    }
    
    try {
      // Get frequency data
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate frequency resolution
      const sampleRate = this.audioContext!.sampleRate;
      const frequencyResolution = sampleRate / this.analyser.fftSize;
      
      // Check for audio energy in siren frequency ranges
      let totalSirenEnergy = 0;
      
      for (const range of this.sirenRanges) {
        // Convert frequencies to indices in the frequency data array
        const minIndex = Math.floor(range.min / frequencyResolution);
        const maxIndex = Math.ceil(range.max / frequencyResolution);
        
        // Calculate average energy in this range
        let sum = 0;
        for (let i = minIndex; i <= maxIndex; i++) {
          if (i < dataArray.length) {
            sum += dataArray[i];
          }
        }
        
        const avgEnergy = sum / (maxIndex - minIndex + 1) / 255;
        totalSirenEnergy += avgEnergy;
      }
      
      // Average energy across all siren ranges
      const avgSirenEnergy = totalSirenEnergy / this.sirenRanges.length;
      
      // Store this energy value in history
      this.audioHistory.push(avgSirenEnergy);
      if (this.audioHistory.length > this.historyLength) {
        this.audioHistory.shift(); // Remove oldest sample
      }
      
      // Look for alternating pattern - typical for sirens
      let patternScore = 0;
      if (this.audioHistory.length >= 3) {
        for (let i = 1; i < this.audioHistory.length; i++) {
          // Look for differences between consecutive samples
          const diff = Math.abs(this.audioHistory[i] - this.audioHistory[i-1]);
          patternScore += diff;
        }
        patternScore /= (this.audioHistory.length - 1);
      }
      
      // Combine current energy with pattern detection
      const detectionScore = (avgSirenEnergy * 0.6) + (patternScore * 0.4);
      
      // Apply threshold
      const detected = detectionScore > this.threshold;
      
      // Update last detection time if detected
      if (detected) {
        this.lastDetection = Date.now();
      }
      
      return {
        detected,
        confidence: Math.min(1, detectionScore) // Cap at 1
      };
    } catch (error) {
      console.error("Error in siren detection:", error);
      return { detected: false, confidence: 0 };
    }
  }
}

// Main component for ambulance detection page
export default function AmbulanceDetectionPage() {
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);
  const [detector, setDetector] = useState<AmbulanceDetector | null>(null);
  const [audioDetector, setAudioDetector] = useState<AmbulanceSirenDetector | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [detectionResult, setDetectionResult] = useState<{
    found: boolean; 
    confidence: number; 
    className: string;
    bbox?: [number, number, number, number];
  } | null>(null);
  
  // Auto-detection mode
  const [autoDetect, setAutoDetect] = useState(true);
  const autoDetectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio detection state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isListeningForSiren, setIsListeningForSiren] = useState(false);
  const [sirenDetected, setSirenDetected] = useState(false);
  const [sirenConfidence, setSirenConfidence] = useState(0);
  
  // Refs for media elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Load detectors
  useEffect(() => {
    async function loadDetectors() {
      try {
        setIsModelLoading(true);
        
        // Initialize TensorFlow detector for ambulance detection
        const ambulanceDetector = new AmbulanceDetector();
        const success = await ambulanceDetector.initialize();
        
        // Initialize audio detector
        const sirenDetector = new AmbulanceSirenDetector();
        await sirenDetector.initialize();
        setAudioDetector(sirenDetector);
        
        if (success) {
          setDetector(ambulanceDetector);
          toast({
            title: "Ambulance detector loaded",
            description: "Using TensorFlow model for ambulance detection. Audio detector ready.",
          });
        } else {
          throw new Error("Failed to initialize ambulance detector");
        }
      } catch (error) {
        console.error('Failed to load model:', error);
        toast({
          title: "Model loading failed",
          description: "Using fallback color-based detection instead.",
          variant: "destructive",
        });
        
        // Create detector anyway to use fallback detection
        const ambulanceDetector = new AmbulanceDetector();
        setDetector(ambulanceDetector);
      } finally {
        setIsModelLoading(false);
      }
    }
    
    loadDetectors();
    
    // Cleanup
    return () => {
      if (audioDetector && audioDetector.isListening) {
        audioDetector.stopListening();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);
  
  // Effect for camera access
  useEffect(() => {
    // If no stream exists and model is loaded, request camera access
    if (!stream && !isModelLoading) {
      const enableCamera = async () => {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'environment' // Prefer rear camera on mobile
            } 
          });
          
          setStream(videoStream);
          
          if (videoRef.current) {
            videoRef.current.srcObject = videoStream;
          }
          
          toast({
            title: "Camera activated",
            description: "Point your camera at ambulances for detection.",
          });
        } catch (error) {
          console.error("Error accessing camera:", error);
          toast({
            title: "Camera access denied",
            description: "Please grant permission to use your camera for detection.",
            variant: "destructive",
          });
        }
      };
      
      enableCamera();
    }
    
    // Clean up camera stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    };
  }, [stream, isModelLoading, toast]);
  
  // Effect for automatic detection
  useEffect(() => {
    // Clear any existing interval
    if (autoDetectIntervalRef.current) {
      clearInterval(autoDetectIntervalRef.current);
      autoDetectIntervalRef.current = null;
    }
    
    // Only start auto-detection if it's enabled, the detector is ready, and we have camera access
    if (autoDetect && detector && stream && videoRef.current && !isModelLoading) {
      autoDetectIntervalRef.current = setInterval(async () => {
        // Don't run if we're already processing a frame
        if (isDetecting) return;
        
        // Run detection without showing toast messages
        await handleStartCameraDetection(true); 
      }, 2000); // Check every 2 seconds
      
      // Log that auto-detection is active
      console.log("Auto-detection mode activated");
    }
    
    // Cleanup on unmount
    return () => {
      if (autoDetectIntervalRef.current) {
        clearInterval(autoDetectIntervalRef.current);
        autoDetectIntervalRef.current = null;
      }
    };
  }, [autoDetect, detector, stream, isModelLoading, isDetecting]);
  
  // Effect for audio detection
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    // If audio is enabled and we have an audio detector
    if (audioEnabled && audioDetector) {
      // Start audio detection
      const startAudioDetection = async () => {
        try {
          const success = await audioDetector.startListening();
          setIsListeningForSiren(success);
          
          if (success) {
            toast({
              title: "Audio detection activated",
              description: "Now listening for ambulance sirens.",
            });
            
            // Check for sirens periodically
            interval = setInterval(() => {
              const result = audioDetector.detectSiren();
              setSirenDetected(result.detected);
              setSirenConfidence(result.confidence);
              
              if (result.detected && result.confidence > 0.5) {
                // Add to detection history for high-confidence detections
                const newDetection: Detection = {
                  timestamp: new Date(),
                  confidence: result.confidence,
                  className: "ambulance siren"
                };
                
                setDetections(prev => {
                  // Only add if we don't have a recent similar detection (within last 5 seconds)
                  const now = new Date().getTime();
                  const recentSimilarDetection = prev.some(d => 
                    d.className === "ambulance siren" && 
                    (now - d.timestamp.getTime()) < 5000
                  );
                  
                  if (!recentSimilarDetection) {
                    return [newDetection, ...prev.slice(0, 4)];
                  }
                  return prev;
                });
              }
            }, 500); // Check every 500ms
          }
        } catch (error) {
          console.error("Error starting audio detection:", error);
          setAudioEnabled(false);
          setIsListeningForSiren(false);
          toast({
            title: "Audio detection failed",
            description: "Could not access microphone for siren detection.",
            variant: "destructive",
          });
        }
      };
      
      startAudioDetection();
    } else {
      // Stop listening if audio is disabled
      if (audioDetector && audioDetector.isListening) {
        audioDetector.stopListening();
        setIsListeningForSiren(false);
        setSirenDetected(false);
        setSirenConfidence(0);
      }
      
      // Clear the interval
      if (interval) {
        clearInterval(interval);
      }
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [audioEnabled, audioDetector, toast]);
  
  // Handle camera-based detection
  const handleStartCameraDetection = async (silent: boolean = false) => {
    if (!detector || !stream || !videoRef.current) {
      if (!silent) {
        toast({
          title: "Cannot start camera detection",
          description: "Please ensure the camera is active and the detection model is loaded.",
          variant: "destructive",
        });
      }
      return;
    }
    
    setIsDetecting(true);
    setDetectionResult(null);
    
    try {
      // Create a temporary canvas to capture the current video frame
      const tempCanvas = document.createElement('canvas');
      const videoElement = videoRef.current;
      
      tempCanvas.width = videoElement.videoWidth;
      tempCanvas.height = videoElement.videoHeight;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error("Could not get canvas context");
      
      // Draw the current video frame to the canvas
      tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Create an image from the canvas
      const imgDataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
      const img = new Image();
      img.src = imgDataUrl;
      
      // Wait for the image to load
      await new Promise(resolve => {
        img.onload = resolve;
      });
      
      // Perform detection on the captured frame using YOLOv8
      const result = await detector.detectAmbulance(img);
      
      // Process the result
      if (result.found) {
        // Add to detection history
        const newDetection: Detection = {
          timestamp: new Date(),
          confidence: result.confidence,
          imageUrl: imgDataUrl,
          className: result.className,
          bbox: result.bbox
        };
        
        setDetections(prev => [newDetection, ...prev.slice(0, 4)]);
        
        setDetectionResult(result);
        
        if (!silent) {
          toast({
            title: `Ambulance detected!`,
            description: `${result.className} detected with ${Math.round(result.confidence * 100)}% confidence.`,
          });
        }
        
        // Draw result on camera canvas
        if (cameraCanvasRef.current && result.bbox) {
          const ctx = cameraCanvasRef.current.getContext('2d');
          
          if (ctx) {
            // Set canvas dimensions to match video
            cameraCanvasRef.current.width = videoElement.videoWidth;
            cameraCanvasRef.current.height = videoElement.videoHeight;
            
            // Draw bounding box
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#FF0000';
            const [x1, y1, x2, y2] = result.bbox;
            const width = x2 - x1;
            const height = y2 - y1;
            ctx.strokeRect(x1, y1, width, height);
            
            // Label
            ctx.fillStyle = '#FF0000';
            ctx.font = '16px Arial';
            ctx.fillText('AMBULANCE', x1, y1 > 20 ? y1 - 10 : 20);
            
            // Confidence
            ctx.font = '14px Arial';
            ctx.fillText(`${Math.round(result.confidence * 100)}%`, x1, y1 > 40 ? y1 - 30 : 40);
            
            // Clear canvas after 3 seconds
            setTimeout(() => {
              if (cameraCanvasRef.current) {
                const clearCtx = cameraCanvasRef.current.getContext('2d');
                if (clearCtx) {
                  clearCtx.clearRect(0, 0, cameraCanvasRef.current.width, cameraCanvasRef.current.height);
                }
              }
            }, 3000);
          }
        }
      } else {
        setDetectionResult({
          found: false,
          confidence: 0,
          className: "no detection"
        });
      }
    } catch (error) {
      console.error('Camera detection error:', error);
      toast({
        title: "Detection failed",
        description: "Could not analyze the camera feed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };
  
  // Toggle audio detection
  const toggleAudioDetection = () => {
    setAudioEnabled(prev => !prev);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Ambulance Detection</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Detect nearby ambulances with TensorFlow.js real-time object detection and audio recognition to help clear the way.
            </p>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 mb-8 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Using TensorFlow.js model to detect ambulances (identified as buses in COCO dataset). For best results, point your camera directly at the ambulance in good lighting.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ambulance className="h-5 w-5 mr-2" />
                  TensorFlow Ambulance Detection
                </CardTitle>
                <CardDescription>
                  Identify ambulances with TensorFlow.js model and audio detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isModelLoading && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Loading YOLOv8 model...
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        This may take a moment on first load
                      </p>
                    </div>
                  </div>
                )}
                
                {!isModelLoading && (
                  <div className="space-y-6">
                    {/* Camera View Section */}
                    <div className="mb-4 relative bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden aspect-video">
                      {!stream && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Camera className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
                          <p className="text-center text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            Camera access is required for YOLOv8 ambulance detection.
                          </p>
                        </div>
                      )}
                      
                      <video 
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                      />
                      
                      <canvas 
                        ref={cameraCanvasRef}
                        className="absolute inset-0 w-full h-full"
                      />
                      
                      {/* Audio Detection Indicator */}
                      {audioEnabled && (
                        <div className={`absolute top-4 left-4 p-2 rounded-full ${
                          sirenDetected 
                            ? 'bg-green-100 dark:bg-green-900/70 border border-green-300 dark:border-green-700' 
                            : 'bg-gray-100 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-700'
                        }`}>
                          <Volume2 className={`h-5 w-5 ${
                            sirenDetected 
                              ? 'text-green-500 dark:text-green-400 animate-pulse' 
                              : 'text-primary dark:text-primary-400'
                          }`} />
                        </div>
                      )}
                      
                      {/* Visual Detection Result */}
                      {detectionResult && (
                        <div className={`absolute top-4 right-4 p-3 rounded-md ${
                          detectionResult.found 
                            ? 'bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700' 
                            : 'bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700'
                        }`}>
                          <div className="flex items-center">
                            {detectionResult.found ? (
                              <>
                                <Check className="h-5 w-5 text-green-500 mr-2" />
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                  Ambulance detected ({Math.round(detectionResult.confidence * 100)}%)
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                                  No ambulances detected
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Siren Detection Alert */}
                      {sirenDetected && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-3 rounded-md bg-green-100 dark:bg-green-900/70 border border-green-300 dark:border-green-700 animate-pulse">
                          <div className="flex items-center">
                            <Volume2 className="h-5 w-5 text-green-500 mr-2" />
                            <span className="text-sm font-bold text-green-800 dark:text-green-200">
                              Ambulance siren detected! ({Math.round(sirenConfidence * 100)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Control Buttons */}
                    <div className="flex flex-col md:flex-row gap-4">
                      <Button 
                        className="flex-1"
                        onClick={() => handleStartCameraDetection(false)}
                        disabled={isDetecting || !stream}
                      >
                        {isDetecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing with YOLOv8...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Detect Now
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        className={`flex-1 ${audioEnabled ? 'bg-red-500 hover:bg-red-600 dark:bg-red-900 dark:hover:bg-red-800' : ''}`}
                        onClick={toggleAudioDetection}
                      >
                        {audioEnabled ? (
                          <>
                            <Volume2 className="mr-2 h-4 w-4" />
                            Stop Audio Detection
                          </>
                        ) : (
                          <>
                            <Volume2 className="mr-2 h-4 w-4" />
                            Enable Siren Detection
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        className={`flex-1 ${autoDetect ? 'bg-green-500 hover:bg-green-600 dark:bg-green-900 dark:hover:bg-green-800' : ''}`}
                        onClick={() => setAutoDetect(prev => !prev)}
                      >
                        {autoDetect ? (
                          <>
                            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                            Auto-Detection On
                          </>
                        ) : (
                          <>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Auto-Detection Off
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Point your camera at vehicles to detect ambulances with YOLOv8. Audio detection will listen for ambulance sirens.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Detection History</CardTitle>
                <CardDescription>
                  Recent ambulance detections
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detections.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      No recent detections available.
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Detection history will appear here once ambulances are detected.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detections.map((detection, index) => (
                      <div key={index} className="flex items-center p-3 border rounded-md bg-gray-50 dark:bg-gray-900">
                        <div className="flex-shrink-0 mr-3">
                          {detection.imageUrl ? (
                            <div className="h-12 w-12 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                              <img 
                                src={detection.imageUrl} 
                                alt="Detected vehicle" 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                              {detection.className === "ambulance siren" ? (
                                <Volume2 className="h-6 w-6 text-primary" />
                              ) : (
                                <Ambulance className="h-6 w-6 text-primary" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm font-medium">
                              {detection.className || 'Vehicle'} detected ({Math.round(detection.confidence * 100)}% confidence)
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {detection.timestamp.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-md mt-6">
              <h3 className="font-medium mb-2 text-blue-700 dark:text-blue-300 flex items-center">
                <Info className="h-4 w-4 mr-1" /> About YOLOv8 Detection
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                This feature uses the YOLOv8 model for precise ambulance detection. YOLOv8 is a state-of-the-art object detection model that can identify vehicles with high accuracy. For ambulance detection, the model looks for buses (class 5 in the COCO dataset) which most closely resemble ambulances. The audio detector uses frequency analysis to detect the characteristic patterns of ambulance sirens.
              </p>
            </div>
            
            <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-md mt-2">
              <h3 className="font-medium mb-2 text-primary-700 dark:text-primary-300 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" /> Important Note
              </h3>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                This feature is meant as an assistive tool only. Always remain alert while driving and follow all traffic laws. Do not rely solely on this application for emergency vehicle detection. In case of emergency, dial 108 for immediate assistance in India.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}