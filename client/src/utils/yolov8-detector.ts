import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-web';

interface Detection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  class: number;
  score: number;
}

/**
 * YOLOv8 Detector class
 * This class handles loading and running the YOLOv8 model for object detection
 * It's specifically configured to detect ambulances (typically identified as buses in YOLOv8)
 */
export class YOLOv8Detector {
  private model: ort.InferenceSession | null = null;
  private modelPath: string = '/yolov8n_web_model/model.onnx';
  private inputShape = [1, 3, 640, 640]; // YOLOv8 default input shape
  private classNames: string[] = []; // Will load from model if available
  private targetClasses = [5]; // COCO class index for 'bus' which most closely matches ambulance
  private confidenceThreshold = 0.35;
  private modelLoaded = false;
  
  constructor() {
    // COCO dataset class names (used by YOLOv8)
    this.classNames = [
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
  }
  
  /**
   * Checks if the model is available locally
   */
  async checkModelAvailability(): Promise<boolean> {
    try {
      const response = await fetch(this.modelPath, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Error checking model availability:', error);
      return false;
    }
  }
  
  /**
   * Initializes the YOLOv8 model
   */
  async initialize(): Promise<boolean> {
    try {
      // Set WebAssembly flags for better performance
      const options: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        executionMode: 'sequential',
      };
      
      // Check if model is available
      const modelAvailable = await this.checkModelAvailability();
      if (!modelAvailable) {
        console.error("YOLOv8 model not found at path:", this.modelPath);
        throw new Error("Model not found. Please make sure the model is available.");
      }
      
      // Initialize ONNX Runtime inference session
      console.log("Loading YOLOv8 model...");
      this.model = await ort.InferenceSession.create(this.modelPath, options);
      
      this.modelLoaded = true;
      console.log("YOLOv8 model loaded successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize YOLOv8 model:", error);
      
      // Fallback to TensorFlow if ONNX fails
      try {
        await tf.ready();
        console.log("TensorFlow.js is ready");
        this.modelLoaded = true;
        return true;
      } catch (tfError) {
        console.error("TensorFlow initialization failed:", tfError);
        return false;
      }
    }
  }
  
  /**
   * Preprocesses the input image for the model
   */
  private async preprocessImage(imageElement: HTMLImageElement): Promise<tf.Tensor | null> {
    try {
      // Convert image to tensor
      const imageTensor = tf.browser.fromPixels(imageElement);
      
      // Resize to model input dimensions while maintaining aspect ratio
      const [height, width] = imageTensor.shape.slice(0, 2);
      let resized;
      
      const inputWidth = this.inputShape[3];
      const inputHeight = this.inputShape[2];
      
      if (width !== inputWidth || height !== inputHeight) {
        // Resize image to fit 640x640 (YOLOv8 input size) with padding
        resized = tf.image.resizeBilinear(imageTensor, [inputHeight, inputWidth]);
      } else {
        resized = imageTensor;
      }
      
      // Normalize pixel values to [0,1]
      const normalized = resized.div(255.0);
      
      // Expand dimension to create batch of size 1 and transpose from NHWC to NCHW format
      const batched = normalized.transpose([2, 0, 1]).expandDims(0);
      
      // Clean up intermediate tensors
      imageTensor.dispose();
      if (resized !== imageTensor) {
        resized.dispose();
      }
      
      return batched;
    } catch (error) {
      console.error("Error preprocessing image:", error);
      return null;
    }
  }
  
  /**
   * Performs ambulance detection on an image
   */
  async detectAmbulance(imageElement: HTMLImageElement): Promise<{
    found: boolean;
    confidence: number;
    className: string;
    bbox?: [number, number, number, number];
  }> {
    if (!this.modelLoaded) {
      throw new Error("YOLOv8 model not initialized");
    }
    
    try {
      // If ONNX model is not available, use fallback color analysis
      if (!this.model) {
        return this.fallbackColorBasedDetection(imageElement);
      }
      
      // Preprocess image
      const inputTensor = await this.preprocessImage(imageElement);
      if (!inputTensor) {
        throw new Error("Failed to preprocess image");
      }
      
      // Convert TensorFlow tensor to ONNX tensor
      const inputData = await inputTensor.data();
      const input = new ort.Tensor('float32', new Float32Array(inputData), this.inputShape);
      
      // Run inference
      const feeds = { images: input };
      const results = await this.model.run(feeds);
      
      // Process outputs (YOLOv8 outputs in format [batch, predictions, 84])
      // where 84 = 4 (bbox coords) + 80 (class scores)
      const outputData = results.output.data as Float32Array;
      const outputShape = results.output.dims;
      const numDetections = outputShape[1];  // Number of detections
      
      // Convert raw outputs to detections
      const detections: Detection[] = [];
      
      for (let i = 0; i < numDetections; i++) {
        // Extract bounding box coordinates
        const x1 = outputData[i * 84 + 0];
        const y1 = outputData[i * 84 + 1];
        const x2 = outputData[i * 84 + 2];
        const y2 = outputData[i * 84 + 3];
        
        // Find class with highest score
        let maxScore = 0;
        let maxClass = -1;
        
        for (let j = 0; j < 80; j++) {
          const score = outputData[i * 84 + 4 + j];
          if (score > maxScore) {
            maxScore = score;
            maxClass = j;
          }
        }
        
        // Only include detections with score above threshold
        if (maxScore > this.confidenceThreshold) {
          detections.push({
            bbox: [x1, y1, x2, y2],
            class: maxClass,
            score: maxScore
          });
        }
      }
      
      // Clean up
      inputTensor.dispose();
      
      // Find ambulance detections (buses in COCO dataset are class 5)
      let bestAmbulanceDetection: Detection | null = null;
      
      for (const detection of detections) {
        if (this.targetClasses.includes(detection.class)) {
          if (!bestAmbulanceDetection || detection.score > bestAmbulanceDetection.score) {
            bestAmbulanceDetection = detection;
          }
        }
      }
      
      // Return detection result
      if (bestAmbulanceDetection) {
        return {
          found: true,
          confidence: bestAmbulanceDetection.score,
          className: this.classNames[bestAmbulanceDetection.class] || 'ambulance',
          bbox: bestAmbulanceDetection.bbox
        };
      }
      
      return { found: false, confidence: 0, className: 'no detection' };
    } catch (error) {
      console.error("YOLOv8 detection error:", error);
      
      // Fall back to color-based detection on error
      return this.fallbackColorBasedDetection(imageElement);
    }
  }
  
  /**
   * Simple fallback detection based on color analysis
   * This is used if the ONNX model fails to load or run
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
      let totalPixels = pixels.length / 4;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Check for red pixels (high R, low G and B)
        if (r > 200 && g < 100 && b < 100) {
          redPixels++;
        }
        
        // Check for white pixels (all high RGB values)
        if (r > 200 && g > 200 && b > 200) {
          whitePixels++;
        }
      }
      
      // Calculate ratios
      const redRatio = redPixels / totalPixels;
      const whiteRatio = whitePixels / totalPixels;
      
      // Ambulances typically have red and white colors
      const hasSignificantRed = redRatio > 0.05; // At least 5% red
      const hasSignificantWhite = whiteRatio > 0.15; // At least 15% white
      
      // Calculate confidence based on color analysis
      const colorConfidence = (redRatio * 4) + (whiteRatio * 2);
      const adjustedConfidence = Math.min(0.8, colorConfidence); // Cap at 0.8 since it's fallback
      
      // Default bbox covers most of the image
      const defaultBbox: [number, number, number, number] = [
        20, 20, imageElement.width - 40, imageElement.height - 40
      ];
      
      return {
        found: hasSignificantRed && hasSignificantWhite && adjustedConfidence > 0.3,
        confidence: adjustedConfidence,
        className: 'ambulance (color detection)',
        bbox: defaultBbox
      };
    } catch (error) {
      console.error("Fallback detection error:", error);
      return { found: false, confidence: 0, className: 'detection failed' };
    }
  }
  
  /**
   * Returns model info
   */
  getModelInfo(): { modelPath: string; loaded: boolean; targetClasses: number[] } {
    return {
      modelPath: this.modelPath,
      loaded: this.modelLoaded,
      targetClasses: this.targetClasses
    };
  }
  
  /**
   * Updates detection parameters
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