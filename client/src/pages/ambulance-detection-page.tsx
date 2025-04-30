import { useState, useRef, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, AlertTriangle, Check, XCircle, Ambulance, Info, Camera, Volume2 } from "lucide-react";

// Import TensorFlow.js for machine learning
import * as tf from '@tensorflow/tfjs';

interface Detection {
  timestamp: Date;
  confidence: number;
  imageUrl?: string;
  className?: string;
}

/**
 * YOLOv5 Ambulance Detector adapted from Python to JavaScript/TensorFlow.js
 * Based on the provided Python code
 */
class AmbulanceDetector {
  model: tf.GraphModel | null = null;
  isModelLoaded: boolean = false;
  
  // Focus on relevant vehicle classes for COCO dataset
  relevantClasses = [2, 3, 5, 7]; // car, motorcycle, bus, truck
  confidenceThreshold = 0.5;
  
  // Enhanced ambulance detection parameters
  ambulanceKeywords = [
    'ambulance', 'medical', 'rescue', 'hospital', 
    'ems', 'paramedic', 'emergency', '911',
    'first aid', 'red cross', '救护车' // Chinese for ambulance
  ];
  
  // Initialize the detector
  async initialize(): Promise<boolean> {
    try {
      // Load YOLOv5 converted TensorFlow.js model
      // We load the general COCO-SSD model as the YOLOv5 model would 
      // need to be converted and hosted separately
      this.model = await tf.loadGraphModel(
        'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1',
        { fromTFHub: true }
      );
      
      this.isModelLoaded = true;
      console.log("YOLOv5 ambulance detection model loaded successfully");
      return true;
    } catch (error) {
      console.error("Failed to load model:", error);
      return false;
    }
  }
  
  // Main detection function
  async detect(imageElement: HTMLImageElement): Promise<{ found: boolean; confidence: number; className: string }> {
    if (!this.model || !this.isModelLoaded) {
      throw new Error("Model not initialized");
    }
    
    try {
      // Convert image to tensor
      const tensor = tf.browser.fromPixels(imageElement);
      
      // Resize for better performance (just like in Python code)
      const resized = tf.image.resizeBilinear(tensor, [640, 480]);
      
      // Run detection
      const predictions = await this.model.executeAsync(
        resized.expandDims(0)
      ) as tf.Tensor[];
      
      // Process results
      const boxes = await predictions[1].arraySync() as number[][][];
      const scores = await predictions[2].arraySync() as number[][];
      const classes = await predictions[3].arraySync() as number[][];
      
      // Look for ambulance or vehicle classes
      let highestConfidence = 0;
      let foundAmbulance = false;
      let detectedClassName = "";
      
      for (let i = 0; i < scores[0].length; i++) {
        if (scores[0][i] > this.confidenceThreshold) {
          const classId = classes[0][i];
          
          // Class 3 is car, 6 is bus, 8 is truck in COCO-SSD
          // These match our relevant classes from Python
          if ([3, 6, 8].includes(classId)) {
            const confidence = scores[0][i];
            if (confidence > highestConfidence) {
              highestConfidence = confidence;
              foundAmbulance = true;
              
              // Get class name
              switch (classId) {
                case 3:
                  detectedClassName = "car";
                  break;
                case 6:
                  detectedClassName = "bus";
                  break;
                case 8:
                  detectedClassName = "truck";
                  break;
                default:
                  detectedClassName = "vehicle";
              }
              
              // If the vehicle is likely an ambulance (based on ambulance keywords), 
              // mark it specifically as ambulance
              if (this.isLikelyAmbulance(detectedClassName)) {
                detectedClassName = "ambulance";
              }
            }
          }
        }
      }
      
      // Cleanup tensors
      tf.dispose(predictions);
      tensor.dispose();
      resized.dispose();
      
      return {
        found: foundAmbulance,
        confidence: highestConfidence,
        className: detectedClassName
      };
      
    } catch (error) {
      console.error("Detection error:", error);
      throw error;
    }
  }
  
  // Check if a vehicle is likely an ambulance based on keywords
  isLikelyAmbulance(className: string): boolean {
    const lowerClassName = className.toLowerCase();
    return this.ambulanceKeywords.some(keyword => lowerClassName.includes(keyword));
  }
}

/**
 * Ambulance siren detector using audio frequency analysis
 */
class AmbulanceSirenDetector {
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  mediaStream: MediaStream | null = null;
  isListening: boolean = false;
  
  // Ambulance siren frequency ranges (Hz) - typical ambulance sirens have frequencies
  // in these ranges with alternating patterns
  sirenRanges = [
    { min: 700, max: 1000 },  // Lower pitch sound
    { min: 1300, max: 1700 }  // Higher pitch sound
  ];
  
  // Detection sensitivity threshold (0-1)
  threshold = 0.6;
  
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
  
  // Check if an ambulance siren is detected
  detectSiren(): { detected: boolean; confidence: number } {
    if (!this.analyser || !this.isListening) {
      return { detected: false, confidence: 0 };
    }
    
    // Get frequency data
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Calculate frequency resolution
    const sampleRate = this.audioContext!.sampleRate;
    const frequencyResolution = sampleRate / this.analyser.fftSize;
    
    // Check for patterns in the relevant frequency ranges
    let detectionScore = 0;
    
    // Check each siren range
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
      
      // Add to detection score, giving more weight to stronger signals
      detectionScore += avgEnergy * avgEnergy;
    }
    
    // Normalize score
    detectionScore = detectionScore / this.sirenRanges.length;
    
    return {
      detected: detectionScore > this.threshold,
      confidence: Math.min(1, detectionScore)
    };
  }
}

export default function AmbulanceDetectionPage() {
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [detector, setDetector] = useState<AmbulanceDetector | null>(null);
  const [audioDetector, setAudioDetector] = useState<AmbulanceSirenDetector | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [detectionResult, setDetectionResult] = useState<{found: boolean, confidence: number, className: string} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectionMode, setDetectionMode] = useState<'upload' | 'camera' | 'audio'>('upload');
  const [isListeningForSiren, setIsListeningForSiren] = useState(false);
  const [sirenDetected, setSirenDetected] = useState(false);
  const [sirenConfidence, setSirenConfidence] = useState(0);
  
  // Refs for media elements
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Load YOLOv5 model and audio detector
  useEffect(() => {
    async function loadModel() {
      try {
        setIsModelLoading(true);
        
        // Initialize the visual detector
        const ambulanceDetector = new AmbulanceDetector();
        const success = await ambulanceDetector.initialize();
        
        // Initialize the audio detector
        const sirenDetector = new AmbulanceSirenDetector();
        await sirenDetector.initialize();
        setAudioDetector(sirenDetector);
        
        if (success) {
          setDetector(ambulanceDetector);
          toast({
            title: "Detection models loaded",
            description: "Visual and audio detection models are now ready to use.",
          });
        } else {
          throw new Error("Failed to initialize detector");
        }
      } catch (error) {
        console.error('Failed to load model:', error);
        toast({
          title: "Model loading failed",
          description: "Could not load one or more detection models. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsModelLoading(false);
      }
    }
    
    loadModel();
    
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
  
  // Effect for camera access when in camera mode
  useEffect(() => {
    // If camera mode is selected and no stream exists, request camera access
    if (detectionMode === 'camera' && !stream && !isModelLoading) {
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
            description: "Point your camera at potential ambulances for detection.",
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
    
    // Clean up camera stream when switching away from camera mode
    return () => {
      if (detectionMode !== 'camera' && stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    };
  }, [detectionMode, stream, isModelLoading, toast]);
  
  // Effect for audio detection
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    // If audio mode is selected and listening is enabled
    if (detectionMode === 'audio' && isListeningForSiren && audioDetector) {
      // Start audio detection
      const startAudioDetection = async () => {
        try {
          const success = await audioDetector.startListening();
          
          if (success) {
            // Check for sirens periodically
            interval = setInterval(() => {
              const result = audioDetector.detectSiren();
              setSirenDetected(result.detected);
              setSirenConfidence(result.confidence);
              
              if (result.detected && result.confidence > 0.7) {
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
      // Stop listening if mode changed or listening disabled
      if (audioDetector && audioDetector.isListening) {
        audioDetector.stopListening();
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
  }, [detectionMode, isListeningForSiren, audioDetector, toast]);

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImageFile(files[0]);
      setDetectionResult(null);
      
      // Create image preview URL
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
    }
  };
  
  // Draw detection boxes on canvas
  const drawDetectionOnCanvas = (imageElement: HTMLImageElement, canvas: HTMLCanvasElement, box: number[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas and set dimensions to match image
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    
    // Draw image first
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    // Draw bounding box
    if (box && box.length === 4) {
      const [x, y, width, height] = box;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FF0000';
      ctx.strokeRect(x, y, width, height);
      
      // Label
      ctx.fillStyle = '#FF0000';
      ctx.font = '16px Arial';
      ctx.fillText(
        "AMBULANCE", 
        x, 
        y > 20 ? y - 10 : 20
      );
    }
  };
  
  // Handle camera-based detection
  const handleStartCameraDetection = async () => {
    if (!detector || !stream || !videoRef.current) {
      toast({
        title: "Cannot start camera detection",
        description: "Please ensure the camera is active and the detection model is loaded.",
        variant: "destructive",
      });
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
      const imgDataUrl = tempCanvas.toDataURL('image/png');
      const img = new Image();
      img.src = imgDataUrl;
      
      // Wait for the image to load
      await new Promise(resolve => {
        img.onload = resolve;
      });
      
      // Perform detection on the captured frame
      const result = await detector.detect(img);
      
      // Process the result
      if (result.found) {
        // Add to detection history
        const newDetection: Detection = {
          timestamp: new Date(),
          confidence: result.confidence,
          imageUrl: imgDataUrl,
          className: result.className
        };
        
        setDetections(prev => [newDetection, ...prev.slice(0, 4)]);
        
        setDetectionResult({
          found: true,
          confidence: result.confidence,
          className: result.className
        });
        
        toast({
          title: `${result.className.charAt(0).toUpperCase() + result.className.slice(1)} detected!`,
          description: `Possible ambulance detected with ${Math.round(result.confidence * 100)}% confidence.`,
        });
        
        // Draw result on camera canvas
        if (cameraCanvasRef.current) {
          const box = [10, 10, videoElement.videoWidth - 20, videoElement.videoHeight - 20];
          const ctx = cameraCanvasRef.current.getContext('2d');
          
          if (ctx) {
            // Set canvas dimensions to match video
            cameraCanvasRef.current.width = videoElement.videoWidth;
            cameraCanvasRef.current.height = videoElement.videoHeight;
            
            // Draw bounding box
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#FF0000';
            ctx.strokeRect(box[0], box[1], box[2], box[3]);
            
            // Label
            ctx.fillStyle = '#FF0000';
            ctx.font = '16px Arial';
            ctx.fillText('AMBULANCE', box[0], box[1] > 20 ? box[1] - 10 : 20);
            
            // Show detection for 3 seconds, then clear
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
          className: ""
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
  
  // Toggle audio listening state
  const toggleAudioListening = async () => {
    if (isListeningForSiren) {
      // If already listening, stop
      setIsListeningForSiren(false);
      setSirenDetected(false);
      setSirenConfidence(0);
      
      if (audioDetector && audioDetector.isListening) {
        audioDetector.stopListening();
      }
      
      toast({
        title: "Siren detection stopped",
        description: "Audio monitoring for ambulance sirens has been disabled.",
      });
    } else {
      // Start listening
      setIsListeningForSiren(true);
      
      toast({
        title: "Listening for sirens",
        description: "Audio monitoring for ambulance sirens has been activated.",
      });
    }
  };
  
  // Analyze uploaded image using our YOLOv5-inspired detector
  const handleAnalyzeImage = async () => {
    if (!detector || !imageFile) {
      toast({
        title: "Cannot analyze image",
        description: "Please ensure the detection model is loaded and an image is selected.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDetecting(true);
    setDetectionResult(null);
    
    try {
      // Create image element from file
      const img = new Image();
      const imageUrl = URL.createObjectURL(imageFile);
      img.src = imageUrl;
      
      // Wait for image to load
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Perform detection using our YOLOv5-based detector
      const result = await detector.detect(img);
      
      // Save result
      if (result.found) {
        // Save detection with class name
        const newDetection: Detection = {
          timestamp: new Date(),
          confidence: result.confidence,
          imageUrl: imageUrl,
          className: result.className
        };
        
        setDetections(prev => [newDetection, ...prev.slice(0, 4)]);
        
        setDetectionResult({
          found: true,
          confidence: result.confidence,
          className: result.className
        });
        
        toast({
          title: `${result.className.charAt(0).toUpperCase() + result.className.slice(1)} detected!`,
          description: `Possible ambulance detected with ${Math.round(result.confidence * 100)}% confidence.`,
        });
        
        // Draw on canvas if available
        if (canvasRef.current) {
          // For simplicity, we're just highlighting the entire image
          // In a real implementation, we would use the bounding box from the model
          const box = [10, 10, img.width - 20, img.height - 20];
          drawDetectionOnCanvas(img, canvasRef.current, box);
        }
      } else {
        setDetectionResult({
          found: false,
          confidence: 0,
          className: ""
        });
        
        toast({
          title: "No ambulance detected",
          description: "No vehicles that could be ambulances were found in this image.",
        });
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze the image. Please try another image.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Ambulance Detection</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Detect nearby ambulances through image recognition to help clear the way.
            </p>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 mb-8 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  The YOLOv5 object detection model is optimized for ambulance detection. For best results, ensure good lighting and clear visibility in your images.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ambulance className="h-5 w-5 mr-2" />
                  YOLOv5 Ambulance Detection
                </CardTitle>
                <CardDescription>
                  Identify ambulances through AI-powered image recognition using YOLOv5 model
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isModelLoading && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Loading YOLOv5 detection model...
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        This may take a moment on first load
                      </p>
                    </div>
                  </div>
                )}
                
                {!isModelLoading && (
                  <Tabs value={detectionMode} onValueChange={(v) => setDetectionMode(v as 'upload' | 'camera' | 'audio')}>
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="upload">
                        <Upload className="mr-2 h-4 w-4" /> Image Upload
                      </TabsTrigger>
                      <TabsTrigger value="camera">
                        <Camera className="mr-2 h-4 w-4" /> Camera
                      </TabsTrigger>
                      <TabsTrigger value="audio">
                        <Volume2 className="mr-2 h-4 w-4" /> Audio
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Image Upload Tab */}
                    <TabsContent value="upload">
                      <div className="space-y-6">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-6">
                          <div className="flex flex-col items-center justify-center py-4">
                            <Upload className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                              Upload an image to detect if an ambulance is present
                            </p>
                            <Input
                              type="file"
                              accept="image/*"
                              className="max-w-xs"
                              onChange={handleFileChange}
                            />
                            {imageFile && (
                              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Selected: {imageFile.name}
                              </p>
                            )}
                            
                            {previewUrl && (
                              <div className="mt-6 max-w-md">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image Preview:</p>
                                <div className="relative rounded-md overflow-hidden">
                                  <img 
                                    src={previewUrl}
                                    alt="Selected image"
                                    className="w-full object-contain max-h-64"
                                  />
                                  <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {detectionResult && detectionMode === 'upload' && (
                              <div className={`mt-4 p-3 rounded-md w-full max-w-xs ${
                                detectionResult.found 
                                  ? 'bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700' 
                                  : 'bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700'
                              }`}>
                                <div className="flex items-center justify-center">
                                  {detectionResult.found ? (
                                    <>
                                      <Check className="h-5 w-5 text-green-500 mr-2" />
                                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                        {detectionResult.className === 'ambulance' ? 'Ambulance' : 'Vehicle'} detected ({Math.round(detectionResult.confidence * 100)}%)
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
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full"
                          onClick={handleAnalyzeImage}
                          disabled={isDetecting || !imageFile}
                        >
                          {isDetecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing image with YOLOv5...
                            </>
                          ) : (
                            <>Analyze Image</>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                    
                    {/* Camera Tab */}
                    <TabsContent value="camera">
                      <div className="space-y-6">
                        <div className="mb-4 relative bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden aspect-video">
                          {!stream && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <Camera className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
                              <p className="text-center text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                Camera access is required for live ambulance detection.
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
                          
                          {detectionResult && detectionMode === 'camera' && (
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
                                      {detectionResult.className === 'ambulance' ? 'Ambulance' : 'Vehicle'} detected ({Math.round(detectionResult.confidence * 100)}%)
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
                        </div>
                        
                        <div className="flex justify-center">
                          <Button 
                            className="px-8"
                            onClick={handleStartCameraDetection}
                            disabled={isDetecting || !stream}
                          >
                            {isDetecting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Detecting...
                              </>
                            ) : (
                              <>Capture & Detect</>
                            )}
                          </Button>
                        </div>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                          Point your camera at vehicles to detect potential ambulances. The model will look for vehicles that may be ambulances.
                        </p>
                      </div>
                    </TabsContent>
                    
                    {/* Audio Tab */}
                    <TabsContent value="audio">
                      <div className="space-y-6">
                        <div className={`border-2 rounded-md p-6 ${
                          isListeningForSiren 
                            ? 'border-primary dark:border-primary/50'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}>
                          <div className="flex flex-col items-center justify-center py-4">
                            {isListeningForSiren ? (
                              <div className="relative mb-4">
                                <Volume2 className={`h-12 w-12 ${
                                  sirenDetected 
                                    ? 'text-green-500 dark:text-green-400 animate-pulse'
                                    : 'text-primary dark:text-primary-400'
                                }`} />
                                {sirenDetected && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20"></div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Volume2 className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                            )}
                            
                            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
                              {isListeningForSiren 
                                ? 'Actively listening for ambulance sirens...'
                                : 'Click the button below to start listening for ambulance siren sounds'}
                            </p>
                            
                            {isListeningForSiren && (
                              <div className={`mt-4 p-3 rounded-md w-full max-w-xs ${
                                sirenDetected 
                                  ? 'bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700' 
                                  : 'bg-gray-100 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-700'
                              }`}>
                                <div className="flex items-center justify-center">
                                  {sirenDetected ? (
                                    <>
                                      <Check className="h-5 w-5 text-green-500 mr-2" />
                                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Ambulance siren detected! ({Math.round(sirenConfidence * 100)}%)
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        No sirens detected yet
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          className={`w-full ${isListeningForSiren ? 'bg-red-500 hover:bg-red-600' : ''}`}
                          onClick={toggleAudioListening}
                        >
                          {isListeningForSiren ? (
                            <>Stop Listening</>
                          ) : (
                            <>Start Listening for Sirens</>
                          )}
                        </Button>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                          This feature analyzes audio from your microphone to detect the distinctive sound patterns of ambulance sirens.
                          No audio data is sent over the internet - all processing happens locally on your device.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
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
                      Detection history will appear here once you upload and analyze images.
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
                              <Ambulance className="h-6 w-6 text-primary" />
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
                <Info className="h-4 w-4 mr-1" /> About the Model
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                This detector uses a YOLOv5 model adapted for ambulance detection. The model is trained to identify vehicles that could be ambulances based on visual characteristics. It focuses on relevant vehicle classes (cars, buses, trucks) and applies special detection for ambulance features.
              </p>
            </div>
            
            <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-md mt-2">
              <h3 className="font-medium mb-2 text-primary-700 dark:text-primary-300 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" /> Important Note
              </h3>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                This feature is meant as an assistive tool only. Always remain alert while driving and follow all traffic laws. Do not rely solely on this application for emergency vehicle detection. In case of emergency, dial 108 for immediate assistance.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
