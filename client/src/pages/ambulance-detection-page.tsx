import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Upload, VolumeX, Volume2, AlertTriangle } from "lucide-react";

export default function AmbulanceDetectionPage() {
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [detectionMode, setDetectionMode] = useState<'upload' | 'camera'>('camera');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Mock function for demonstration purposes
  const handleStartDetection = () => {
    setIsDetecting(true);
    
    // Simulate processing
    setTimeout(() => {
      setIsDetecting(false);
      toast({
        title: "Detection feature coming soon",
        description: "This feature is currently under development. Stay tuned for updates!",
      });
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImageFile(files[0]);
    }
  };

  const toggleAudioDetection = () => {
    setIsListening(!isListening);
    
    if (!isListening) {
      toast({
        title: "Audio detection activated",
        description: "Listening for ambulance sirens...",
      });
    } else {
      toast({
        title: "Audio detection stopped",
        description: "No longer listening for ambulance sirens.",
      });
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
              Detect nearby ambulances through visual or audio recognition to help clear the way.
            </p>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 mb-8 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  This feature is currently in development. Some functionality may be limited.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Visual Detection
                </CardTitle>
                <CardDescription>
                  Identify ambulances through image recognition
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-md aspect-video flex flex-col items-center justify-center">
                      <Camera className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        Camera access is required for live ambulance detection.
                      </p>
                      <Button 
                        className="mt-4"
                        onClick={handleStartDetection}
                        disabled={isDetecting}
                      >
                        {isDetecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>Start Camera Detection</>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Point your camera at the road to detect approaching ambulances. The app will alert you when an ambulance is detected.
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="upload">
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-4">
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
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full"
                        onClick={handleStartDetection}
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
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Volume2 className="h-5 w-5 mr-2" />
                  Audio Detection
                </CardTitle>
                <CardDescription>
                  Detect ambulance sirens through audio recognition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 mb-6 bg-gray-100 dark:bg-gray-800 rounded-md aspect-video flex flex-col items-center justify-center">
                  <div className="h-32 w-32 mb-4 rounded-full border-4 border-secondary flex items-center justify-center relative">
                    <button 
                      className={`h-24 w-24 rounded-full ${isListening ? 'bg-secondary animate-pulse' : 'bg-gray-300 dark:bg-gray-700'} flex items-center justify-center transition-all`}
                      onClick={toggleAudioDetection}
                    >
                      {isListening ? (
                        <Volume2 className="h-12 w-12 text-white" />
                      ) : (
                        <VolumeX className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                    {isListening && (
                      <div className="absolute inset-0 rounded-full border-4 border-secondary animate-ping opacity-20"></div>
                    )}
                  </div>
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    {isListening 
                      ? "Actively listening for ambulance sirens..." 
                      : "Press the button to start listening for ambulance sirens"}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                    <h3 className="font-medium mb-2">How it works</h3>
                    <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
                      <li>Click the button to activate audio detection</li>
                      <li>Keep your device unmuted with adequate volume</li>
                      <li>The app will analyze ambient sound for siren patterns</li>
                      <li>You'll receive an alert when an ambulance siren is detected</li>
                    </ol>
                  </div>
                  
                  <div className="p-4 bg-primary-50 dark:bg-primary-950 rounded-md">
                    <h3 className="font-medium mb-2 text-primary-700 dark:text-primary-300 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" /> Important Note
                    </h3>
                    <p className="text-sm text-primary-600 dark:text-primary-400">
                      This feature is meant as an assistive tool only. Always remain alert while driving and follow all traffic laws. Do not rely solely on this application for emergency vehicle detection.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Detection History</CardTitle>
              <CardDescription>
                Recent ambulance detections in your area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No recent detections available.
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Detection history will appear here once you start using the detection features.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
