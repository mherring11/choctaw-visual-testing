import { test, expect } from '@playwright/test';
import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import config from '../config.js';

test.describe('Visual Comparison Tests', () => {
  test('Compare staging and production screenshots', async ({ browser }) => {
    // Create a new context with HTTP credentials for the staging site
    const context = await browser.newContext({
      httpCredentials: {
        username: 'choctawcstg',
        password: 'chl_choctawcstg'
      }
    });
    const page = await context.newPage();

    // Ensure screenshots directories exist
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    if (!fs.existsSync('screenshots/staging')) fs.mkdirSync('screenshots/staging');
    if (!fs.existsSync('screenshots/prod')) fs.mkdirSync('screenshots/prod');
    if (!fs.existsSync('screenshots/diff')) fs.mkdirSync('screenshots/diff');

    for (let i = 0; i < config.staging.urls.length; i++) {
      const pagePath = config.staging.urls[i];
      const stagingUrl = `${config.staging.baseUrl}/${pagePath}`;
      const prodUrl = `${config.prod.baseUrl}/${pagePath}`;
      const stagingScreenshotPath = `screenshots/staging/${pagePath || 'home'}.png`;
      const prodScreenshotPath = `screenshots/prod/${pagePath || 'home'}.png`;
      const diffScreenshotPath = `screenshots/diff/${pagePath || 'home'}.png`;

      console.log(`Testing page: ${pagePath || 'home'}`);

      try {
        // Capture staging and production screenshots with retries
        await captureScreenshot(page, stagingUrl, stagingScreenshotPath);
        await captureScreenshot(page, prodUrl, prodScreenshotPath);

        // Compare screenshots and save the diff image
        const similarityPercentage = compareScreenshots(stagingScreenshotPath, prodScreenshotPath, diffScreenshotPath);

        if (similarityPercentage === -1) {
          console.log(`Size mismatch detected for page: ${pagePath || 'home'}`);
        } else {
          console.log(`Similarity percentage for page ${pagePath || 'home'}: ${similarityPercentage.toFixed(2)}%`);
        }
      } catch (error) {
        console.log(`Error testing page: ${pagePath || 'home'} - ${error.message}`);
      }
    }
  }, { timeout: 150000 }); // Set the overall test timeout to 2 minutes
});

// Helper function to capture screenshots with retries
async function captureScreenshot(page, url, path) {
  let attempts = 0;
  const maxAttempts = 3;
  const timeout = 120000; // 2 minutes

  while (attempts < maxAttempts) {
    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      // Use 'networkidle' or 'load' depending on page behavior
      await page.goto(url, { waitUntil: 'networkidle', timeout });
      await page.screenshot({ path });
      break; // Exit loop if successful
    } catch (error) {
      attempts++;
      console.log(`Attempt ${attempts} failed for ${url}. Retrying...`);
      if (attempts === maxAttempts) {
        console.log(`Failed to load ${url} after ${maxAttempts} attempts`);
        throw new Error(`Failed to load ${url} after ${maxAttempts} attempts`);
      }
    }
  }
}

// Helper function to compare screenshots and return similarity percentage
function compareScreenshots(stagingPath, prodPath, diffPath) {
  const img1 = PNG.sync.read(fs.readFileSync(stagingPath));
  const img2 = PNG.sync.read(fs.readFileSync(prodPath));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.log(`Skipping comparison for ${stagingPath} and ${prodPath} due to size mismatch.`);
    return -1;
  }

  const diff = new PNG({ width: img1.width, height: img1.height });
  const mismatchedPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.1 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = img1.width * img1.height;
  const matchedPixels = totalPixels - mismatchedPixels;
  const similarityPercentage = (matchedPixels / totalPixels) * 100;

  console.log(`Mismatched pixels for ${stagingPath} vs ${prodPath}: ${mismatchedPixels}`);
  return similarityPercentage;
}
