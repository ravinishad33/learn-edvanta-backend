const QRCode=require("qrcode");
const generateQRCode = async (certificateUrl) => {
    try {
        return await QRCode.toDataURL(certificateUrl); // returns base64 image
    } catch (err) {
        console.error("QR Code generation failed:", err);
        return null;
    }
};
module.exports=generateQRCode;