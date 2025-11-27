/**
 * Extract text content from different file formats
 * Uses mammoth for DOCX, pdfjs-dist for PDF parsing, and rtf-parser for RTF parsing
 */

/**
 * Extract text from RTF file using rtf-parser
 */
async function extractTextFromRTF(file: File): Promise<string> {
  try {
    // Dynamic import rtf-parser library
    const rtfParser = await import('rtf-parser')
    const text = await file.text()
    
    // Parse RTF and extract text content
    return new Promise((resolve, reject) => {
      try {
        rtfParser.string(text, (err: Error | null, doc: any) => {
          if (err) {
            console.error('[v0] Error parsing RTF with rtf-parser:', err)
            // Don't reject, fall through to fallback
            const strippedText = text
              .replace(/\\[a-z]+\d*\s?/gi, '') // Remove RTF control words
              .replace(/\{[^}]*\}/g, '') // Remove RTF groups
              .replace(/[{}]/g, '') // Remove remaining braces
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim()
            console.log('[v0] RTF fallback extraction after parser error, length:', strippedText.length)
            resolve(strippedText)
            return
          }
          
          // Extract text from RTF document structure
          let extractedText = ''
          
          function extractTextFromContent(content: any[]): void {
            if (!content || !Array.isArray(content)) return
            
            for (const item of content) {
              if (typeof item === 'string') {
                extractedText += item
              } else if (item.content) {
                extractTextFromContent(item.content)
              } else if (item.text) {
                extractedText += item.text
              }
            }
          }
          
          if (doc && doc.content) {
            extractTextFromContent(doc.content)
          }
          
          // If no text extracted, try to strip RTF control codes as fallback
          if (!extractedText || extractedText.trim().length === 0) {
            // Simple RTF control code stripping fallback
            extractedText = text
              .replace(/\\[a-z]+\d*\s?/gi, '') // Remove RTF control words
              .replace(/\{[^}]*\}/g, '') // Remove RTF groups
              .replace(/[{}]/g, '') // Remove remaining braces
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim()
          }
          
          console.log('[v0] RTF extraction successful, length:', extractedText.length)
          resolve(extractedText)
        })
      } catch (parseError) {
        console.error('[v0] Error calling rtf-parser:', parseError)
        // Fallback to control code stripping
        const strippedText = text
          .replace(/\\[a-z]+\d*\s?/gi, '') // Remove RTF control words
          .replace(/\{[^}]*\}/g, '') // Remove RTF groups
          .replace(/[{}]/g, '') // Remove remaining braces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
        console.log('[v0] RTF fallback extraction after exception, length:', strippedText.length)
        resolve(strippedText)
      }
    })
  } catch (error) {
    console.error('[v0] Error extracting RTF with rtf-parser:', error)
    // Fallback: try to strip RTF control codes manually
    try {
      const text = await file.text()
      const strippedText = text
        .replace(/\\[a-z]+\d*\s?/gi, '') // Remove RTF control words
        .replace(/\{[^}]*\}/g, '') // Remove RTF groups
        .replace(/[{}]/g, '') // Remove remaining braces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
      console.log('[v0] RTF fallback extraction, length:', strippedText.length)
      return strippedText
    } catch (fallbackError) {
      console.error('[v0] RTF fallback extraction failed:', fallbackError)
      return await file.text()
    }
  }
}

/**
 * Extract text from DOCX file using mammoth
 */
async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Dynamic import mammoth library
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    
    const result = await mammoth.extractRawText({ arrayBuffer })
    console.log('[v0] DOCX extraction successful, length:', result.value.length)
    return result.value
  } catch (error) {
    console.error('[v0] Error extracting DOCX with mammoth:', error)
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
    
    console.log('[v0] PDF extraction successful, length:', fullText.length)
    return fullText
  } catch (error) {
    console.error('[v0] Error extracting PDF with pdf.js:', error)
    // Fallback: try to read as text
    return await file.text()
  }
}

/**
 * Extract text from any supported file format
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  
  console.log('[v0] Extracting text from file:', fileName)
  
  // For markdown and text files, read as text
  if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
    const text = await file.text()
    console.log('[v0] Text file extracted, length:', text.length)
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
  console.log('[v0] Fallback text extraction, length:', text.length)
  return text
}
