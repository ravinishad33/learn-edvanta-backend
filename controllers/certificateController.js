const { User } = require("../models/userModel");
const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const Certificate = require("../models/certificateModel");
const createCertificate = require("../utils/generateCertificate");
const fs = require("fs");
const { uploadOnCloudinary } = require("../utils/cloudinary");




const generateCertificate = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.userId;

        // 1️⃣ Validate student
        const user = await User.findById(userId);
        if (!user || user.role !== "student") {
            return res.status(403).json({
                success: false,
                message: "Only students can generate certificates",
            });
        }

        // 2️⃣ Validate course
        const course = await Course.findById(courseId);
        if (!course || course.status !== "published") {
            return res.status(404).json({
                success: false,
                message: "Course not found or not published",
            });
        }

        // ✅ Certificate must be enabled
        if (!course.certificate) {
            return res.status(400).json({
                success: false,
                message: "Certificate is not available for this course",
            });
        }

        // 3️⃣ Check enrollment
        const enrollment = await Enrollment.findOne({
            studentId: userId,
            courseId: courseId,
        });

        if (!enrollment) {
            return res.status(403).json({
                success: false,
                message: "You are not enrolled in this course",
            });
        }

        // 4️⃣ Must complete course
        if (enrollment.progress < 100 || enrollment.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Complete the course to generate certificate",
            });
        }

        // 5️⃣ Prevent duplicate certificate
        const existingCertificate = await Certificate.findOne({
            student: userId,
            course: courseId,
        });

        if (existingCertificate) {
            return res.status(200).json({
                success: true,
                message: "Certificate already generated",
                fileUrl: existingCertificate.file.url,
            });
        }

        // 6️⃣ Generate certificate
        const certificateId = `ED-${Date.now()}`;
        const signatureUrl = process.env.SIGN_SECURE_URL;

        const certificateData = {
            courseName: course.title, // Better than subcategory
            studentName: user.name,
            completionDate: new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            }),
            currentYear: new Date().getFullYear(),
            certificateId,
            signatureUrl,
            authorityName: "Ravi Pravin Nikhil",
            authorityTitle: "Founder & CEO, Edvanta",
        };

        const result = await createCertificate(certificateData);

        const uploadResult = await uploadOnCloudinary(
            result.path,
            "image",
            "certificates"
        );

        if (!uploadResult) {
            return res.status(500).json({
                success: false,
                message: "Cloud upload failed",
            });
        }

        // 7️⃣ Save certificate in DB
        const newCertificate = await Certificate.create({
            certificateId,
            student: userId,
            course: courseId,
            file: {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
            },
        });

        // Delete local file
        fs.unlinkSync(result.path);

        return res.status(200).json({
            success: true,
            message: "Certificate generated successfully",
            fileUrl: newCertificate.file.url,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Certificate generation failed",
        });
    }
};







// const downloadCertificateByCourse = async (req, res) => {
//     try {
//         const { courseId } = req.params;
//         const userId = req.user.userId;
//         // Find the certificate for this student + course
//         const certificate = await Certificate.findOne({
//             course: courseId,
//             student: userId,
//         });

//         if (!certificate) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Certificate not found",
//             });
//         }

//         // Construct download URL using Cloudinary attachment flag
//         let downloadUrl = certificate.file.url;

//         // If the file is on Cloudinary, append fl_attachment
//         if (certificate.file.publicId && certificate.file.url.includes("res.cloudinary.com")) {
//             const url = new URL(certificate.file.url);
//             url.pathname = url.pathname.replace("/upload/", "/upload/fl_attachment/");
//             downloadUrl = url.toString();
//         }

//         return res.status(200).json({
//             success: true,
//             downloadUrl,
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to download certificate",
//         });
//     }
// };





const downloadCertificateByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.userId;

        // 1️⃣ Check course exists and certificate is enabled
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found",
            });
        }

        if (!course.certificate) {
            return res.status(400).json({
                success: false,
                message: "Certificate is not available for this course",
            });
        }

        // 2️⃣ Find the certificate for this student + course
        const certificate = await Certificate.findOne({
            course: courseId,
            student: userId,
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found",
            });
        }

        // 3️⃣ Construct download URL using Cloudinary attachment flag
        let downloadUrl = certificate.file.url;

        if (
            certificate.file.publicId &&
            certificate.file.url.includes("res.cloudinary.com")
        ) {
            const url = new URL(certificate.file.url);
            url.pathname = url.pathname.replace(
                "/upload/",
                "/upload/fl_attachment/"
            );
            downloadUrl = url.toString();
        }

        return res.status(200).json({
            success: true,
            downloadUrl,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to download certificate",
        });
    }
};




module.exports = {
    generateCertificate,
    downloadCertificateByCourse
};