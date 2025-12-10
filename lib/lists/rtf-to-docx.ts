import { execFile } from "child_process"
import { mkdtemp, readFile, rm, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

/**
 * Convert an RTF File to DOCX using pandoc (must be available on the host).
 * Returns the DOCX file contents as a Buffer.
 * Throws with a clear error message if pandoc is missing or conversion fails.
 */
export async function convertRtfToDocx(file: File): Promise<Buffer> {
  // Create a temp working directory
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "rtf-pandoc-"))
  const rtfPath = path.join(tmpDir, "input.rtf")
  const docxPath = path.join(tmpDir, "output.docx")

  try {
    // Persist the uploaded RTF to disk
    const rtfBuffer = Buffer.from(await file.arrayBuffer())
    await writeFile(rtfPath, rtfBuffer)

    // Run pandoc: RTF -> DOCX
    try {
      await execFileAsync("pandoc", [rtfPath, "-o", docxPath], { timeout: 20000 })
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        throw new Error("pandoc is not installed or not on PATH. Please install pandoc and try again.")
      }
      const stderr = error?.stderr?.toString?.() || ""
      throw new Error(`pandoc conversion failed${stderr ? `: ${stderr}` : ""}`)
    }

    // Read the generated DOCX
    const docxBuffer = await readFile(docxPath)
    if (!docxBuffer || docxBuffer.length === 0) {
      throw new Error("pandoc produced an empty DOCX file.")
    }

    return docxBuffer
  } finally {
    // Clean up temp files/directories
    await rm(tmpDir, { recursive: true, force: true })
  }
}

