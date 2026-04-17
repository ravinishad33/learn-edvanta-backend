const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const fs = require("fs");
const path = require("path");

const isProd = process.env.NODE_ENV === "production";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createCertificate = async (data) => {
    let browser;

    try {
        // 1. Load template
        const templatePath = path.join(__dirname, "../templates/certificate.html");
        let html = fs.readFileSync(templatePath, "utf-8");

        html = html
            .replace("{{courseName}}", data.courseName)
            .replace("{{studentName}}", data.studentName)
            .replace("{{completionDate}}", data.completionDate)
            .replace("{{certificateId}}", data.certificateId)
            .replace("{{logoUrl}}", data.logoIconUrl)
            .replace("{{qrcode}}", data.qrCode)
            .replace("{{signatureUrl}}", data.signatureUrl)
            .replace("{{authorityName}}", data.authorityName)
            .replace("{{authorityTitle}}", data.authorityTitle);

        // 2. Output path
        const outputDir = path.join(__dirname, "../uploads/certificates");
        fs.mkdirSync(outputDir, { recursive: true });

        const outputPath = path.join(outputDir, `${data.certificateId}.png`);

        // 3. Launch browser (DEV vs PROD)
        browser = isProd
            ? await puppeteerCore.launch({
                  args: chromium.args,
                  executablePath: await chromium.executablePath(),
                  headless: chromium.headless,
              })
            : await puppeteer.launch({
                  headless: true,
              });

        const page = await browser.newPage();

        // 4. Viewport
        await page.setViewport({
            width: 1400,
            height: 900,
            deviceScaleFactor: 2,
        });

        // 5. Load HTML
        await page.setContent(html, { waitUntil: "domcontentloaded" });

        // 6. Wait for images
        await page.evaluate(() => {
            return Promise.all(
                Array.from(document.images).map((img) => {
                    if (img.complete) return;
                    return new Promise((resolve) => {
                        img.onload = img.onerror = resolve;
                    });
                })
            );
        });

        // 7. Wait (compatible fix for old Puppeteer)
        await delay(500);

        // 8. Screenshot
        await page.screenshot({
            path: outputPath,
            type: "png",
            fullPage: true,
        });

        await browser.close();

        return {
            success: true,
            path: outputPath,
        };

    } catch (error) {
        if (browser) await browser.close();

        console.error("Certificate generation failed:", error);

        return {
            success: false,
            message: error.message,
        };
    }
};

module.exports = createCertificate;