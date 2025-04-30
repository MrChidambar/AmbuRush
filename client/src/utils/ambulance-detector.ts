import * as tf from '@tensorflow/tfjs';

interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: number;
  score: number;
}

/**
 * Ambulance Detector using TensorFlow.js
 * Based on the AmbuRouteAI Python implementation using YOLOv8
 */
export class AmbulanceDetector {
  private model: tf.GraphModel | null = null;
  private modelPath = 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1';
  private confidenceThreshold = 0.40; // Increased confidence threshold to reduce false positives
  private targetClasses = [5]; // Class 5 = bus in COCO dataset (closest to ambulance)
  private modelLoaded = false;
  
  // COCO class names (same as YOLOv8 uses)
  private classNames = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 
    'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign', 
    'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 
    'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 
    'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 
    'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 
    'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 
    'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 
    'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 
    'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 
    'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 
    'hair drier', 'toothbrush'
  ];
  
  /**
   * Initializes the detector model
   */
  async initialize(): Promise<boolean> {
    try {
      console.log("Loading TensorFlow.js detection model...");
      
      // Make sure TF.js backend is configured
      if (tf.getBackend() !== 'webgl') {
        console.log("Setting WebGL backend for better performance");
        await tf.setBackend('webgl');
      }
      
      // Make sure TF.js is ready
      await tf.ready();
      
      // Load the COCO-SSD MobileNet model (similar to YOLOv8 classes)
      this.model = await tf.loadGraphModel(this.modelPath, {
        fromTFHub: true
      });
      
      this.modelLoaded = true;
      console.log("TensorFlow.js detection model loaded successfully");
      
      // Warm up the model with a dummy prediction
      if (this.model) {
        const dummyTensor = tf.zeros([1, 300, 300, 3]);
        const warmupResult = await this.model.executeAsync(dummyTensor) as tf.Tensor[];
        warmupResult.forEach(t => t.dispose());
        dummyTensor.dispose();
        console.log("Model warmed up");
      }
      
      return true;
    } catch (error) {
      console.error("Failed to initialize TensorFlow.js model:", error);
      return false;
    }
  }
  
  /**
   * Detect ambulances in an image 
   * Implementation based on AmbuRouteAI's detect_ambulance function in Python
   */
  async detectAmbulance(imageElement: HTMLImageElement): Promise<{
    found: boolean;
    confidence: number;
    className: string;
    bbox?: [number, number, number, number];
  }> {
    if (!this.modelLoaded || !this.model) {
      console.log("Using fallback detection because model is not loaded");
      return this.fallbackColorBasedDetection(imageElement);
    }
    
    try {
      // Convert image to tensor
      const tfImg = tf.browser.fromPixels(imageElement);
      
      // Resize image to model input size for better performance
      const resized = tf.image.resizeBilinear(tfImg, [300, 300]);
      
      // Normalize pixel values to [0,1]
      const normalized = resized.div(tf.scalar(255));
      
      // Expand dimensions to match model input requirements [1, height, width, 3]
      const input = normalized.expandDims(0);
      
      // Run inference
      const result = await this.model.executeAsync(input) as tf.Tensor[];
      
      // Get prediction data
      const boxes = await result[1].arraySync() as number[][][];
      const scores = await result[2].arraySync() as number[][];
      const classes = await result[3].arraySync() as number[][];
      
      // Clean up tensors to prevent memory leaks
      tfImg.dispose();
      resized.dispose();
      normalized.dispose();
      input.dispose();
      result.forEach(tensor => tensor.dispose());
      
      // Filter and process detections
      const detections: Detection[] = [];
      
      for (let i = 0; i < scores[0].length; i++) {
        const score = scores[0][i];
        const classId = Math.round(classes[0][i]);
        
        // Only consider detections above confidence threshold
        if (score > this.confidenceThreshold) {
          // Check if the detected class is in our target list (buses/ambulances)
          if (this.targetClasses.includes(classId)) {
            // Box coordinates in format [y1, x1, y2, x2] need to be converted
            const rawBox = boxes[0][i];
            const bbox: [number, number, number, number] = [
              rawBox[1] * imageElement.width,  // x
              rawBox[0] * imageElement.height, // y
              (rawBox[3] - rawBox[1]) * imageElement.width,  // width
              (rawBox[2] - rawBox[0]) * imageElement.height  // height
            ];
            
            detections.push({
              bbox,
              class: classId,
              score
            });
          }
        }
      }
      
      // Find best ambulance detection (highest confidence)
      let bestDetection: Detection | null = null;
      
      for (const detection of detections) {
        if (!bestDetection || detection.score > bestDetection.score) {
          bestDetection = detection;
        }
      }
      
      // Return result similar to Python implementation
      if (bestDetection) {
        return {
          found: true,
          confidence: bestDetection.score,
          className: 'ambulance', // Explicitly call it ambulance rather than bus
          bbox: bestDetection.bbox
        };
      }
      
      return { found: false, confidence: 0, className: 'no detection' };
    } catch (error) {
      console.error("TensorFlow.js detection error:", error);
      
      // Call garbage collection to prevent memory issues
      try {
        // @ts-ignore
        if (window.gc) {
          // @ts-ignore
          window.gc();
        }
      } catch (e) {
        // Ignore errors if gc is not available
      }
      
      // Fall back to color-based detection if TF.js fails
      return this.fallbackColorBasedDetection(imageElement);
    }
  }
  
  /**
   * Fallback detection method using color analysis similar to the RED and WHITE
   * color detection logic in the Python implementation
   */
  private async fallbackColorBasedDetection(imageElement: HTMLImageElement): Promise<{
    found: boolean;
    confidence: number;
    className: string;
    bbox?: [number, number, number, number];
  }> {
    try {
      // Create a canvas to analyze the image
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error("Could not get canvas context");
      }
      
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Count red and white pixels (common in ambulances)
      let redPixels = 0;
      let whitePixels = 0;
      let bluePixels = 0; // Many ambulances have blue elements
      let totalPixels = pixels.length / 4;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Check for red pixels (high R, low G and B)
        if (r > 180 && g < 100 && b < 100) {
          redPixels++;
        }
        
        // Check for white pixels (all high RGB values)
        if (r > 220 && g > 220 && b > 220) {
          whitePixels++;
        }
        
        // Check for blue pixels (high B, low R and G)
        if (b > 180 && r < 100 && g < 100) {
          bluePixels++;
        }
      }
      
      // Calculate ratios
      const redRatio = redPixels / totalPixels;
      const whiteRatio = whitePixels / totalPixels;
      const blueRatio = bluePixels / totalPixels;
      
      // Ambulances typically have red, white, and sometimes blue colors
      const hasSignificantRed = redRatio > 0.04; // At least 4% red
      const hasSignificantWhite = whiteRatio > 0.12; // At least 12% white
      const hasSignificantBlue = blueRatio > 0.03; // At least 3% blue
      
      // Determine if the color pattern suggests an ambulance
      let isAmbulance = false;
      let confidence = 0;
      
      // Indian ambulances are typically white and red
      if (hasSignificantRed && hasSignificantWhite) {
        confidence = 0.6 + (redRatio * 0.5) + (whiteRatio * 0.3);
        isAmbulance = confidence > 0.65;
      } 
      // Some ambulances have blue lights/patterns
      else if ((hasSignificantRed || hasSignificantWhite) && hasSignificantBlue) {
        confidence = 0.5 + (Math.max(redRatio, whiteRatio) * 0.4) + (blueRatio * 0.3);
        isAmbulance = confidence > 0.60;
      }
      
      // Cap confidence at 0.8 since it's a fallback method
      confidence = Math.min(0.8, confidence);
      
      // Default bbox covers most of the image
      const defaultBbox: [number, number, number, number] = [
        20, 20, imageElement.width - 40, imageElement.height - 40
      ];
      
      return {
        found: isAmbulance,
        confidence: confidence,
        className: isAmbulance ? 'ambulance (color detection)' : 'no detection',
        bbox: isAmbulance ? defaultBbox : undefined
      };
    } catch (error) {
      console.error("Fallback detection error:", error);
      return { found: false, confidence: 0, className: 'detection failed' };
    }
  }
  
  /**
   * Update detector parameters
   */
  updateParams(params: { confidenceThreshold?: number; targetClasses?: number[] }): void {
    if (params.confidenceThreshold !== undefined) {
      this.confidenceThreshold = params.confidenceThreshold;
    }
    if (params.targetClasses !== undefined) {
      this.targetClasses = params.targetClasses;
    }
  }
}