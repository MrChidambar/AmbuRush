import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";

export default function AmbulanceDetectionPage() {
  const [html, setHtml] = useState("");
  
  useEffect(() => {
    // Load the HTML file content
    fetch("/ambulance-detector-no-audio.html")
      .then(response => response.text())
      .then(data => {
        setHtml(data);
      })
      .catch(error => {
        console.error("Error loading HTML file:", error);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <div className="flex-grow">
        {html ? (
          <iframe
            srcDoc={html}
            title="Ambulance Detection"
            className="w-full h-full min-h-[calc(100vh-200px)]"
            frameBorder="0"
          />
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}