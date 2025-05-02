import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AmbulanceDetectionPage() {
  const [activeDetector, setActiveDetector] = useState<"visual" | "audio" | null>(null);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <div className="flex-grow p-6">
        {!activeDetector ? (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">Ambulance Detection System</h1>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Visual Detection</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Detect ambulances through image recognition.</p>
                  <Button 
                    className="w-full" 
                    onClick={() => setActiveDetector("visual")}
                  >
                    Launch Visual Detector
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Audio Detection</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Detect ambulance sirens through audio analysis.</p>
                  <Button 
                    className="w-full"
                    onClick={() => setActiveDetector("audio")}
                  >
                    Launch Audio Detector
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <div className="flex justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => setActiveDetector(null)}
              >
                ← Back to Selection
              </Button>
            </div>
            
            <iframe
              src={activeDetector === "visual" 
                ? "/ambulance-detector-no-audio.html" 
                : "/ambulance-audio-detection.html"}
              title={activeDetector === "visual" ? "Visual Detection" : "Audio Detection"}
              className="w-full h-[calc(100vh-220px)] border rounded"
            />
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}