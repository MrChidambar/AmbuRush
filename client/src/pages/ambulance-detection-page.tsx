import { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";

export default function AmbulanceDetectionPage() {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // This component is basically a wrapper that injects the HTML content
    // from the provided file directly into the page
    
    // Insert the styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      :root {
        --primary: #1d4ed8;
        --primary-light: #3b82f6;
        --primary-dark: #1e40af;
        --secondary: #4f46e5;
        --danger: #dc2626;
        --danger-light: #ef4444;
        --success: #10b981;
        --success-light: #22c55e;
        --warning: #eab308;
        --bg-gradient: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        --card-bg: #ffffff;
        --text-dark: #334155;
        --text-muted: #64748b;
        --border-light: #e2e8f0;
        --radius-sm: 6px;
        --radius-md: 8px;
        --radius-lg: 12px;
        --shadow-sm: 0 4px 8px rgba(0,0,0,0.1);
        --shadow-md: 0 8px 20px rgba(0,0,0,0.1);
        --shadow-lg: 0 12px 24px rgba(0,0,0,0.15);
      }
      
      * {
        box-sizing: border-box;
      }
      
      .ambulance-detection-wrapper { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        margin: 0;
        padding: 0;
        background: var(--bg-gradient);
        min-height: 100vh;
        color: var(--text-dark);
        line-height: 1.5;
      }
      
      .container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 20px;
      }
      
      header {
        text-align: center;
        margin-bottom: 30px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        backdrop-filter: blur(10px);
      }
      
      h1 {
        background: linear-gradient(90deg, var(--primary-dark), var(--primary-light));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-top: 0;
        font-weight: 700;
        font-size: 2.5rem;
        line-height: 1.2;
      }
      
      .app-description {
        max-width: 800px;
        margin: 0 auto 10px;
        text-align: center;
        color: var(--text-muted);
        font-size: 1.1rem;
      }
      
      .main-content {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        gap: 24px;
      }
      
      @media (max-width: 768px) {
        .main-content {
          grid-template-columns: 1fr;
        }
      }
      
      .card {
        background: var(--card-bg);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        padding: 20px;
        margin-bottom: 24px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }
      
      .card-header {
        border-bottom: 1px solid var(--border-light);
        padding-bottom: 15px;
        margin-bottom: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .card-header h2 {
        margin: 0;
        font-size: 1.5rem;
        background: linear-gradient(90deg, var(--primary-dark), var(--primary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .video-detection-container {
        display: flex;
        gap: 20px;
        flex-direction: column;
      }
      
      .video-container {
        position: relative;
        width: 100%;
        height: 350px;
        overflow: hidden;
        background: #f1f5f9;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
      }
      
      #video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      #canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      
      .controls {
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .btn {
        display: inline-block;
        background: linear-gradient(90deg, var(--primary-dark), var(--primary-light));
        color: white;
        padding: 12px 24px;
        border-radius: var(--radius-sm);
        text-decoration: none;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 6px rgba(29, 78, 216, 0.2);
      }
      
      .btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 10px rgba(29, 78, 216, 0.3);
      }
      
      .btn:active:not(:disabled) {
        transform: translateY(0);
      }
      
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .btn-danger {
        background: linear-gradient(90deg, #b91c1c, #ef4444);
        box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);
      }
      
      .btn-danger:hover:not(:disabled) {
        box-shadow: 0 6px 10px rgba(220, 38, 38, 0.3);
      }
      
      .loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: var(--text-dark);
        font-weight: 600;
        background: rgba(255, 255, 255, 0.9);
        padding: 20px 30px;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        backdrop-filter: blur(5px);
        z-index: 10;
      }
      
      .loader {
        display: inline-block;
        width: 30px;
        height: 30px;
        border: 3px solid rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        border-top-color: var(--primary-light);
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
      }
      
      .settings {
        margin-top: 20px;
      }
      
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .form-check {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
      }
      
      .form-check input[type="checkbox"] {
        appearance: none;
        width: 18px;
        height: 18px;
        border: 2px solid var(--primary-light);
        border-radius: 4px;
        margin-right: 10px;
        position: relative;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .form-check input[type="checkbox"]:checked {
        background-color: var(--primary-light);
      }
      
      .form-check input[type="checkbox"]:checked::after {
        content: "✓";
        position: absolute;
        color: white;
        font-size: 12px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      
      .form-check input[type="radio"] {
        appearance: none;
        width: 18px;
        height: 18px;
        border: 2px solid var(--primary-light);
        border-radius: 50%;
        margin-right: 10px;
        position: relative;
        cursor: pointer;
        transition: border 0.2s;
      }
      
      .form-check input[type="radio"]:checked {
        border: 5px solid var(--primary-light);
      }
      
      .range-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: #e2e8f0;
        outline: none;
      }
      
      .range-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--primary);
        cursor: pointer;
        transition: transform 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .range-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      
      .detection-list {
        margin-top: 20px;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 10px;
      }
      
      .detection-list::-webkit-scrollbar {
        width: 6px;
      }
      
      .detection-list::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 10px;
      }
      
      .detection-list::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      
      .detection-list::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      
      .detection-item {
        background: #f8fafc;
        border-radius: var(--radius-md);
        padding: 15px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-left: 4px solid var(--danger-light);
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        animation: fadeIn 0.3s ease-in-out;
      }
      
      .detection-type {
        font-weight: 600;
        color: #b91c1c;
      }
      
      .detection-time {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin-top: 4px;
      }
      
      .detection-info {
        display: flex;
        flex-direction: column;
      }
      
      .detection-distance {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin-top: 2px;
      }
      
      .detection-confidence {
        background: #e0f2fe;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        color: #0369a1;
      }
      
      .detection-confidence.high {
        background: #dcfce7;
        color: #166534;
      }
      
      .status-indicator {
        display: flex;
        align-items: center;
      }
      
      .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
        transition: all 0.3s ease;
      }
      
      .status-dot.active {
        background-color: var(--success);
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
      }
      
      .status-dot.inactive {
        background-color: var(--danger-light);
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      }
      
      .alert-banner {
        background: linear-gradient(90deg, #b91c1c, var(--danger-light));
        color: white;
        padding: 15px;
        border-radius: var(--radius-md);
        margin-bottom: 20px;
        display: none;
        align-items: center;
        justify-content: space-between;
        animation: fadeIn 0.3s ease-in-out;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
      }
      
      .alert-banner.show {
        display: flex;
      }
      
      .alert-content {
        display: flex;
        align-items: center;
      }
      
      .alert-icon {
        margin-right: 15px;
        font-size: 24px;
      }
      
      .alert-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
      }
      
      .model-status {
        font-weight: normal;
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-left: 10px;
        opacity: 0.8;
      }
      
      .recognition-key {
        margin-top: 20px;
        background: #f8fafc;
        border-radius: var(--radius-md);
        padding: 15px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      }
      
      .recognition-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
      }
      
      .recognition-color {
        width: 18px;
        height: 18px;
        border-radius: 3px;
        margin-right: 10px;
        border: 2px solid rgba(0,0,0,0.1);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .recognition-text {
        font-size: 0.9rem;
      }
      
      .ambulance-features {
        margin-top: 20px;
        padding: 18px;
        background: #f1f7fd;
        border-radius: var(--radius-md);
        border-left: 4px solid var(--danger-light);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      
      .feature-title {
        font-weight: 600;
        margin-bottom: 12px;
      }
      
      .feature-list {
        margin: 0;
        padding-left: 20px;
      }
      
      .feature-list li {
        margin-bottom: 8px;
        color: var(--text-muted);
      }
      
      .feature-list li strong {
        color: var(--text-dark);
      }
      
      /* Detection indicator light */
      .detection-light-container {
        display: flex;
        align-items: center;
        background: #f8fafc;
        border-radius: var(--radius-md);
        padding: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        margin-bottom: 15px;
      }
      
      .detection-light-container.active {
        background: #f0fdf4;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
      }
      
      .detection-light {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        margin-right: 15px;
        background-color: var(--danger-light); /* Default red */
        box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
        transition: all 0.5s ease;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .detection-light.active {
        background-color: var(--success-light); /* Green when active */
        box-shadow: 0 0 20px rgba(34, 197, 94, 0.8);
      }
      
      .detection-light-icon {
        color: white;
        font-size: 28px;
        font-weight: bold;
      }
      
      .detection-light-status {
        flex: 1;
      }
      
      .detection-light-status h3 {
        margin: 0 0 5px 0;
        background: linear-gradient(90deg, #334155, #475569);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .detection-light-status p {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.9rem;
      }
      
      /* Small ambulance indicator */
      .small-ambulance-indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: rgba(220, 38, 38, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: bold;
        display: none;
        box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
        z-index: 5;
      }
      
      .small-ambulance-indicator.show {
        display: block;
        animation: blink 1s infinite;
      }
      
      /* Motion tracking path */
      .motion-path {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 3;
      }
      
      /* Animation for light pulse */
      @keyframes lightPulse {
        0% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
        50% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.8); }
        100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
      }
      
      .detection-light.pulse {
        animation: lightPulse 1.5s infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes blink {
        0% { opacity: 1; }
        50% { opacity: 0.6; }
        100% { opacity: 1; }
      }
      
      /* Animation for distance warning */
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .pulse {
        animation: pulse 1s infinite;
      }
      
      /* Info badge for tracking */
      .tracking-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background-color: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 5;
        display: none;
      }
      
      .tracking-badge.show {
        display: block;
      }
    `;
    document.head.appendChild(styleElement);

    // Create a script element to load the TensorFlow and COCO-SSD models 
    const loadTensorFlow = document.createElement('script');
    loadTensorFlow.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0";
    loadTensorFlow.async = true;
    
    const loadCocoSsd = document.createElement('script');
    loadCocoSsd.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2";
    loadCocoSsd.async = true;
    
    // Add the script elements to the document head
    document.head.appendChild(loadTensorFlow);
    
    loadTensorFlow.onload = () => {
      document.head.appendChild(loadCocoSsd);
      cocoSsd.onload = () => {
        setLoaded(true);
        toast({
          title: "Detection libraries loaded",
          description: "The ambulance detection system is ready to use."
        });
      };
    };

    return () => {
      // Cleanup function
      document.head.removeChild(styleElement);
      if (document.head.contains(loadTensorFlow)) {
        document.head.removeChild(loadTensorFlow);
      }
      if (document.head.contains(loadCocoSsd)) {
        document.head.removeChild(loadCocoSsd);
      }
    };
  }, [toast]);

  // When component mounts, inject the JavaScript from the HTML file
  useEffect(() => {
    const container = document.getElementById('detection-container');
    if (!container) return;

    if (!loaded) return;

    // Initialize application
    const script = document.createElement('script');
    script.innerHTML = `
      // DOM Elements
      const video = document.getElementById('video');
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const motionPath = document.getElementById('motionPath');
      const motionCtx = motionPath.getContext('2d');
      const startCameraBtn = document.getElementById('startCamera');
      const stopCameraBtn = document.getElementById('stopCamera');
      const cameraStatus = document.getElementById('cameraStatus');
      const cameraStatusText = document.getElementById('cameraStatusText');
      const alertBanner = document.getElementById('alertBanner');
      const alertDetails = document.getElementById('alertDetails');
      const alertClose = document.getElementById('alertClose');
      const thresholdSlider = document.getElementById('thresholdSlider');
      const thresholdValue = document.getElementById('thresholdValue');
      const detectionList = document.getElementById('detectionList');
      const loadingIndicator = document.getElementById('loadingIndicator');
      const modelStatus = document.getElementById('modelStatus');
      const detectionLight = document.getElementById('detectionLight');
      const detectionLightContainer = document.getElementById('detectionLightContainer');
      const detectionLightStatus = document.getElementById('detectionLightStatus');
      const smallAmbulanceIndicator = document.getElementById('smallAmbulanceIndicator');
      const trackingBadge = document.getElementById('trackingBadge');
      const fileInput = document.getElementById('fileInput');
      const imagePreview = document.getElementById('imagePreview');
      const analyzeBtn = document.getElementById('analyzeBtn');

      // App State
      const state = {
        model: null,
        modelLoaded: false,
        cameraActive: false,
        detections: [],
        lastAmbulanceDetection: 0,
        trackedObjects: [],
        lineWidth: 8, // Default thick lines
        isAmbulanceDetected: false,
        detectionTimeout: null,
        smallAmbulanceTimeout: null,
        pathHistory: [], // For motion tracking
        selectedImage: null,
        settings: {
          threshold: 60,
          enableNotifications: true,
          showDistanceEstimation: true,
          enableExtraAccuracy: true,
          enableSmallDetection: true,
          enableTracking: true
        }
      };

      // Classes we're interested in from COCO-SSD for detecting potential ambulances
      const targetClasses = ['car', 'truck', 'bus'];

      // Colors for different detected objects
      const colors = {
        ambulance: '#22c55e', // Green
        vehicle: '#dc2626', // Red
        other: '#3b82f6', // Blue
      };

      // Load COCO-SSD model
      async function loadModel() {
        try {
          loadingIndicator.style.display = 'block';
          modelStatus.textContent = 'Loading...';
          
          // Load model
          state.model = await cocoSsd.load();
          state.modelLoaded = true;
          
          // Update UI
          loadingIndicator.style.display = 'none';
          modelStatus.textContent = 'Ready';
          
          // Update status indicator
          document.getElementById('modelStatusIndicator').className = 'status-dot active';
          
          console.log('Model loaded successfully');
          
          // Enable detection button
          analyzeBtn.disabled = false;
          
          return true;
        } catch (error) {
          console.error('Error loading model:', error);
          loadingIndicator.style.display = 'none';
          modelStatus.textContent = 'Failed to load';
          analyzeBtn.disabled = true;
          return false;
        }
      }

      // Handle file upload
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          // Read the selected file
          const reader = new FileReader();
          reader.onload = function(event) {
            // Set selected image
            state.selectedImage = event.target.result;
            
            // Display image preview
            imagePreview.src = state.selectedImage;
            imagePreview.style.display = 'block';
            
            // Clear previous detection
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Enable analyze button
            analyzeBtn.disabled = false;
          };
          reader.readAsDataURL(file);
        });
      }

      // Analyze image
      if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
          if (!state.modelLoaded || !state.selectedImage) return;
          
          analyzeBtn.disabled = true;
          analyzeBtn.innerHTML = '<span class="loader" style="width: 20px; height: 20px; margin-right: 8px;"></span> Analyzing...';
          
          try {
            // Create image element
            const img = new Image();
            img.src = state.selectedImage;
            
            img.onload = async () => {
              // Set canvas dimensions to match image
              canvas.width = img.width;
              canvas.height = img.height;
              
              // Draw image on canvas
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Perform detection
              const predictions = await state.model.detect(img);
              console.log('Detection results:', predictions);
              
              // Filter predictions to only include vehicles
              const filteredPredictions = predictions.filter(prediction => {
                return (
                  prediction.score >= state.settings.threshold / 100 &&
                  (prediction.class === 'ambulance' || targetClasses.includes(prediction.class))
                );
              });
              
              // Draw bounding boxes on the image
              drawDetections(filteredPredictions);
              
              // Process detections - check if any ambulances were found
              processDetections(filteredPredictions);
              
              // Re-enable analyze button
              analyzeBtn.disabled = false;
              analyzeBtn.innerHTML = 'Analyze Image';
            };
          } catch (error) {
            console.error('Error analyzing image:', error);
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = 'Analyze Image';
            
            // Show error message
            alertBanner.className = 'alert-banner show';
            alertDetails.innerHTML = '<h3>Detection Error</h3><p>Could not analyze the image. Please try again.</p>';
          }
        });
      }

      // Draw detection boxes and labels on image
      function drawDetections(predictions) {
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw the image
        const img = new Image();
        img.src = state.selectedImage;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Draw detection boxes
        predictions.forEach(prediction => {
          const [x, y, width, height] = prediction.bbox;
          const { class: className, score } = prediction;
          
          // Determine color based on class
          let color;
          if (className === 'ambulance') {
            color = colors.ambulance;
          } else if (targetClasses.includes(className)) {
            color = colors.vehicle;
          } else {
            color = colors.other;
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
        });
      }

      // Process detections - check for ambulances and update UI
      function processDetections(predictions) {
        // Check if any ambulances or potential ambulances were detected
        const hasAmbulance = predictions.some(p => p.class === 'ambulance');
        const hasVehicle = predictions.some(p => targetClasses.includes(p.class));
        
        // Update detection light
        if (hasAmbulance || hasVehicle) {
          // Show alert banner
          alertBanner.className = 'alert-banner show';
          alertDetails.innerHTML = hasAmbulance
            ? '<h3>Ambulance Detected!</h3><p>An ambulance has been detected in the image.</p>'
            : '<h3>Potential Ambulance Detected!</h3><p>A vehicle that could be an ambulance has been detected.</p>';
            
          // Update detection light
          detectionLight.className = 'detection-light active pulse';
          detectionLightContainer.className = 'detection-light-container active';
          detectionLightStatus.innerHTML = '<h3>Ambulance Detected</h3><p>A potential ambulance has been identified in the image.</p>';
          
          // Add to detection history
          addDetectionToHistory(predictions);
        } else {
          // No ambulances detected
          alertBanner.className = 'alert-banner';
          detectionLight.className = 'detection-light';
          detectionLightContainer.className = 'detection-light-container';
          detectionLightStatus.innerHTML = '<h3>No Ambulances Detected</h3><p>No ambulances identified in the current image.</p>';
        }
      }

      // Add detection to history list
      function addDetectionToHistory(predictions) {
        // Sort by confidence score
        const sortedPredictions = [...predictions].sort((a, b) => b.score - a.score);
        
        // Add top predictions to history
        sortedPredictions.slice(0, 3).forEach(prediction => {
          const isAmbulance = prediction.class === 'ambulance';
          const confidence = prediction.score * 100;
          const timestamp = new Date().toLocaleTimeString();
          
          // Create detection item element
          const detectionItem = document.createElement('div');
          detectionItem.className = 'detection-item';
          detectionItem.innerHTML = \`
            <div class="detection-info">
              <div class="detection-type">\${isAmbulance ? 'Ambulance' : prediction.class.charAt(0).toUpperCase() + prediction.class.slice(1)}</div>
              <div class="detection-time">\${timestamp}</div>
            </div>
            <div class="detection-confidence \${confidence > 80 ? 'high' : ''}">\${Math.round(confidence)}%</div>
          \`;
          
          // Add to detection list
          detectionList.insertBefore(detectionItem, detectionList.firstChild);
          
          // Remove old items if list gets too long
          if (detectionList.children.length > 10) {
            detectionList.removeChild(detectionList.lastChild);
          }
        });
      }

      // Close alert banner
      if (alertClose) {
        alertClose.addEventListener('click', () => {
          alertBanner.className = 'alert-banner';
        });
      }

      // Update threshold value display
      if (thresholdSlider) {
        thresholdSlider.addEventListener('input', (e) => {
          const value = e.target.value;
          thresholdValue.textContent = \`\${value}%\`;
          state.settings.threshold = parseInt(value);
        });
      }

      // Load model on page load
      loadModel();
    `;
    
    document.body.appendChild(script);
    
    // Cleanup function
    return () => {
      document.body.removeChild(script);
    };
  }, [loaded]);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <div id="detection-container" className="flex-grow ambulance-detection-wrapper">
        <div className="container">
          <header>
            <h1>Ambulance Detection System</h1>
            <p className="app-description">Real-time ambulance detection with image analysis</p>
          </header>
          
          <div className="alert-banner" id="alertBanner">
            <div className="alert-content">
              <div className="alert-icon">⚠️</div>
              <div id="alertDetails">
                <h3>Ambulance Detected!</h3>
                <p>An ambulance has been detected nearby. Please be cautious.</p>
              </div>
            </div>
            <button className="alert-close" id="alertClose">×</button>
          </div>
          
          <div className="main-content">
            <div className="column">
              <div className="card">
                <div className="card-header">
                  <h2>Ambulance Detection <span className="model-status" id="modelStatus">Loading...</span></h2>
                  <div className="status-indicator">
                    <div className="status-dot inactive" id="modelStatusIndicator"></div>
                    <span>Model</span>
                  </div>
                </div>
                
                <div className="video-detection-container">
                  <div className="detection-light-container" id="detectionLightContainer">
                    <div className="detection-light" id="detectionLight">
                      <div className="detection-light-icon">🚑</div>
                    </div>
                    <div className="detection-light-status" id="detectionLightStatus">
                      <h3>No Ambulances Detected</h3>
                      <p>Upload and analyze an image to detect ambulances.</p>
                    </div>
                  </div>
                  
                  <div className="video-container">
                    <div className="loading" id="loadingIndicator">
                      <div className="loader"></div>
                      <div>Loading detection model...</div>
                    </div>
                    <div className="small-ambulance-indicator" id="smallAmbulanceIndicator">AMBULANCE DETECTED</div>
                    <div className="tracking-badge" id="trackingBadge">Tracking</div>
                    <canvas id="motionPath" className="motion-path"></canvas>
                    <img id="imagePreview" style={{ maxWidth: '100%', maxHeight: '100%', display: 'none' }} />
                    <canvas id="canvas"></canvas>
                  </div>
                  
                  <div className="controls">
                    <input type="file" id="fileInput" accept="image/*" className="btn" style={{ width: '100%', padding: '10px' }} />
                    <button className="btn" id="analyzeBtn" disabled>Analyze Image</button>
                  </div>
                </div>
                
                <div className="recognition-key">
                  <h3 style={{ marginTop: '0', marginBottom: '15px' }}>Detection Color Guide</h3>
                  <div className="recognition-item">
                    <div className="recognition-color" style={{ backgroundColor: '#22c55e' }}></div>
                    <div className="recognition-text">Ambulance</div>
                  </div>
                  <div className="recognition-item">
                    <div className="recognition-color" style={{ backgroundColor: '#dc2626' }}></div>
                    <div className="recognition-text">Vehicle (potential ambulance)</div>
                  </div>
                  <div className="recognition-item">
                    <div className="recognition-color" style={{ backgroundColor: '#3b82f6' }}></div>
                    <div className="recognition-text">Other objects</div>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h2>Detection Settings</h2>
                </div>
                <div className="settings">
                  <div className="form-group">
                    <label htmlFor="thresholdSlider">Detection Threshold: <span id="thresholdValue">60%</span></label>
                    <input type="range" min="30" max="95" value="60" className="range-slider" id="thresholdSlider" />
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Higher values require more confidence to trigger a detection.
                    </p>
                  </div>
                </div>
                
                <div className="ambulance-features">
                  <div className="feature-title">Ambulance Detection Indicators</div>
                  <ul className="feature-list">
                    <li><strong>Visual Detection:</strong> Recognizes ambulance body types and markings</li>
                    <li><strong>Color Analysis:</strong> Identifies emergency vehicle color patterns</li>
                    <li><strong>Light Pattern Detection:</strong> Recognizes emergency light configurations</li>
                    <li><strong>Vehicle Classification:</strong> Identifies medical transport vehicles</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="column">
              <div className="card">
                <div className="card-header">
                  <h2>Detection History</h2>
                </div>
                <div className="detection-list" id="detectionList">
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    No detections yet<br />
                    <span style={{ fontSize: '0.9rem' }}>Upload and analyze an image to get started</span>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h2>Emergency Response</h2>
                </div>
                <div style={{ padding: '10px 0' }}>
                  <p style={{ marginBottom: '15px', color: 'var(--text-muted)' }}>
                    When an ambulance is detected:
                  </p>
                  
                  <div style={{ background: '#fee2e2', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#b91c1c', marginTop: '0', marginBottom: '8px' }}>For Drivers:</h3>
                    <p style={{ fontSize: '0.95rem', color: '#991b1b', margin: '0' }}>
                      Slow down, move to the side of the road when safe, and allow the ambulance to pass.
                    </p>
                  </div>
                  
                  <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#0369a1', marginTop: '0', marginBottom: '8px' }}>At Intersections:</h3>
                    <p style={{ fontSize: '0.95rem', color: '#0c4a6e', margin: '0' }}>
                      Stop safely and wait until the ambulance has passed completely before resuming travel.
                    </p>
                  </div>
                  
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--danger)' }}>Emergency Helpline (India):</strong> 108
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}