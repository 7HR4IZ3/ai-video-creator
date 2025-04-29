import { chromium } from "playwright";

const VIDEO_URL = "https://www.youtube.com/watch?v=u7kdVe8q5zs";

const browser = await chromium.launch({
  headless: false,
});
const context = await browser.newContext();
const page = await context.newPage();
await page.goto("https://ddownr.com/en/4k-youtube-downloader");
await page.getByPlaceholder("Paste Your URL...").click();
await page
  .getByPlaceholder("Paste Your URL...")
  .fill(
    "https://www.youtube.com/watch?v=Lfcesi0mGlo&pp=ygUZIG5vIGNvcHl3cmlnaHQgc2F0aXNmeWluZw%3D%3D"
  );

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
  .click({ timeout: Infinity });

