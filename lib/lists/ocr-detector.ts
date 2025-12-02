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
export async function detectCriticalFromImage(
  imageBuffer: ArrayBuffer | Buffer,
  imageType: string = 'image/png'
): Promise<boolean> {
  try {
    console.log('[OCR] Running OCR on image to detect CRITICAL stamp...')
    console.log('[OCR] Image buffer size:', imageBuffer instanceof ArrayBuffer ? imageBuffer.byteLength : (imageBuffer as Buffer).length)
    console.log('[OCR] Image type:', imageType)
    
    // Dynamic import tesseract.js
    const Tesseract = await import('tesseract.js')
    
    // Try multiple OCR modes for better detection
    const psmModes = [
      { mode: '11', name: 'Sparse text' }, // Good for stamps
      { mode: '8', name: 'Single word' },  // Treat as single word
      { mode: '6', name: 'Uniform block' }, // Single block
      { mode: '7', name: 'Single line' },   // Single line
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
        })
        
        // Run OCR on image
        const { data: { text, words, symbols, lines } } = await worker.recognize(imageBuffer)
        
        // Terminate worker
        await worker.terminate()
        
        // Log full OCR results for debugging
        const textUpper = text.toUpperCase().trim()
        console.log(`[OCR] PSM ${psmConfig.mode} - Extracted text:`, text || '(empty)')
        console.log(`[OCR] PSM ${psmConfig.mode} - Words:`, words?.map(w => w.text).join(' ') || 'none')
        console.log(`[OCR] PSM ${psmConfig.mode} - Lines:`, lines?.map(l => l.text).join(' | ') || 'none')
        
        // Check if CRITICAL text is found (multiple patterns)
        const hasCritical = 
          textUpper.includes('CRITICAL') ||
          /CRITICAL/i.test(text) ||
          textUpper.includes('CRITIC') || // Partial match
          textUpper.includes('CRIT') || // Even more partial
          textUpper.includes('CRITI') || // More partial
          (words && words.some(w => {
            const wordUpper = w.text.toUpperCase()
            return wordUpper.includes('CRITICAL') || 
                   wordUpper.includes('CRITIC') || 
                   wordUpper.includes('CRIT')
          })) ||
          (symbols && symbols.some(s => {
            const symbolUpper = s.text.toUpperCase()
            return symbolUpper.includes('CRITICAL') || 
                   symbolUpper.includes('CRITIC') || 
                   symbolUpper.includes('CRIT')
          })) ||
          (lines && lines.some(l => {
            const lineUpper = l.text.toUpperCase()
            return lineUpper.includes('CRITICAL') || 
                   lineUpper.includes('CRITIC') || 
                   lineUpper.includes('CRIT')
          }))
        
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

