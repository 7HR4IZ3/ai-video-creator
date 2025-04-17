import fs from "fs";
import path from "path";
import { CWD } from "../constants";

export async function saveToFilesystem(
  filePath: string,
  title: string,
  description: string,
  options: Record<string, any> = {}
) {
  try {
    const outputDir = options.outputDir || path.join(CWD, "media/published");

    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate a safe filename from the title
    const safeTitle = title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .substring(0, 50);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFilename = `${safeTitle}_${timestamp}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    // Copy the file to the output directory
    fs.copyFileSync(filePath, outputPath);

    // Create a metadata file with the title and description
    const metadataPath = path.join(outputDir, `${outputFilename}.json`);
    fs.writeFileSync(
      metadataPath,
      JSON.stringify(
        {
          title,
          description,
          originalPath: filePath,
          createdAt: new Date().toISOString(),
          ...options,
        },
        null,
        2
      )
    );

    return {
      success: true,
      videoUrl: `file://${outputPath}`,
    };
  } catch (error) {
    console.error("Filesystem save error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
