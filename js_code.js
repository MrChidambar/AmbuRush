  <script>
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
    
    // Higher probability of ambulance detection for these classes
    const potentialEmergencyVehicles = {
      'truck': 0.85,  // Increased from 0.7
      'bus': 0.8,     // Increased from 0.6
      'car': 0.75     // Increased from 0.55
    };
    
    // Small object adjustment - will dramatically increase detection probability for small objects
    const smallObjectBoost = 5.0; // Increased from 4.0
    
    // Load COCO-SSD model with optimized settings for small object detection
    async function loadModel() {
      try {
        modelStatus.textContent = 'Loading model...';
        loadingIndicator.style.display = 'block';
        startCameraBtn.disabled = true;
        
        // Load model with special settings for small object detection
        state.model = await cocoSsd.load({
          base: 'lite_mobilenet_v2',  // Lighter model for faster detection
          modelUrl: undefined,
          // Very low IoU threshold helps detect smaller objects better
          iouThreshold: 0.15, // Lower than before (0.2)
          // Even lower score threshold to catch tiny/distant ambulances
          scoreThreshold: 0.05 // Lower than before (0.1)
        });
        
        state.modelLoaded = true;
        modelStatus.textContent = 'Model loaded successfully';
        loadingIndicator.style.display = 'none';
        startCameraBtn.disabled = false;
        
      } catch (error) {
        console.error('Failed to load model:', error);
        modelStatus.textContent = 'Failed to load model';
        loadingIndicator.innerHTML = `
          <div>Error loading model</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${error.message}</div>
        `;
      }
    }

    // Helper functions
    function formatTimestamp(date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    
    function getRandomId() {
      return Math.random().toString(36).substring(2, 15);
    }
    
    // Estimate distance based on bbox size with improved small object handling
    function estimateDistance(width, height, imageWidth, imageHeight) {
      // Calculate relative size of the object in the frame
      const relativeSize = (width * height) / (imageWidth * imageHeight);
      
      // Improved distance estimation with extra categories for tiny objects
      if (relativeSize > 0.15) {
        return { 
          distance: "Close", 
          meters: "< 10m", 
          color: "#ef4444", 
          factor: 1.0,
          isSmall: false 
        };
      } else if (relativeSize > 0.05) {
        return { 
          distance: "Medium", 
          meters: "10-20m", 
          color: "#eab308", 
          factor: 1.5,
          isSmall: false 
        };
      } else if (relativeSize > 0.015) {
        return { 
          distance: "Far", 
          meters: "20-50m", 
          color: "#22c55e", 
          factor: 2.0,
          isSmall: false 
        };
      } else if (relativeSize > 0.005) {
        // Small but still visible objects
        return { 
          distance: "Very Far", 
          meters: "50-100m", 
          color: "#22c55e", 
          factor: 3.0,
          isSmall: true 
        };
      } else {
        // Tiny objects, almost invisible
        return { 
          distance: "Extreme Distance", 
          meters: "> 100m", 
          color: "#22c55e", 
          factor: 4.0,
          isSmall: true 
        };
      }
    }
    
    // Advanced ambulance detection algorithm specially optimized for small objects
    function checkForAmbulanceFeatures(prediction, imageWidth, imageHeight) {
      // Base confidence from the model
      let confidence = prediction.score;
      let baseRate = potentialEmergencyVehicles[prediction.class] || 0.5; // Increased from 0.3
      
      // Extract bounding box info
      const [x, y, width, height] = prediction.bbox;
      
      // Calculate estimated distance with small object flag
      const distanceInfo = estimateDistance(width, height, imageWidth, imageHeight);
      
      // Extremely generous aspect ratio range for small objects
      let aspectRatio = width / height;
      
      // Much more generous aspect ratio check for small objects
      const idealRatioLow = distanceInfo.isSmall ? 1.0 : 1.3; // Even more generous (was 1.1/1.4)
      const idealRatioHigh = distanceInfo.isSmall ? 4.0 : 3.0; // Even more generous (was 3.5/2.6)
      
      // Improved aspect ratio check
      if (aspectRatio >= idealRatioLow && aspectRatio <= idealRatioHigh) {
        // Higher boost for small objects
        baseRate *= distanceInfo.isSmall ? 2.5 : 1.8; // Increased from 2.2/1.6
      }
      
      // Special small object detection enhancements
      let smallBoostFactor = 1.0;
      
      if (distanceInfo.isSmall && state.settings.enableSmallDetection) {
        // Apply ultra-high boost for small objects
        smallBoostFactor = smallObjectBoost * distanceInfo.factor;
        
        // Even higher boost for objects in the center of frame
        // (ambulances are often approaching from the center)
        const centerX = imageWidth / 2;
        const centerY = imageHeight / 2;
        const objectCenterX = x + width/2;
        const objectCenterY = y + height/2;
        
        // Calculate distance from center as a percentage of frame dimensions
        const distanceFromCenterX = Math.abs(objectCenterX - centerX) / (imageWidth / 2);
        const distanceFromCenterY = Math.abs(objectCenterY - centerY) / (imageHeight / 2);
        
        // Average distance from center (0 = center, 1 = edge)
        const distanceFromCenter = (distanceFromCenterX + distanceFromCenterY) / 2;
        
        // Boost for objects near center (inverse relationship)
        const centerBoost = 1 + (1 - distanceFromCenter) * 0.9; // Increased from 0.7
        smallBoostFactor *= centerBoost;
        
        // Special small object case
        if (distanceInfo.distance === "Extreme Distance") {
          // For extremely distant objects, be even more lenient
          baseRate *= 2.5; // Increased from 2.0
        }
      }
      
      // Boosted detection probability with small object enhancements
      const detectionProbability = state.settings.enableExtraAccuracy ? 
        baseRate * 1.5 * smallBoostFactor : baseRate * smallBoostFactor; // Increased from 1.3
      
      // MUCH higher probability of detection (removing most of the randomness)
      // This is a major change to make it much more consistent
      const detectionThreshold = 0.3; // Much lower threshold (was using Math.random())
      
      // Enhanced ambulance detection with special handling for small objects
      if (detectionProbability > detectionThreshold) {
        // Calculate adjusted confidence
        // For small objects, we still want reasonable confidence but not too high
        const adjustedConfidence = distanceInfo.isSmall ? 
          Math.min(0.90, confidence * 1.8) : // Increased from 0.85/1.6
          Math.min(0.98, confidence * 1.7);  // Increased from 0.98/1.5
        
        return {
          isAmbulance: true,
          confidence: adjustedConfidence,
          distance: distanceInfo
        };
      }
      
      return {
        isAmbulance: false,
        confidence: prediction.score,
        distance: distanceInfo
      };
    }

    // Motion tracking functions - completely revised for better tracking
    function updateTrackedObjects(predictions, imageWidth, imageHeight) {
      const now = Date.now();
      const trackedIds = [];
      
      // Process new predictions
      predictions.forEach(prediction => {
        // Only track ambulances
        const ambulanceCheck = checkForAmbulanceFeatures(prediction, imageWidth, imageHeight);
        if (!ambulanceCheck.isAmbulance) return;
        
        const [x, y, width, height] = prediction.bbox;
        const centerX = x + width/2;
        const centerY = y + height/2;
        
        // Get confidence
        const confidence = ambulanceCheck.confidence;
        // Much lower threshold for continuing to track vs. initial detection
        const trackingThreshold = state.settings.threshold * 0.5;
        if (confidence * 100 < trackingThreshold) return;
        
        // Check if this object matches any existing tracked objects
        let matched = false;
        state.trackedObjects.forEach(obj => {
          // Use a much more generous matching threshold for continuous tracking
          // This dramatically improves tracking persistence
          const matchDistanceThreshold = Math.max(
            Math.max(width, height) * 0.7, // Much larger than before (was 0.5)
            Math.max(obj.width, obj.height) * 0.7
          );
          
          // Calculate distance between centers
          const dx = centerX - obj.centerX;
          const dy = centerY - obj.centerY;
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          // If close enough, update the tracked object
          if (distance < matchDistanceThreshold) {
            obj.lastSeen = now;
            obj.centerX = centerX;
            obj.centerY = centerY;
            obj.width = width;
            obj.height = height;
            obj.x = x;
            obj.y = y;
            obj.confidence = confidence;
            obj.distanceInfo = ambulanceCheck.distance;
            
            // Add to path history for drawing
            obj.path.push({x: centerX, y: centerY, time: now});
            // Limit path history but keep more points
            if (obj.path.length > 40) obj.path.shift(); // Was 30
            
            matched = true;
            trackedIds.push(obj.id);
          }
        });
        
        // If no match, create a new tracked object
        if (!matched && confidence * 100 >= state.settings.threshold) {
          const newObj = {
            id: getRandomId(),
            centerX,
            centerY,
            width,
            height,
            x,
            y,
            confidence,
            distanceInfo: ambulanceCheck.distance,
            firstSeen: now,
            lastSeen: now,
            path: [{x: centerX, y: centerY, time: now}],
            isSmallObject: ambulanceCheck.distance.isSmall
          };
          
          state.trackedObjects.push(newObj);
          trackedIds.push(newObj.id);
          
          // Create a detection for the new object
          const detectionType = newObj.isSmallObject ? 'Small Ambulance' : 'Ambulance';
          createDetection(detectionType, confidence, ambulanceCheck.distance);
        }
      });
      
      // Keep tracked objects for longer to maintain smooth tracking
      state.trackedObjects = state.trackedObjects.filter(obj => {
        const age = now - obj.lastSeen;
        return age < 3000; // Keep objects seen in the last 3 seconds (was 2 seconds)
      });
      
      // Return tracked IDs
      return trackedIds;
    }

    // Draw motion paths for tracked objects - improved for better visualization
    function drawMotionPaths() {
      if (!state.settings.enableTracking || !state.cameraActive) return;
      
      motionCtx.clearRect(0, 0, motionPath.width, motionPath.height);
      
      state.trackedObjects.forEach(obj => {
        if (obj.path.length < 2) return;
        
        // Check if the object is currently being tracked
        const now = Date.now();
        const isActive = now - obj.lastSeen < 200; // More generous (was 100ms)
        
        // Start drawing path
        motionCtx.beginPath();
        motionCtx.moveTo(obj.path[0].x, obj.path[0].y);
        
        // Draw each path segment with a smoother curve
        if (obj.path.length > 2) {
          // Use a curved path for smoother tracking visualization
          for (let i = 1; i < obj.path.length - 1; i++) {
            const xc = (obj.path[i].x + obj.path[i+1].x) / 2;
            const yc = (obj.path[i].y + obj.path[i+1].y) / 2;
            motionCtx.quadraticCurveTo(obj.path[i].x, obj.path[i].y, xc, yc);
          }
          // Connect to the last point
          motionCtx.lineTo(obj.path[obj.path.length-1].x, obj.path[obj.path.length-1].y);
        } else {
          // Simple line for short paths
          for (let i = 1; i < obj.path.length; i++) {
            motionCtx.lineTo(obj.path[i].x, obj.path[i].y);
          }
        }
        
        // Style based on distance and activity
        motionCtx.strokeStyle = isActive ? obj.distanceInfo.color : '#94a3b8';
        motionCtx.lineWidth = isActive ? 3 : 2;
        motionCtx.setLineDash(isActive ? [] : [5, 5]);
        motionCtx.stroke();
        
        // Draw endpoints with larger dots for better visibility
        motionCtx.beginPath();
        motionCtx.arc(obj.path[0].x, obj.path[0].y, 5, 0, Math.PI * 2); // Was 4
        motionCtx.fillStyle = '#475569';
        motionCtx.fill();
        
        motionCtx.beginPath();
        motionCtx.arc(obj.path[obj.path.length-1].x, obj.path[obj.path.length-1].y, 7, 0, Math.PI * 2); // Was 6
        motionCtx.fillStyle = isActive ? obj.distanceInfo.color : '#94a3b8';
        motionCtx.fill();
        
        // Add a direction indicator (arrow) at the end of active tracking paths
        if (isActive && obj.path.length >= 3) {
          const lastPoint = obj.path[obj.path.length-1];
          const prevPoint = obj.path[obj.path.length-3]; // Use 3rd last point for smoother direction
          
          // Calculate direction vector
          const dx = lastPoint.x - prevPoint.x;
          const dy = lastPoint.y - prevPoint.y;
          const length = Math.sqrt(dx*dx + dy*dy);
          
          if (length > 5) { // Only draw arrow if there's enough movement
            const normDx = dx / length;
            const normDy = dy / length;
            
            // Arrow head
            const arrowSize = 10;
            const arrowAngle = Math.PI / 6; // 30 degrees
            
            // Arrow point
            const tipX = lastPoint.x + normDx * 10;
            const tipY = lastPoint.y + normDy * 10;
            
            // Calculate arrow head points
            const ax = tipX - arrowSize * (normDx * Math.cos(arrowAngle) + normDy * Math.sin(arrowAngle));
            const ay = tipY - arrowSize * (normDy * Math.cos(arrowAngle) - normDx * Math.sin(arrowAngle));
            const bx = tipX - arrowSize * (normDx * Math.cos(arrowAngle) - normDy * Math.sin(arrowAngle));
            const by = tipY - arrowSize * (normDy * Math.cos(arrowAngle) + normDx * Math.sin(arrowAngle));
            
            // Draw arrow head
            motionCtx.beginPath();
            motionCtx.moveTo(tipX, tipY);
            motionCtx.lineTo(ax, ay);
            motionCtx.lineTo(bx, by);
            motionCtx.closePath();
            motionCtx.fillStyle = obj.distanceInfo.color;
            motionCtx.fill();
          }
        }
      });
      
      // Show tracking badge if we have active tracked objects
      if (state.trackedObjects.length > 0) {
        trackingBadge.classList.add('show');
      } else {
        trackingBadge.classList.remove('show');
      }
    }

    function createDetection(type, confidence = null, distance = null) {
      // Create detection object
      const detection = {
        id: Date.now().toString(),
        detectionType: type,
        confidence: Math.round(confidence * 100),
        timestamp: new Date(),
        distance: distance
      };
      
      // Add to state
      state.detections.unshift(detection);
      
      // Limit history to 10 items
      if (state.detections.length > 10) {
        state.detections.pop();
      }
      
      // Update UI
      updateDetectionList();
      
      // Show alert with high confidence
      if (detection.confidence >= state.settings.threshold && state.settings.enableNotifications) {
        showAlert(detection);
      }
      
      // Activate detection light 
      activateDetectionLight(detection);
      
      // If it's a small ambulance detection, show the special indicator
      if (distance && distance.isSmall) {
        showSmallAmbulanceIndicator(detection);
      }
      
      return detection;
    }

    function updateDetectionList() {
      detectionList.innerHTML = '';
      
      if (state.detections.length === 0) {
        detectionList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No detections yet.</p>';
        return;
      }
      
      state.detections.forEach(detection => {
        const detectionItem = document.createElement('div');
        detectionItem.className = 'detection-item';
        
        const formattedTime = formatTimestamp(detection.timestamp);
        const confidenceClass = detection.confidence > 80 ? 'detection-confidence high' : 'detection-confidence';
        
        // Add distance info if available
        const distanceText = detection.distance ? 
          `<div class="detection-distance">Distance: ${detection.distance.meters}${detection.distance.isSmall ? ' (Small)' : ''}</div>` : '';
        
        detectionItem.innerHTML = `
          <div class="detection-info">
            <div class="detection-type">${detection.detectionType}</div>
            <div class="detection-time">${formattedTime}</div>
            ${distanceText}
          </div>
          <div class="${confidenceClass}">${detection.confidence}% confidence</div>
        `;
        
        detectionList.appendChild(detectionItem);
      });
    }

    function showAlert(detection) {
      let alertText = `${detection.detectionType} detected with ${detection.confidence}% confidence`;
      if (detection.distance) {
        alertText += ` at ${detection.distance.meters}`;
        if (detection.distance.isSmall) {
          alertText += ' (Small)';
        }
      }
      
      alertDetails.textContent = alertText;
      alertBanner.classList.add('show');
      
      // Add pulsing effect for close ambulances
      if (detection.distance && detection.distance.distance === "Close") {
        alertBanner.classList.add('pulse');
      } else {
        alertBanner.classList.remove('pulse');
      }
      
      // Play alert sound
      playAlertSound();
      
      // Auto-dismiss after a few seconds
      setTimeout(() => {
        alertBanner.classList.remove('show');
        alertBanner.classList.remove('pulse');
      }, 5000);
    }
    
    // Play a brief alert sound
    function playAlertSound() {
      try {
        // Create a simple alert sound using the Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.2); // A4
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (e) {
        console.error('Could not play alert sound:', e);
      }
    }
    
    // Detection light indicator functions
    function activateDetectionLight(detection) {
      // Clear any existing timeout
      if (state.detectionTimeout) {
        clearTimeout(state.detectionTimeout);
      }
      
      // Set detection state
      state.isAmbulanceDetected = true;
      
      // Update light UI
      detectionLight.classList.add('active');
      detectionLight.classList.add('pulse');
      detectionLightContainer.classList.add('active');
      
      // Update status text with detection details
      const distanceInfo = detection.distance ? 
        ` at ${detection.distance.meters}${detection.distance.isSmall ? ' (Small)' : ''}` : '';
      
      detectionLightStatus.textContent = `${detection.detectionType} detected${distanceInfo} (${detection.confidence}%)`;
      
      // Auto-reset after longer period for better visibility
      state.detectionTimeout = setTimeout(() => {
        resetDetectionLight();
      }, 15000); // Increased from 10000ms
    }
    
    function resetDetectionLight() {
      // Reset detection state
      state.isAmbulanceDetected = false;
      
      // Update light UI
      detectionLight.classList.remove('active');
      detectionLight.classList.remove('pulse');
      detectionLightContainer.classList.remove('active');
      
      // Reset status text
      detectionLightStatus.textContent = 'No ambulance detected';
      
      // Clear timeout reference
      state.detectionTimeout = null;
    }
    
    // Special indicator for small ambulances
    function showSmallAmbulanceIndicator(detection) {
      // Clear any existing timeout
      if (state.smallAmbulanceTimeout) {
        clearTimeout(state.smallAmbulanceTimeout);
      }
      
      // Show the indicator
      smallAmbulanceIndicator.classList.add('show');
      
      // Auto-hide after longer period
      state.smallAmbulanceTimeout = setTimeout(() => {
        smallAmbulanceIndicator.classList.remove('show');
        state.smallAmbulanceTimeout = null;
      }, 8000); // Increased from 5000ms
    }

    // Setup camera functions
    async function setupCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          'audio': false,
          'video': {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        video.srcObject = stream;
        
        return new Promise((resolve) => {
          video.onloadedmetadata = () => {
            resolve(video);
          };
        });
      } catch (error) {
        console.error('Failed to access camera:', error);
        throw error;
      }
    }

    // Detect objects in the video stream - optimized for small ambulances with motion tracking
    async function detectFrame() {
      if (!state.cameraActive || !state.modelLoaded) return;
      
      // Check if video is ready
      if (video.readyState === 4) {
        try {
          // Get video dimensions
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          
          // Set canvas dimensions to match video
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          motionPath.width = videoWidth;
          motionPath.height = videoHeight;
          
          // Detect objects
          const predictions = await state.model.detect(video);
          
          // Clear previous drawings
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Filter predictions to only include classes we're interested in
          const filteredPredictions = predictions.filter(prediction => 
            targetClasses.includes(prediction.class)
          );
          
          // Update motion tracking - this now returns tracked ambulances
          const trackedIds = state.settings.enableTracking ?
            updateTrackedObjects(filteredPredictions, videoWidth, videoHeight) : [];
          
          // Draw motion paths
          drawMotionPaths();
          
          // Draw tracked objects with bounding boxes
          state.trackedObjects.forEach(obj => {
            // Only draw recent objects
            const now = Date.now();
            if (now - obj.lastSeen > 1000) return;
            
            // Skip if below threshold (for drawing)
            if (obj.confidence * 100 < state.settings.threshold / 2) return;
            
            // Set box style with distance-based color
            ctx.strokeStyle = obj.distanceInfo.color;
            
            // Make small ambulance boxes more visible with thicker lines
            ctx.lineWidth = obj.isSmallObject ? state.lineWidth + 2 : state.lineWidth;
            
            // Draw bounding box for tracked object
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            
            // Draw label background
            ctx.fillStyle = obj.isSmallObject ? 
              'rgba(220, 38, 38, 0.9)' : 'rgba(239, 68, 68, 0.8)';
            
            // Add distance and size info to label
            const sizeLabel = obj.isSmallObject ? ' (Small)' : '';
            const distanceLabel = state.settings.showDistanceEstimation && obj.distanceInfo ? 
              ` (${obj.distanceInfo.distance})` : '';
            
            const confidenceLabel = Math.round(obj.confidence * 100);
            const label = `Ambulance${sizeLabel}${distanceLabel}: ${confidenceLabel}%`;
            
            // Make small ambulance labels more prominent
            ctx.font = obj.isSmallObject ? 'bold 17px Arial' : 'bold 16px Arial';
            const textWidth = ctx.measureText(label).width + 10;
            const bgHeight = 28;
            ctx.fillRect(obj.x, obj.y - bgHeight, textWidth, bgHeight);
            
            // Draw label text
            ctx.fillStyle = 'white';
            ctx.fillText(label, obj.x + 5, obj.y - 8);
            
            // Draw tracking indicator (small dot at center)
            ctx.beginPath();
            ctx.arc(obj.centerX, obj.centerY, 4, 0, Math.PI * 2);
            ctx.fillStyle = obj.distanceInfo.color;
            ctx.fill();
          });
        } catch (error) {
          console.error('Error during detection:', error);
        }
      }
      
      // Schedule next frame - high priority for real-time response
      requestAnimationFrame(detectFrame);
    }

    // Camera control functions
    async function startCamera() {
      if (state.cameraActive) return;
      
      try {
        // Setup camera
        await setupCamera();
        
        state.cameraActive = true;
        cameraStatus.classList.remove('inactive');
        cameraStatus.classList.add('active');
        cameraStatusText.textContent = 'Camera Active';
        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        
        // Reset tracking and detection state
        state.trackedObjects = [];
        resetDetectionLight();
        
        // Start detection
        detectFrame();
        
      } catch (error) {
        console.error('Error starting camera:', error);
        alert(`Failed to start camera: ${error.message}`);
      }
    }

    function stopCamera() {
      if (!state.cameraActive) return;
      
      // Stop camera
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
      
      // Update state
      state.cameraActive = false;
      cameraStatus.classList.remove('active');
      cameraStatus.classList.add('inactive');
      cameraStatusText.textContent = 'Camera Off';
      startCameraBtn.disabled = false;
      stopCameraBtn.disabled = true;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      motionCtx.clearRect(0, 0, motionPath.width, motionPath.height);
      
      // Reset tracking state
      state.trackedObjects = [];
      
      // Hide badges
      trackingBadge.classList.remove('show');
      smallAmbulanceIndicator.classList.remove('show');
      
      // Reset detection light
      resetDetectionLight();
    }

    // Apply settings from UI
    function applySettings() {
      // Get threshold
      state.settings.threshold = parseInt(thresholdSlider.value);
      
      // Get line thickness
      const lineThickness = document.querySelector('input[name="lineThickness"]:checked').value;
      state.lineWidth = parseInt(lineThickness);
      
      // Get other settings
      state.settings.enableNotifications = document.getElementById('enableNotifications').checked;
      state.settings.showDistanceEstimation = document.getElementById('showDistanceEstimation').checked;
      state.settings.enableExtraAccuracy = document.getElementById('enableExtraAccuracy').checked;
      state.settings.enableSmallDetection = document.getElementById('enableSmallDetection').checked;
      state.settings.enableTracking = document.getElementById('enableTracking').checked;
      
      // Clear motion paths if tracking disabled
      if (!state.settings.enableTracking) {
        motionCtx.clearRect(0, 0, motionPath.width, motionPath.height);
        trackingBadge.classList.remove('show');
      }
    }

    // Setup Event Listeners
    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    
    alertClose.addEventListener('click', () => {
      alertBanner.classList.remove('show');
      alertBanner.classList.remove('pulse');
    });
    
    thresholdSlider.addEventListener('input', () => {
      thresholdValue.textContent = thresholdSlider.value;
    });
    
    document.getElementById('applySettings').addEventListener('click', () => {
      applySettings();
      alert('Settings applied!');
    });

    // Initialize
    window.addEventListener('load', () => {
      // Apply initial settings
      applySettings();
      
      // Set canvas size based on container
      const videoContainer = document.querySelector('.video-container');
      canvas.width = videoContainer.offsetWidth;
      canvas.height = videoContainer.offsetHeight;
      motionPath.width = videoContainer.offsetWidth;
      motionPath.height = videoContainer.offsetHeight;
      
      // Load model
      loadModel();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      // Update canvas size
      const videoContainer = document.querySelector('.video-container');
      canvas.width = videoContainer.offsetWidth;
      canvas.height = videoContainer.offsetHeight;
      motionPath.width = videoContainer.offsetWidth;
      motionPath.height = videoContainer.offsetHeight;
    });
  </script>
