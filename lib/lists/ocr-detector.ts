/**
 * OCR-based detection for CRITICAL stamp in document images
 * Uses Tesseract.js to extract text from images embedded in documents
 */

/**
 * Run OCR on an image to detect CRITICAL text
 * Tries multiple OCR modes for better detection
 * @param imageBuffer - Image buffer (ArrayBuffer or Buffer)
 * @param imageType - MIME type of image (e.g., 'image/png', 'image/jpeg')
 * @returns Promise<boolean> - true if CRITICAL text is detected
 */
/**
 * Preprocess image to improve OCR accuracy
 * - Resize if needed
 * - Enhance contrast
 * - Binarization (convert to black and white)
 * - Noise reduction
 */
async function preprocessImageForOCR(
  imageBuffer: ArrayBuffer | Buffer,
  imageType: string
): Promise<ArrayBuffer> {
  try {
    // Check if we're in browser environment (Canvas API available)
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('[OCR] Server-side environment, skipping preprocessing')
      return imageBuffer instanceof ArrayBuffer ? imageBuffer : Buffer.from(imageBuffer).buffer
    }
    
    console.log('[OCR] Preprocessing image for better OCR accuracy...')
    
    // Create image from buffer
    const blob = new Blob([imageBuffer], { type: imageType })
    const imageUrl = URL.createObjectURL(blob)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = imageUrl
    })
    
    // Create canvas for preprocessing
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }
    
    // Resize if image is too large (max 2000px) or too small (min 300px)
    const maxSize = 2000
    const minSize = 300
    let width = img.width
    let height = img.height
    
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height)
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
      console.log(`[OCR] Resizing large image to ${width}x${height}`)
    } else if (width < minSize || height < minSize) {
      const ratio = Math.max(minSize / width, minSize / height)
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
      console.log(`[OCR] Upscaling small image to ${width}x${height}`)
    }
    
    canvas.width = width
    canvas.height = height
    
    // Draw image to canvas
    ctx.drawImage(img, 0, 0, width, height)
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    
    // Apply preprocessing: enhance contrast and binarization
    console.log('[OCR] Applying contrast enhancement and binarization...')
    for (let i = 0; i < data.length; i += 4) {
      // Get RGB values
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Convert to grayscale
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      
      // Enhance contrast (increase difference between light and dark)
      let enhanced = gray
      if (gray < 128) {
        // Darken dark areas
        enhanced = gray * 0.7
      } else {
        // Lighten light areas
        enhanced = 128 + (gray - 128) * 1.3
      }
      
      // Binarization (threshold at 128)
      const binary = enhanced > 128 ? 255 : 0
      
      // Apply to all channels
      data[i] = binary     // R
      data[i + 1] = binary  // G
      data[i + 2] = binary  // B
      // Alpha channel stays the same
    }
    
    // Put processed image data back
    ctx.putImageData(imageData, 0, 0)
    
    // Convert canvas to blob then to ArrayBuffer
    const processedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob())
      }, 'image/png')
    })
    
    const processedBuffer = await processedBlob.arrayBuffer()
    
    // Cleanup
    URL.revokeObjectURL(imageUrl)
    
    console.log(`[OCR] ✅ Image preprocessed: ${imageBuffer.byteLength} -> ${processedBuffer.byteLength} bytes`)
    return processedBuffer
  } catch (error) {
    console.error('[OCR] Error preprocessing image:', error)
    // Return original buffer if preprocessing fails
    return imageBuffer instanceof ArrayBuffer ? imageBuffer : Buffer.from(imageBuffer).buffer
  }
}

export async function detectCriticalFromImage(
  imageBuffer: ArrayBuffer | Buffer,
  imageType: string = 'image/png'
): Promise<boolean> {
  try {
    console.log('[OCR] ========================================')
    console.log('[OCR] Running OCR on image to detect CRITICAL stamp...')
    console.log('[OCR] Image buffer size:', imageBuffer instanceof ArrayBuffer ? imageBuffer.byteLength : (imageBuffer as Buffer).length)
    console.log('[OCR] Image type:', imageType)
    
    // Validate buffer
    if (!imageBuffer || (imageBuffer instanceof ArrayBuffer && imageBuffer.byteLength === 0) || 
        (Buffer.isBuffer(imageBuffer) && imageBuffer.length === 0)) {
      console.error('[OCR] ❌ Invalid or empty image buffer')
      return false
    }
    
    // Convert Buffer to ArrayBuffer if needed
    let arrayBuffer: ArrayBuffer
    if (imageBuffer instanceof ArrayBuffer) {
      arrayBuffer = imageBuffer
    } else {
      arrayBuffer = imageBuffer.buffer.slice(
        imageBuffer.byteOffset,
        imageBuffer.byteOffset + imageBuffer.byteLength
      )
    }
    
    // Preprocess image for better OCR
    const processedBuffer = await preprocessImageForOCR(arrayBuffer, imageType)
    
    // Dynamic import tesseract.js
    console.log('[OCR] Loading Tesseract.js...')
    const Tesseract = await import('tesseract.js')
    console.log('[OCR] ✅ Tesseract.js loaded successfully')
    
    // Try multiple OCR modes for better detection
    const psmModes = [
      { mode: '11', name: 'Sparse text' }, // Good for stamps
      { mode: '6', name: 'Uniform block' }, // Single block
      { mode: '7', name: 'Single line' },   // Single line
      { mode: '8', name: 'Single word' },  // Treat as single word
      { mode: '13', name: 'Raw line' },   // Raw line (no layout analysis)
      { mode: '12', name: 'Sparse text with OSD' }, // Sparse text with orientation detection
    ]
    
    for (const psmConfig of psmModes) {
      try {
        console.log(`[OCR] Trying PSM mode ${psmConfig.mode} (${psmConfig.name})...`)
        
        // Create worker with optimized settings for stamp detection
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: (m) => {
            // Log OCR progress for debugging
            if (m.status === 'recognizing text' && m.progress % 0.25 < 0.01) {
              console.log(`[OCR] PSM ${psmConfig.mode} Progress:`, Math.round(m.progress * 100) + '%')
            }
          }
        })
        
        // Configure OCR for better stamp detection
        await worker.setParameters({
          tessedit_pageseg_mode: psmConfig.mode,
          tessedit_char_whitelist: 'CRITICALABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
          // Increase sensitivity for better detection
          tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine only
        })
        
        // Run OCR on preprocessed image
        console.log(`[OCR] PSM ${psmConfig.mode}: Starting OCR recognition...`)
        const result = await worker.recognize(processedBuffer)
        const { data: { text, words, symbols, lines } } = result
        
        // Terminate worker
        await worker.terminate()
        console.log(`[OCR] PSM ${psmConfig.mode}: Worker terminated`)
        
        // Log full OCR results for debugging
        const textUpper = text.toUpperCase().trim()
        console.log(`[OCR] PSM ${psmConfig.mode} - Extracted text:`, text || '(empty)')
        console.log(`[OCR] PSM ${psmConfig.mode} - Words:`, words?.map(w => w.text).join(' ') || 'none')
        console.log(`[OCR] PSM ${psmConfig.mode} - Lines:`, lines?.map(l => l.text).join(' | ') || 'none')
        
        // Check if CRITICAL text is found (multiple patterns)
        // Also check for common OCR mistakes (e.g., O instead of 0, I instead of 1, etc.)
        const normalizedText = textUpper
          .replace(/O/g, '0')  // O might be 0
          .replace(/I/g, '1')  // I might be 1
          .replace(/S/g, '5')  // S might be 5
          .replace(/Z/g, '2')  // Z might be 2
          .replace(/\s+/g, '') // Remove spaces
        
        // Remove all non-alphanumeric characters for matching
        const cleanText = textUpper.replace(/[^A-Z0-9]/g, '')
        const cleanNormalized = normalizedText.replace(/[^A-Z0-9]/g, '')
        
        // Define all possible substrings and variations of CRITICAL
        // CRITICAL = 8 characters
        const criticalPatterns = [
          'CRITICAL',      // Full word
          'CRITICA',       // Missing last letter
          'CRITIC',        // Missing last 2 letters
          'CRITI',         // Missing last 3 letters
          'CRIT',          // Missing last 4 letters
          'CRI',           // First 3 letters
          'TICAL',         // Last 5 letters (common OCR result)
          'RITICAL',       // Missing first letter
          'ITICAL',        // Missing first 2 letters
          'ICAL',          // Last 4 letters
          'CAL',           // Last 3 letters
          'AL',            // Last 2 letters (less reliable)
        ]
        
        // Check for fuzzy matches (allowing 1-2 character differences)
        const checkFuzzyMatch = (text: string, pattern: string): boolean => {
          if (text.length < pattern.length - 2) return false // Too short
          
          // Direct substring match
          if (text.includes(pattern)) return true
          
          // Check if pattern appears with 1-2 missing characters
          if (pattern.length >= 4) {
            // Try removing each character and check if it matches
            for (let i = 0; i < pattern.length; i++) {
              const patternWithoutChar = pattern.slice(0, i) + pattern.slice(i + 1)
              if (text.includes(patternWithoutChar) && patternWithoutChar.length >= 3) {
                return true
              }
            }
          }
          
          // Check character-by-character similarity (at least 70% match)
          let matches = 0
          for (let i = 0; i < Math.min(text.length, pattern.length); i++) {
            if (text[i] === pattern[i]) matches++
          }
          const similarity = matches / Math.max(text.length, pattern.length)
          if (similarity >= 0.7 && pattern.length >= 4) {
            return true
          }
          
          return false
        }
        
        // Check all patterns
        let hasCritical = false
        for (const pattern of criticalPatterns) {
          if (pattern.length < 3) continue // Skip very short patterns
          
          // Check in various text versions
          if (
            cleanText.includes(pattern) ||
            cleanNormalized.includes(pattern) ||
            textUpper.includes(pattern) ||
            normalizedText.includes(pattern) ||
            checkFuzzyMatch(cleanText, pattern) ||
            checkFuzzyMatch(cleanNormalized, pattern)
          ) {
            console.log(`[OCR] ✅ Found CRITICAL pattern: "${pattern}" in text`)
            hasCritical = true
            break
          }
        }
        
        // Also check for common OCR errors with numbers
        if (!hasCritical) {
          const ocrErrorPatterns = [
            /CR[0-9I]T[0-9I]CAL/i,      // CR1T1CAL, CRIT1CAL
            /CR[0-9I]T[0-9I]C/i,        // CR1T1C
            /CR[0-9I]T[0-9I]/i,         // CR1T1
            /[0-9I]RITICAL/i,            // 1RITICAL
            /CR[0-9I]TICAL/i,            // CR1TICAL
            /CRIT[0-9I]CAL/i,           // CRIT1CAL
            /CRITIC[0-9I]/i,            // CRITIC1
          ]
          
          for (const pattern of ocrErrorPatterns) {
            if (pattern.test(text) || pattern.test(cleanText) || pattern.test(cleanNormalized)) {
              console.log(`[OCR] ✅ Found CRITICAL OCR error pattern in text`)
              hasCritical = true
              break
            }
          }
        }
        
        // Check in words, symbols, and lines
        if (!hasCritical) {
          const checkInArray = (items: any[], getText: (item: any) => string) => {
            return items?.some(item => {
              const itemText = getText(item).toUpperCase().replace(/[^A-Z0-9]/g, '')
              for (const pattern of criticalPatterns) {
                if (pattern.length >= 3 && (
                  itemText.includes(pattern) ||
                  checkFuzzyMatch(itemText, pattern)
                )) {
                  return true
                }
              }
              return false
            })
          }
          
          hasCritical = 
            checkInArray(words, (w) => w.text) ||
            checkInArray(symbols, (s) => s.text) ||
            checkInArray(lines, (l) => l.text)
        }
        
        if (hasCritical) {
          console.log(`[OCR] ✅ CRITICAL detected in image using PSM mode ${psmConfig.mode}!`)
          console.log('[OCR] Detected text:', text)
          console.log('[OCR] Words:', words?.map(w => w.text).join(' '))
          console.log('[OCR] Lines:', lines?.map(l => l.text).join(' | '))
          return true
        }
      } catch (modeError) {
        console.warn(`[OCR] Error with PSM mode ${psmConfig.mode}:`, modeError)
        continue
      }
    }
    
    console.log('[OCR] ⚠️ CRITICAL not found in image after trying all OCR modes.')
    return false
  } catch (error) {
    console.error('[OCR] Error running OCR:', error)
    if (error instanceof Error) {
      console.error('[OCR] Error message:', error.message)
      console.error('[OCR] Error stack:', error.stack)
    }
    return false
  }
}

/**
 * Run OCR on multiple images and check if any contains CRITICAL text
 * @param images - Array of image objects with buffer and type
 * @returns Promise<boolean> - true if CRITICAL text is detected in any image
 */
export async function detectCriticalFromImages(
  images: Array<{ buffer: ArrayBuffer | Buffer; type: string }>
): Promise<boolean> {
  if (!images || images.length === 0) {
    return false
  }
  
  console.log(`[OCR] Checking ${images.length} image(s) for CRITICAL stamp...`)
  
  // Check each image
  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    const isCritical = await detectCriticalFromImage(image.buffer, image.type)
    
    if (isCritical) {
      console.log(`[OCR] ✅ CRITICAL detected in image ${i + 1} of ${images.length}`)
      return true
    }
  }
  
  console.log('[OCR] ⚠️ CRITICAL not detected in any images')
  return false
}

