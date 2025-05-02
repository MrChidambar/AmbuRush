import { useState, useRef, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, Loader2, Check, Ambulance, Info, Upload, X, Bell 
} from "lucide-react";

// Detection history interface
interface Detection {
  timestamp: Date;
  confidence: number;
  type: string;
}

export default function AmbulanceDetectionPage() {
  const { toast } = useToast();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State variables
  const [model, setModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [alertBannerVisible, setAlertBannerVisible] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.6);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Load COCO-SSD model on component mount
  useEffect(() => {
    // Dynamically load TensorFlow.js and COCO-SSD model
    const loadScripts = async () => {
      try {
        // Load TensorFlow.js script
        const tfScript = document.createElement('script');
        tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0";
        tfScript.async = true;
        
        // Load COCO-SSD model script
        const cocoSsdScript = document.createElement('script');
        cocoSsdScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2";
        cocoSsdScript.async = true;
        
        document.body.appendChild(tfScript);
        
        // Wait for TensorFlow to load before loading COCO-SSD
        tfScript.onload = () => {
          document.body.appendChild(cocoSsdScript);
          
          // Initialize model once COCO-SSD is loaded
          cocoSsdScript.onload = async () => {
            try {
              // @ts-ignore - cocoSsd is loaded dynamically
              const loadedModel = await cocoSsd.load();
              setModel(loadedModel);
              console.log('Model loaded successfully');
              setIsModelLoading(false);
              
              toast({
                title: "Detection model ready",
                description: "The ambulance detection model has been loaded successfully.",
              });
            } catch (error) {
              console.error('Failed to load model:', error);
              setIsModelLoading(false);
              
              toast({
                title: "Model loading failed",
                description: "Could not load the detection model. Please try again later.",
                variant: "destructive",
              });
            }
          };
        };
      } catch (error) {
        console.error('Error loading scripts:', error);
        setIsModelLoading(false);
        
        toast({
          title: "Model loading failed",
          description: "Could not load required libraries. Please try again later.",
          variant: "destructive",
        });
      }
    };
    
    loadScripts();
    
    // Cleanup function
    return () => {
      // Stop any ongoing detection
      setIsDetecting(false);
    };
  }, [toast]);
  
  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Detect objects in the uploaded image
  const detectObjectsInImage = async () => {
    if (!model || !selectedImage) return;
    
    setIsDetecting(true);
    
    try {
      const img = new Image();
      img.src = selectedImage;
      
      img.onload = async () => {
        try {
          // Run detection
          const predictions = await model.detect(img);
          console.log('Detection results:', predictions);
          
          // Process and display results
          processPredictions(predictions, 'image');
          
          // Draw bounding boxes on image
          if (canvasRef.current) {
            drawBoundingBoxes(img, predictions);
          }
        } catch (error) {
          console.error('Error during detection:', error);
          toast({
            title: "Detection failed",
            description: "An error occurred while analyzing the image.",
            variant: "destructive",
          });
        } finally {
          setIsDetecting(false);
        }
      };
    } catch (error) {
      console.error('Error loading image:', error);
      setIsDetecting(false);
      
      toast({
        title: "Image loading failed",
        description: "Could not load the selected image for analysis.",
        variant: "destructive",
      });
    }
  };
  
  // Process detection predictions
  const processPredictions = (predictions: any[], source: string) => {
    // Filter for ambulances and vehicles that could be ambulances
    const relevantPredictions = predictions.filter(prediction => {
      const { class: className, score } = prediction;
      return (
        score >= confidenceThreshold && 
        (className === 'ambulance' || 
         className === 'car' || 
         className === 'truck' || 
         className === 'bus')
      );
    });
    
    if (relevantPredictions.length > 0) {
      // Show alert for ambulance detection
      setAlertBannerVisible(true);
      
      // Add to detection history
      const newDetections = relevantPredictions.map(prediction => ({
        timestamp: new Date(),
        confidence: prediction.score,
        type: prediction.class === 'ambulance' ? 'ambulance' : 'vehicle'
      }));
      
      setDetections(prev => [...newDetections, ...prev].slice(0, 10));
      
      // Show toast notification
      const highestConfidence = Math.max(...relevantPredictions.map(p => p.score));
      toast({
        title: "Ambulance Detected!",
        description: `Potential ambulance detected with ${Math.round(highestConfidence * 100)}% confidence.`,
      });
    } else {
      // No relevant detections
      setAlertBannerVisible(false);
      
      toast({
        title: "No ambulance detected",
        description: "No potential ambulances were found in this image.",
      });
    }
  };
  
  // Draw bounding boxes on canvas
  const drawBoundingBoxes = (imgElement: HTMLImageElement, predictions: any[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match image
    canvas.width = imgElement.width;
    canvas.height = imgElement.height;
    
    // Draw image first
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
    
    // Draw bounding boxes for relevant predictions
    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;
      const { class: className, score } = prediction;
      
      if (score >= confidenceThreshold) {
        // Determine color based on class
        let color = '#00D100'; // Green for ambulance
        if (className !== 'ambulance') {
          // Vehicles that could be ambulances
          if (className === 'car' || className === 'truck' || className === 'bus') {
            color = '#DC2626'; // Red for potential ambulances
          } else {
            color = '#3B82F6'; // Blue for other objects
          }
        }
        
        // Draw bounding box
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, width, height);
        
        // Draw background for label
        ctx.fillStyle = color;
        const textWidth = ctx.measureText(`${className} ${Math.round(score * 100)}%`).width;
        ctx.fillRect(x, y - 25, textWidth + 10, 25);
        
        // Draw label text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.fillText(
          `${className} ${Math.round(score * 100)}%`,
          x + 5,
          y - 8
        );
      }
    });
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
          
          {/* Alert banner for ambulance detection */}
          {alertBannerVisible && (
            <div className="bg-red-600 text-white p-4 rounded-md mb-6 flex items-center justify-between animate-pulse">
              <div className="flex items-center">
                <Bell className="h-6 w-6 mr-4" />
                <div>
                  <h3 className="font-bold text-lg">Ambulance Detected!</h3>
                  <p>A potential ambulance has been detected in the image.</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="text-white hover:bg-red-700"
                onClick={() => setAlertBannerVisible(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Detection Panel */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ambulance className="h-5 w-5 mr-2" />
                    Ambulance Detection
                  </CardTitle>
                  <CardDescription>
                    Identify ambulances through AI-powered image recognition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isModelLoading ? (
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
                  ) : (
                    <div className="space-y-6">
                      {/* Image Upload */}
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
                        <div className="flex flex-col items-center">
                          <Upload className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                          <p className="text-center mb-4">
                            Upload an image to detect if an ambulance is present
                          </p>
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="max-w-xs cursor-pointer"
                          />
                        </div>
                      </div>
                      
                      {/* Image Preview */}
                      {selectedImage && (
                        <div className="relative bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                          <div className="relative w-full aspect-video">
                            <img 
                              src={selectedImage} 
                              alt="Selected for detection" 
                              className="w-full h-full object-contain"
                            />
                            <canvas 
                              ref={canvasRef} 
                              className="absolute top-0 left-0 w-full h-full"
                            />
                          </div>
                          <Button
                            className="mt-4 w-full"
                            disabled={isDetecting}
                            onClick={detectObjectsInImage}
                          >
                            {isDetecting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing image...
                              </>
                            ) : (
                              <>Detect Ambulances</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Color Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detection Color Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                      <span className="text-sm">Ambulance</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
                      <span className="text-sm">Vehicle (potential ambulance)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                      <span className="text-sm">Other objects</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Detection History */}
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center justify-between">
                      <span>Detection History</span>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${model ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <span>{model ? 'Model Loaded' : 'Model Loading'}</span>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detections.length === 0 ? (
                    <div className="text-center py-16">
                      <Ambulance className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No detections yet</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Upload and analyze an image to detect ambulances
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {detections.map((detection, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                              detection.type === 'ambulance' 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                            }`}></div>
                            <span className="font-medium">
                              {detection.type.charAt(0).toUpperCase() + detection.type.slice(1)}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between">
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded-full">
                              {Math.round(detection.confidence * 100)}% confidence
                            </span>
                            <span className="text-xs text-gray-500">
                              {detection.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Information Cards */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center mb-2">
                <Info className="h-4 w-4 mr-2" /> How It Works
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                This detector uses a pre-trained object detection model to identify vehicles in images. 
                The system is optimized to detect cars, trucks, and buses that could potentially be ambulances. 
                For best results, upload clear images with good lighting.
              </p>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
              <h3 className="font-semibold text-amber-700 dark:text-amber-300 flex items-center mb-2">
                <AlertTriangle className="h-4 w-4 mr-2" /> Important Note
              </h3>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This feature is meant as an assistive tool only. Always remain alert while driving and follow all traffic laws. 
                Do not rely solely on this application for emergency vehicle detection. 
                In case of emergency, dial 108 for immediate assistance.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
