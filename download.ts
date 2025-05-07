import { chromium } from "playwright";

const YOUTUBE_VIDEOS = [
  "https://www.youtube.com/watch?v=olMxyuzxVDs",
  "https://www.youtube.com/watch?v=TTXcHEMfLb4",
  "https://www.youtube.com/watch?v=Lfcesi0mGlo",
  "https://www.youtube.com/watch?v=ebnQsTk9s-s",
];

const VIDEO_URL =
  YOUTUBE_VIDEOS[Math.floor(Math.random() * YOUTUBE_VIDEOS.length)];

const browser = await chromium.launch({
  headless: true,
});
const context = await browser.newContext();
const page = await context.newPage();

await page.goto("https://ddownr.com/en/4k-youtube-downloader");
await page.getByPlaceholder("Paste Your URL...").click();
await page.getByPlaceholder("Paste Your URL...").fill(VIDEO_URL);

page.on("popup", async (popup) => {
  await popup.close();
});

page.on("download", async (download) => {
  await download.saveAs("media/videos/minecraft.mp4");
  await page.close();
  await context.close();
  await browser.close();
});

const page1Promise = page.waitForEvent("popup");
await page.getByRole("button", { name: "Download" }).click();
const page1 = await page1Promise;
await page1.close();

await page
  .getByRole("link", { name: "Download", exact: true })
  .click({ timeout: 0 });
