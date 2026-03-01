const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");


const createCertificate = async (data) => {
    try {
        // 1. Read HTML template
        const templatePath = path.join(__dirname, "../templates/certificate.html");
        let html = fs.readFileSync(templatePath, "utf-8");

        // 2. Replace placeholders
        html = html
            .replace("{{courseName}}", data.courseName)
            .replace("{{studentName}}", data.studentName)
            .replace("{{completionDate}}", data.completionDate)
            .replace("{{certificateId}}", data.certificateId)
            .replace("{{signatureUrl}}", data.signatureUrl)
            .replace("{{authorityName}}", data.authorityName)
            .replace("{{currentYear}}",data.currentYear)
            .replace("{{authorityTitle}}", data.authorityTitle);

        // 3. Create folder if not exists
        const outputDir = path.join(__dirname, "../uploads/certificates");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const outputPath = path.join(outputDir, `${data.certificateId}.png`);

        // 4. Launch browser
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();

        // Set viewport same as PDF dimensions
        await page.setViewport({
            width: 1400,
            height: 900,
            deviceScaleFactor: 2, // optional, makes image sharper
        });

        await page.setContent(html, { waitUntil: "networkidle0" });

        // 5️⃣ Take screenshot
        await page.screenshot({
            path: outputPath,
            fullPage: false, // we only want the viewport size
            type: "png",
        });


        await browser.close();
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            success: true,
            message: "Certificate generated successfully",
            path: outputPath
        };

    } catch (error) {
        console.error("Certificate generation failed:", error);
        return {
            success: false,
            message: "Certificate generation failed"
        };
    }
}


module.exports = createCertificate;


