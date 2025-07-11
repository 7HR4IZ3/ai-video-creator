import { chromium } from "playwright";
import path from "path";

const YOUTUBE_VIDEOS = [
  "https://www.youtube.com/watch?v=olMxyuzxVDs",
  "https://www.youtube.com/watch?v=TTXcHEMfLb4",
  "https://www.youtube.com/watch?v=Lfcesi0mGlo",
  "https://www.youtube.com/watch?v=ebnQsTk9s-s",
];

const OUTPUT_DIR = "media/videos";

async function downloadVideo(videoUrl: string) {
  const browser = await chromium.launch({
    headless: true,
  });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    // The website might open popups, so we handle them by closing them immediately.
    page.on("popup", (popup) => popup.close());

    await page.goto("https://ddownr.com/en/4k-youtube-downloader");

    await page.getByPlaceholder("Paste Your URL...").fill(videoUrl);

    // The first click on "Download" might trigger a popup.
    // We wait for the popup event to be safe.
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Download" }).click();
    await popupPromise; // The popup is closed by the event handler above.

    // Now, we wait for the real download link to appear and click it.
    const downloadLink = page.getByRole("link", {
      name: "Download",
      exact: true,
    });
    await downloadLink.waitFor({ state: "visible", timeout: 120000 }); // Wait up to 2 minutes

    const downloadPromise = page.waitForEvent("download");
    await downloadLink.click({ timeout: 0 });

    const download = await downloadPromise;

    // Save the download to a file with a dynamic name
    // const suggestedFilename = download.suggestedFilename();
    const outputPath = path.join(OUTPUT_DIR, "minecraft.mp4");
    await download.saveAs(outputPath);

    console.log(`Successfully downloaded video to ${outputPath}`);
  } catch (error) {
    console.error("An error occurred while downloading the video:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

async function main() {
  const videoUrlFromArgs = process.argv[2];
  const videoUrl =
    videoUrlFromArgs ||
    YOUTUBE_VIDEOS[Math.floor(Math.random() * YOUTUBE_VIDEOS.length)];

  if (!videoUrl) {
    console.error(
      "Please provide a YouTube URL as an argument or ensure the YOUTUBE_VIDEOS list is not empty.",
    );
    process.exit(1);
  }

  console.log(`Attempting to download video from: ${videoUrl}`);
  await downloadVideo(videoUrl);
}

main().catch((error) => {
  console.error("A critical error occurred:", error);
  process.exit(1);
});
