const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/paymentModel")
const Enrollment = require("../models/enrollmentModel")
const Course = require("../models/courseModel");
const { User } = require("../models/userModel");
const { sendEnrollmentEmail } = require("../services/emailService");



// Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order API
const createPaymentOrder = async (req, res) => {
    try {
        const options = {
            amount: req.body.amount * 100, // amount in paise
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };

        const order = await razorpay.orders.create(options);
        res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        // console.log(err);
        res.status(500).json({ error: err.message });
    }
}



// Verify payment API
const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id,
        razorpay_signature, courseId, amount, receipt } = req.body;
    const userId = req.user.userId;

    const existingEnrollment = await Enrollment.findOne({
        studentId: userId,
        courseId: courseId
    });

    if (existingEnrollment) {
        return res.status(400).json({
            success: false,
            message: "You are already enrolled in this course."
        });
    }



    const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

    if (generated_signature === razorpay_signature) {

        const payment = await Payment.create({
            student: userId,
            course: courseId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            amount: amount, //stored in paise
            currency: "INR",
            paymentMethod: "online",
            status: "paid",
            paidAt: new Date(),
            receipt: receipt,
        });


        await Enrollment.create({
            studentId: userId,
            courseId: courseId,
            status: "active",
            progress: 0,
        });


        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            {
                $addToSet: { enrolledStudents: userId }
            },
            {
                new: true, // Returns the document AFTER the update
                runValidators: true
            }
        ).populate("instructor");


        const student = await User.findById(userId);
        try {
            await sendEnrollmentEmail(student, updatedCourse, {
                amount: amount / 100,
                paymentId: razorpay_payment_id,
                method: "Online (Razorpay)",
                status: "Success"
            });
        } catch (mailError) {
            console.error("Email failed to send:", mailError);
            // We don't return an error response here because the payment/enrollment was successful
        }



        return res.status(200).json({
            success: true,
            message: "Payment verified and course enrolled successfully",
            payment,
        });
    }

    // Payment invalid
    return res.status(400).json({ success: false, message: "Payment verification failed!" });
}













/**
 * @desc    Get all payments for Admin Dashboard
 * @route   GET /api/admin/payments
 * @access  Private/Admin
 */
const getAllPayments = async (req, res) => {
    try {
        // 1. Fetch all payments
        const payments = await Payment.find({})
            .populate("student", "name email avatar")
            .populate("course", "title thumbnail") // If course is deleted, this will be null
            .sort({ createdAt: -1 });

        // 2. Map through payments to handle deleted course data
        const formattedPayments = payments.map(payment => {
            const paymentObj = payment.toObject();
            
            // If course is null (deleted), we provide a fallback title
            // But the 'amount' remains safe because it's stored inside the Payment record
            if (!paymentObj.course) {
                paymentObj.course = {
                    title: "Deleted Course",
                    thumbnail: null,
                    isDeleted: true
                };
            }
            
            return paymentObj;
        });

        // 3. Calculate Total Revenue
        // This is safe because it uses p.amount (stored in Payment schema), 
        // not p.course.price
        const totalRevenue = payments
            .filter(p => p.status === "paid")
            .reduce((acc, curr) => acc + (curr.amount / 100), 0);

        return res.status(200).json({
            success: true,
            count: formattedPayments.length,
            totalRevenue: totalRevenue.toFixed(2), // Keep 2 decimal places
            payments: formattedPayments,
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error: Could not fetch payment history",
        });
    }
};

/**
 * @desc    Get stats for payment status (For Charts)
 * @route   GET /api/admin/payments/stats
 */
const getPaymentStats = async (req, res) => {
    try {
        const stats = await Payment.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};







module.exports = {
    createPaymentOrder,
    verifyPayment,
    getAllPayments,
    getPaymentStats
}