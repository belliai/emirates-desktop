/**
 * Extract text content from different file formats.
 * Uses mammoth for DOCX and pdfjs-dist for PDF parsing.
 */

/**
 * Extract images from DOCX file
 * DOCX files are ZIP archives, so we can extract images directly from the ZIP structure
 */
export async function extractImagesFromDOCX(file: File): Promise<Array<{ buffer: ArrayBuffer; type: string }>> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    
    // DOCX files are ZIP archives
    // Images are stored in word/media/ folder
    // Use JSZip to extract images directly
    try {
      const JSZip = await import('jszip')
      const zip = await JSZip.default.loadAsync(arrayBuffer)
      
      const images: Array<{ buffer: ArrayBuffer; type: string }> = []
      
      // Find all files in word/media/ folder (where DOCX stores images)
      const mediaFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('word/media/') && 
        !name.endsWith('/') &&
        /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(name)
      )
      
      // Extract each image
      for (const fileName of mediaFiles) {
        try {
          const file = zip.files[fileName]
          if (!file || file.dir) continue
          
          const imageBuffer = await file.async('arraybuffer')
          const extension = fileName.split('.').pop()?.toLowerCase() || 'png'
          const contentType = extension === 'jpg' || extension === 'jpeg' 
            ? 'image/jpeg' 
            : extension === 'png'
            ? 'image/png'
            : extension === 'gif'
            ? 'image/gif'
            : extension === 'bmp'
            ? 'image/bmp'
            : extension === 'webp'
            ? 'image/webp'
            : 'image/png'
          
          if (imageBuffer && imageBuffer.byteLength > 0) {
            images.push({
              buffer: imageBuffer,
              type: contentType
            })
          }
        } catch (imgError) {
          // Error extracting image
        }
      }
      
      if (images.length > 0) {
        return images
      } else {
        return []
      }
    } catch (zipError) {
      // Fallback: try mammoth convertToHtml to extract base64 images
      try {
        const mammoth = await import('mammoth')
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
        
        // Extract base64 images from HTML
        const base64Images: Array<{ buffer: ArrayBuffer; type: string }> = []
        const imgRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"/gi
        let match
        
        while ((match = imgRegex.exec(htmlResult.value)) !== null) {
          try {
            const imageType = match[1] // png, jpeg, etc.
            const base64Data = match[2]
            const binaryString = atob(base64Data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            
            base64Images.push({
              buffer: bytes.buffer,
              type: `image/${imageType}`
            })
          } catch (base64Error) {
            // Error processing base64 image
          }
        }
        
        if (base64Images.length > 0) {
          return base64Images
        }
      } catch (htmlError) {
        // convertToHtml also failed
      }
      
      return []
    }
    
    const images: Array<{ buffer: ArrayBuffer; type: string }> = []
    
    for (let i = 0; i < imagesResult.length; i++) {
      const image = imagesResult[i]
      try {
        // image.src can be Buffer (Node.js) or ArrayBuffer (browser)
        let buffer: ArrayBuffer
        
        if (image.src instanceof ArrayBuffer) {
          buffer = image.src
        } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(image.src)) {
          // Convert Node.js Buffer to ArrayBuffer
          buffer = image.src.buffer.slice(
            image.src.byteOffset,
            image.src.byteOffset + image.src.byteLength
          )
        } else if (image.src instanceof Uint8Array) {
          buffer = image.src.buffer
        } else if (image.src && typeof image.src === 'object' && 'buffer' in image.src) {
          // Handle case where src might be a Buffer-like object
          const src = image.src as any
          if (src.buffer instanceof ArrayBuffer) {
            buffer = src.buffer.slice(src.byteOffset || 0, (src.byteOffset || 0) + (src.byteLength || src.length || 0))
          } else {
            // Try to convert to Uint8Array first
            const length = src.length || src.byteLength || 0
            const uint8Array = new Uint8Array(length)
            if (src.copy) {
              src.copy(uint8Array)
            } else {
              for (let j = 0; j < length; j++) {
                uint8Array[j] = src[j] || 0
              }
            }
            buffer = uint8Array.buffer
          }
        } else {
          // Try to convert to ArrayBuffer
          try {
            // Try different conversion methods
            if (Array.isArray(image.src)) {
              buffer = new Uint8Array(image.src).buffer
            } else if (typeof image.src === 'string') {
              // Base64 string
              const binaryString = atob(image.src)
              const bytes = new Uint8Array(binaryString.length)
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j)
              }
              buffer = bytes.buffer
            } else {
              const uint8Array = new Uint8Array(image.src as any)
              buffer = uint8Array.buffer
            }
          } catch (convError) {
            continue
          }
        }
        
        // Determine image type from content type or extension
        const contentType = image.contentType || 'image/png'
        
        if (buffer && buffer.byteLength > 0) {
          images.push({
            buffer,
            type: contentType
          })
        }
      } catch (imgError) {
        // Error processing image
      }
    }
    
    return images
  } catch (error) {
    return []
  }
}

/**
 * Extract text from DOCX file using mammoth
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Dynamic import mammoth library
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (error) {
    // Fallback: try to read as text
    return await file.text()
  }
}

/**
 * Extract text from PDF file using pdf.js
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamic import pdf.js library
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set worker path
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    let fullText = ''
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }
    
    return fullText
  } catch (error) {
    // Fallback: try to read as text
    return await file.text()
  }
}

/**
 * Extract text from any supported file format
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  
  // For markdown and text files, read as text
  if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
    const text = await file.text()
    return text
  }

  // RTF conversion is handled via pandoc API; avoid parsing here.
  if (fileName.endsWith('.rtf')) {
    throw new Error("RTF parsing is not supported locally. Convert via the RTF->DOCX API first.")
  }
  
  // For DOCX files
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return await extractTextFromDOCX(file)
  }
  
  // For PDF files
  if (fileName.endsWith('.pdf')) {
    return await extractTextFromPDF(file)
  }
  
  // Fallback to text reading
  const text = await file.text()
  return text
}
