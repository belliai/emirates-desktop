/**
 * Extract text content from different file formats
 * Uses mammoth for DOCX and pdfjs-dist for PDF parsing
 */

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
  if (fileName.endsWith('.md') || fileName.endsWith('.txt') || fileName.endsWith('.rtf')) {
    const text = await file.text()
    console.log('[v0] Text file extracted, length:', text.length)
    return text
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
