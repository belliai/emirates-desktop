type WasmPandoc = {
  convert: (
    input: string,
    from: string,
    to: string,
    options?: Record<string, unknown>
  ) => Promise<Uint8Array | ArrayBuffer>
}

let pandocInstance: WasmPandoc | null = null
let loadPromise: Promise<WasmPandoc> | null = null
let fetchPatched = false

const PANDOC_ASSET_MAP: Record<string, string> = {
  "pandoc-wasm.wasm.gz": "/pandoc-wasm.wasm.gz",
  "pandoc-data.data.gz": "/pandoc-data.data.gz",
  "pandoc-data.metadata": "/pandoc-data.metadata",
}

function getRequestUrl(input: RequestInfo | URL): string | null {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  if (typeof Request !== "undefined" && input instanceof Request) return input.url
  return null
}

function getDecoder(): TextDecoder {
  return new TextDecoder("utf-8")
}

async function loadPandoc(): Promise<WasmPandoc> {
  if (pandocInstance) return pandocInstance
  if (!loadPromise) {
    loadPromise = (async () => {
      if (!fetchPatched) {
        const originalFetch = globalThis.fetch

        // Redirect pandoc asset requests to our self-hosted copies under /public.
        const mappedFetch: typeof fetch = (input: RequestInfo | URL, init?: RequestInit) => {
          const url = getRequestUrl(input)
          if (url) {
            const hit = Object.keys(PANDOC_ASSET_MAP).find((asset) => url.includes(asset))
            if (hit) return originalFetch(PANDOC_ASSET_MAP[hit], init)
          }
          return originalFetch(input as RequestInfo, init)
        }

        globalThis.fetch = mappedFetch
        fetchPatched = true
      }
      try {
        // `pandoc-wasm` exposes a default loader that returns an object with `convert`.
        const mod: any = await import("pandoc-wasm")
        const createPandoc = mod?.default ?? mod
        if (typeof createPandoc !== "function") {
          throw new Error("pandoc-wasm module did not expose a loader function.")
        }
        const instance = await createPandoc()
        if (!instance?.convert) {
          throw new Error("pandoc-wasm failed to initialize.")
        }
        pandocInstance = instance
        return instance
      }
    })()
  }
  return loadPromise
}

function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("pandoc-wasm timed out")), ms)
    promise
      .then((value) => {
        clearTimeout(id)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(id)
        reject(error)
      })
  })
}

/**
 * Convert RTF -> DOCX client-side using pandoc-wasm.
 * Intended for browser use when the server pandoc is unavailable.
 */
export async function convertRtfToDocxWasm(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer()
  const rtfText = getDecoder().decode(arrayBuffer)

  const pandoc = await loadPandoc()
  const outputBuffer = await withTimeout(
    pandoc.convert(rtfText, "rtf", "docx"),
    20000
  )

  const bytes =
    outputBuffer instanceof Uint8Array
      ? outputBuffer
      : new Uint8Array(outputBuffer)

  const docxFile = new File([bytes], file.name.replace(/\.rtf$/i, ".docx"), {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })

  if (docxFile.size === 0) {
    throw new Error("pandoc-wasm produced an empty DOCX file.")
  }

  return docxFile
}

