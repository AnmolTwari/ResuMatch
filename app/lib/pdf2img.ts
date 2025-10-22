export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    isLoading = true;
    // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.mjs",
            import.meta.url
        ).toString();

        pdfjsLib = lib;
        isLoading = false;
        return lib;
    });


    return loadPromise;
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        const lib = await loadPdfJs();
console.log("📄 Starting PDF conversion for:", file.name);
const arrayBuffer = await file.arrayBuffer();
console.log("✅ File loaded into memory");

const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
console.log("✅ PDF loaded successfully");

const page = await pdf.getPage(1);
console.log("✅ Got first page");

const viewport = page.getViewport({ scale: 4 });
console.log("✅ Viewport created:", viewport.width, viewport.height);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
        }

        await page.render({ canvasContext: context!, viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Create a File from the blob with the same name as the pdf
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to create image blob",
                        });
                    }
                },
                "image/png",
                1.0
            ); // Set quality to maximum (1.0)
        });
    } catch (err: any) {
    console.error("🔴 PDF conversion failed:", err); // 👈 shows full stack trace in browser console

    return {
        imageUrl: "",
        file: null,
        error: `Failed to convert PDF: ${err?.message || err}`,
    };
}
}
