import { test, expect } from '@playwright/test';
import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import config from '../config.js';

test.describe('Visual Comparison Tests', () => {
  test('Compare staging and production screenshots', async ({ browser }) => {
    const context = await browser.newContext({
      httpCredentials: {
        username: 'choctawcstg',
        password: 'chl_choctawcstg'
      }
    });
    const page = await context.newPage();

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
        await captureScreenshot(page, stagingUrl, stagingScreenshotPath);
        await captureScreenshot(page, prodUrl, prodScreenshotPath);

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
  }, { timeout: 150000 });
});

async function captureScreenshot(page, url, path) {
  let attempts = 0;
  const maxAttempts = 3;
  const timeout = 150000;

  while (attempts < maxAttempts) {
    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(url, { waitUntil: 'networkidle', timeout });
      await page.screenshot({ path });
      break;
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
