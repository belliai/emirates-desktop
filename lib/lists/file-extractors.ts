/**
 * Extract text content from different file formats
 * Uses mammoth for DOCX, pdfjs-dist for PDF parsing, and rtf-stream-parser for RTF parsing
 */

/**
 * Light-weight RTF to text converter.
 * Preserves paragraph boundaries and decodes hex escapes while stripping control words.
 * IMPORTANT: Preserves spacing for table rows to ensure parser can match shipment patterns.
 */
function rtfToPlainText(rtf: string): string {
  // Normalize common control words to plaintext separators
  let text = rtf
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\line/gi, "\n")
    .replace(/\\tab/gi, "\t")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")

  // Decode hex escapes like \'e9 -> é
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )

  // Drop remaining control words (e.g., \b, \fs22, \ansi) but keep surrounding text
  // Skip table-related control words that might produce garbage text
  text = text.replace(/\\[a-zA-Z]+-?\d*(?:\s|)/g, "")

  // Remove braces that only define groups, but be careful with nested structures
  // First pass: remove empty braces
  text = text.replace(/\{[^}]*\}/g, (match) => {
    // If brace contains only control words or whitespace, remove it
    const content = match.slice(1, -1)
    if (!content.trim() || /^\\[a-zA-Z]+\d*\s*$/.test(content)) {
      return ""
    }
    return match
  })
  
  // Second pass: remove remaining braces (but preserve content)
  text = text.replace(/[{}]/g, "")

  // Split into lines for processing
  const lines = text.split("\n")
  const processedLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    
    // Check if this line looks like a table row (starts with 3 digits followed by AWB pattern)
    // Pattern: 3 digits, spaces, 3 digits-dash-8 digits (e.g., "001 176-92065120")
    const isTableRow = /^\d{3}\s+\d{3}-\d{8}/.test(line.trim())
    
    // Check if this line looks like a table header (contains "SER." and "AWB NO")
    const isTableHeader = /SER\./i.test(line) && /AWB\s+NO/i.test(line)
    
    // Check if this line looks like a separator (dashes, underscores, equals)
    const isSeparator = /^[_\-=\s]+$/.test(line.trim())
    
    if (isTableRow || isTableHeader || isSeparator) {
      // For table rows, preserve spacing more carefully
      // Normalize tabs to spaces but preserve multiple spaces
      line = line.replace(/\t/g, " ")
      // Only collapse spaces if there are more than 2 consecutive spaces (preserve table alignment)
      line = line.replace(/ {3,}/g, "  ") // Replace 3+ spaces with 2 spaces
      processedLines.push(line.trimEnd())
    } else {
      // For non-table lines, collapse whitespace normally
      line = line.trimEnd()
      line = line.replace(/[ \t]+/g, " ")
      processedLines.push(line)
    }
  }
  
  // Join lines and collapse excessive newlines
  text = processedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  
  // Final cleanup: remove any remaining RTF artifacts
  // Remove lines that are clearly RTF style definitions or binary data
  const finalLines = text.split("\n")
  const cleanedLines = finalLines.filter(line => {
    const trimmed = line.trim()
    // Skip empty lines (but keep single empty lines between sections)
    if (!trimmed) return true // Keep empty lines for structure
    
    // Skip RTF style table definitions
    if (trimmed.match(/^List\s+Table\s+\d+/i)) return false
    
    // Skip binary-looking data (long sequences of 0s, fs, or hex-like patterns)
    if (trimmed.match(/^[0f\s]{50,}$/i)) return false
    if (trimmed.match(/^[0-9a-f]{100,}$/i)) return false
    
    // Skip lines that are just RTF control codes
    if (trimmed.match(/^\\[a-zA-Z]+\d*\s*$/)) return false
    
    return true
  })
  
  // Rejoin, preserving structure but removing excessive empty lines
  text = cleanedLines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim()

  return text
}

/**
 * Extract text from RTF file using rtf-stream-parser first, then manual extraction as fallback
 */
async function extractTextFromRTF(file: File): Promise<string> {
  const rtfText = await file.text()
  
  // Method 1: Try using rtf-stream-parser (preferred method)
  try {
    console.log('[v0] Extracting RTF using rtf-stream-parser library...')
    const RTFStreamParserModule = await import('rtf-stream-parser')
    
    // Try different ways to access the parser
    const RTFStreamParser = RTFStreamParserModule.default || RTFStreamParserModule
    
    let textContent = ''
    let parser: any
    
    // Try different initialization methods
    if (typeof RTFStreamParser === 'function') {
      parser = new RTFStreamParser()
    } else if (RTFStreamParser.default && typeof RTFStreamParser.default === 'function') {
      parser = new RTFStreamParser.default()
    } else {
      throw new Error('Could not initialize rtf-stream-parser')
    }
    
    // Set up event listeners
    if (parser.on) {
      const extractedText = await new Promise<string>((resolve, reject) => {
        parser.on('text', (text: string) => {
          textContent += text
        })
        
        parser.on('paragraph', () => {
          textContent += '\n'
        })
        
        parser.on('error', (err: Error) => {
          console.error('[v0] rtf-stream-parser error:', err)
          reject(err)
        })
        
        parser.on('end', () => {
          const text = textContent.trim()
          if (text && text.length > 100) {
            resolve(text)
          } else {
            reject(new Error('rtf-stream-parser extracted too little text'))
          }
        })
        
        // Parse the RTF content
        if (parser.write) {
          parser.write(rtfText)
          parser.end()
        } else {
          reject(new Error('rtf-stream-parser API not recognized'))
        }
      })
      
      console.log('[v0] ✅ Successfully extracted RTF using rtf-stream-parser, length:', extractedText.length)
      
      // Check for table header
      if (extractedText.includes("SER") && extractedText.includes("AWB")) {
        console.log('[v0] ✅ Table header found in rtf-stream-parser extraction')
      }
      
      // Check for shipment-like lines
      const shipmentLines = extractedText.split("\n").filter(l => /^\d{3}\s+\d{3}-\d{8}/.test(l.trim())).slice(0, 5)
      if (shipmentLines.length > 0) {
        console.log('[v0] ✅ Found shipment-like lines in rtf-stream-parser:', shipmentLines.length)
      }
      
      return extractedText
    } else {
      throw new Error('rtf-stream-parser API not recognized')
    }
  } catch (streamParserError) {
    console.warn('[v0] rtf-stream-parser also failed, trying manual extraction:', streamParserError)
    
    // Method 2: Manual RTF extraction (fallback)
    try {
      const text = await file.text()
      const strippedText = rtfToPlainText(text)
      console.log('[v0] RTF manual extraction, length:', strippedText.length)
      
      // Log sample and check for content
      const sample = strippedText.substring(0, 1000)
      console.log('[v0] Sample manual RTF extraction:', sample)
      
      // Check for table header
      if (strippedText.includes("SER") && strippedText.includes("AWB")) {
        console.log('[v0] ✅ Table header found in manual RTF extraction')
      } else {
        console.warn('[v0] ⚠️ Table header not found in manual RTF extraction')
      }
      
      // Check for shipment-like lines
      const shipmentLines = strippedText.split("\n").filter(l => /^\d{3}\s+\d{3}-\d{8}/.test(l.trim())).slice(0, 5)
      if (shipmentLines.length > 0) {
        console.log('[v0] ✅ Found shipment-like lines in manual RTF:', shipmentLines.map(l => l.substring(0, 150)))
      } else {
        console.warn('[v0] ⚠️ No shipment-like lines found in manual RTF extraction')
      }
      
      return strippedText
    } catch (fallbackError) {
      console.error('[v0] RTF manual extraction also failed:', fallbackError)
      
      // Method 3: Try DOCX conversion as last resort
      console.warn('[v0] Trying DOCX conversion as last resort...')
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/convert-rtf-to-docx', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const docxBlob = await response.blob()
          const docxFile = new File([docxBlob], file.name.replace(/\.rtf$/i, '.docx'), {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          })
          console.log('[v0] RTF converted to DOCX, extracting text...')
          return await extractTextFromDOCX(docxFile)
        } else {
          throw new Error('DOCX conversion failed')
        }
      } catch (docxError) {
        console.error('[v0] All RTF extraction methods failed:', docxError)
        throw new Error('Failed to extract text from RTF file using all methods')
      }
    }
  }
}

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
  
  // For RTF files - parse similar to DOCX
  if (fileName.endsWith('.rtf')) {
    return await extractTextFromRTF(file)
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
