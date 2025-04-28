import { useState, useRef, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Upload, AlertTriangle, Check, XCircle } from "lucide-react";

// Import TensorFlow.js
import * as tf from '@tensorflow/tfjs';

interface Detection {
  timestamp: Date;
  confidence: number;
  imageUrl?: string;
}

export default function AmbulanceDetectionPage() {
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionMode, setDetectionMode] = useState<'upload' | 'camera'>('camera');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [detectionResult, setDetectionResult] = useState<{found: boolean, confidence: number} | null>(null);
  
  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Load YOLO model
  useEffect(() => {
    async function loadModel() {
      try {
        setIsModelLoading(true);
        // Load COCO-SSD model from TensorFlow.js
        // This is a pre-trained model that can detect common objects including ambulances
        const loadedModel = await tf.loadGraphModel(
          'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1',
          { fromTFHub: true }
        );
        setModel(loadedModel);
        toast({
          title: "Detection model loaded",
          description: "The ambulance detection model is now ready to use.",
        });
      } catch (error) {
        console.error('Failed to load model:', error);
        toast({
          title: "Model loading failed",
          description: "Could not load the detection model. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsModelLoading(false);
      }
    }
    
    loadModel();
    
    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  // Handle camera stream
  const startCameraStream = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
        }
        
        return true;
      } else {
        throw new Error('Camera access not supported');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera access failed",
        description: "Could not access your camera. Please check permissions.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle camera detection
  const handleStartCameraDetection = async () => {
    if (!model) {
      toast({
        title: "Model not loaded",
        description: "Please wait for the detection model to load.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDetecting(true);
    setDetectionResult(null);
    
    // Start camera if not already started
    if (!stream) {
      const success = await startCameraStream();
      if (!success) {
        setIsDetecting(false);
        return;
      }
    }
    
    // Begin detection with video stream
    detectFromVideoStream();
  };

  // Process video frames for detection
  const detectFromVideoStream = async () => {
    if (!model || !videoRef.current || !canvasRef.current || !videoRef.current.readyState) {
      setIsDetecting(false);
      return;
    }
    
    try {
      // Get video frame
      const tensor = tf.browser.fromPixels(videoRef.current);
      
      // Run detection
      const predictions = await model.executeAsync(
        tensor.expandDims(0)
      ) as tf.Tensor[];
      
      // Process results
      const boxes = await predictions[1].arraySync() as number[][][];
      const scores = await predictions[2].arraySync() as number[][];
      const classes = await predictions[3].arraySync() as number[][];
      
      // Draw on canvas
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Look for ambulance (class 6 in COCO-SSD) or vehicle classes
        let highestConfidence = 0;
        let foundAmbulance = false;
        
        for (let i = 0; i < scores[0].length; i++) {
          if (scores[0][i] > 0.5) {
            const classId = classes[0][i];
            // Class 6 is bus, 3 is car, 8 is truck in COCO-SSD
            // We're using these as proxies for ambulance detection
            if ([3, 6, 8].includes(classId)) {
              const confidence = scores[0][i];
              if (confidence > highestConfidence) {
                highestConfidence = confidence;
                foundAmbulance = true;
              }
              
              // Draw bounding box
              const [y, x, height, width] = boxes[0][i];
              const startX = x * canvasRef.current.width;
              const startY = y * canvasRef.current.height;
              const rectWidth = width * canvasRef.current.width - startX;
              const rectHeight = height * canvasRef.current.height - startY;
              
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#FF0000';
              ctx.strokeRect(startX, startY, rectWidth, rectHeight);
              
              // Label
              ctx.fillStyle = '#FF0000';
              ctx.font = '16px Arial';
              ctx.fillText(
                `Vehicle: ${Math.round(confidence * 100)}%`, 
                startX, 
                startY > 10 ? startY - 5 : 10
              );
            }
          }
        }
        
        if (foundAmbulance) {
          // Save detection
          const newDetection: Detection = {
            timestamp: new Date(),
            confidence: highestConfidence,
          };
          
          setDetections(prev => [newDetection, ...prev.slice(0, 4)]);
          
          setDetectionResult({
            found: true,
            confidence: highestConfidence
          });
          
          toast({
            title: "Vehicle detected!",
            description: `Possible ambulance detected with ${Math.round(highestConfidence * 100)}% confidence.`,
          });
          
          // Stop detection
          setIsDetecting(false);
          return;
        }
      }
      
      // Cleanup tensors
      tf.dispose(predictions);
      tensor.dispose();
      
      // Continue detection if no ambulance found
      if (isDetecting) {
        requestAnimationFrame(detectFromVideoStream);
      }
      
    } catch (error) {
      console.error('Detection error:', error);
      setIsDetecting(false);
      toast({
        title: "Detection error",
        description: "An error occurred during detection. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImageFile(files[0]);
      setDetectionResult(null);
    }
  };
  
  // Analyze uploaded image
  const handleAnalyzeImage = async () => {
    if (!model || !imageFile) {
      toast({
        title: "Cannot analyze image",
        description: "Please ensure a model is loaded and an image is selected.",
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
      
      // Convert to tensor
      const tensor = tf.browser.fromPixels(img);
      
      // Run detection
      const predictions = await model.executeAsync(
        tensor.expandDims(0)
      ) as tf.Tensor[];
      
      // Process results
      const scores = await predictions[2].arraySync() as number[][];
      const classes = await predictions[3].arraySync() as number[][];
      
      // Look for ambulance (class 6 in COCO-SSD) or vehicle classes
      let highestConfidence = 0;
      let foundAmbulance = false;
      
      for (let i = 0; i < scores[0].length; i++) {
        if (scores[0][i] > 0.5) {
          const classId = classes[0][i];
          // Class 6 is bus, 3 is car, 8 is truck in COCO-SSD
          // We're using these as proxies for ambulance detection
          if ([3, 6, 8].includes(classId)) {
            const confidence = scores[0][i];
            if (confidence > highestConfidence) {
              highestConfidence = confidence;
              foundAmbulance = true;
            }
          }
        }
      }
      
      // Cleanup tensors
      tf.dispose(predictions);
      tensor.dispose();
      
      // Save result
      if (foundAmbulance) {
        // Save detection
        const newDetection: Detection = {
          timestamp: new Date(),
          confidence: highestConfidence,
          imageUrl: imageUrl
        };
        
        setDetections(prev => [newDetection, ...prev.slice(0, 4)]);
        
        setDetectionResult({
          found: true,
          confidence: highestConfidence
        });
        
        toast({
          title: "Vehicle detected!",
          description: `Possible ambulance detected with ${Math.round(highestConfidence * 100)}% confidence.`,
        });
      } else {
        setDetectionResult({
          found: false,
          confidence: 0
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
                  The object detection model is using generic vehicle detection as a proxy for ambulances. For best results, ensure good lighting and clear visibility.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Ambulance Detection
                </CardTitle>
                <CardDescription>
                  Identify ambulances through AI-powered image recognition
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isModelLoading && (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Loading detection model...
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        This may take a moment on first load
                      </p>
                    </div>
                  </div>
                )}
                
                {!isModelLoading && (
                  <Tabs value={detectionMode} onValueChange={(v) => setDetectionMode(v as 'upload' | 'camera')}>
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="camera">
                        <Camera className="mr-2 h-4 w-4" /> Camera
                      </TabsTrigger>
                      <TabsTrigger value="upload">
                        <Upload className="mr-2 h-4 w-4" /> Upload
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="camera">
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
                          ref={canvasRef}
                          className="absolute inset-0 w-full h-full"
                        />
                        
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
                                    Vehicle detected ({Math.round(detectionResult.confidence * 100)}%)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                                    No vehicles detected
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
                          disabled={isDetecting}
                        >
                          {isDetecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Detecting...
                            </>
                          ) : (
                            <>Start Camera Detection</>
                          )}
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                        Point your camera at vehicles to detect potential ambulances. The model will look for vehicles that may be ambulances.
                      </p>
                    </TabsContent>
                    
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
                            
                            {detectionResult && (
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
                                        Vehicle detected ({Math.round(detectionResult.confidence * 100)}%)
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                                        No vehicles detected
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
                              Analyzing image...
                            </>
                          ) : (
                            <>Analyze Image</>
                          )}
                        </Button>
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
                      Detection history will appear here once you start using the detection features.
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
                              <Camera className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm font-medium">
                              Vehicle detected ({Math.round(detection.confidence * 100)}% confidence)
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
            
            <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-md mt-6">
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
