
import fs from "node:fs";
import path from "node:path";


export class AsyncQueue<T> {
  constructor(private queue: (() => Promise<any>)[] = []) {}

  async add(fn: () => Promise<any>) {
    this.queue.push(fn);
  }

  async run(config: { concurrency: number}): Promise<T[]> {
    const { concurrency } = config;
    const queue = [...this.queue];
    let runResults: T[] = [];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      if (batch.length) {
        const results = await Promise.all(
          batch.map((fn) => fn())
        );
        runResults  = [...runResults, ...results];
      }

      console.log(queue.length)
    }

    return runResults;
  }
}

export async function readAsReadable({ directoryPath, filePath }: { directoryPath?: string, filePath?: string }) {
  try {
    if (!filePath && !directoryPath)
      throw new Error("No file or directory path provided.");

    if (directoryPath) {
      // Read the directory and get the list of files
      const files = await fs.promises.readdir(directoryPath);
  
      if (files.length === 0)
        throw new Error('No files found in the directory.');
 
      // Get the first file in the directory
      const firstFile = files.filter(file => file.endsWith('.mp4'))[0];
      filePath = path.join(directoryPath, firstFile);
    }

    // Create a readable stream for the first file
    const readableStream = fs.createReadStream(filePath as string);

    // Return the readable object and the source path
    return {
      stream: readableStream,
      src: filePath as string,
    };
  } catch (error) {
    console.error('Error reading the first file:', error);
    throw error;
  }
}
