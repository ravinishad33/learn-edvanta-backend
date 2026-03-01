const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/paymentModel")
const Enrollment = require("../models/enrollmentModel")
const Course = require("../models/courseModel");
const { sendEnrollmentEmail } = require("../services/emailService");
const { User } = require("../models/userModel");



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
            amount: amount, // in paise
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

        await Course.findByIdAndUpdate(courseId, {
            $addToSet: { enrolledStudents: userId } // avoids duplicates
        });



        // Fetch student and course documents before sending email
        const student = await User.findById(userId);
        const course = await Course.findById(courseId).populate("instructor");

        await sendEnrollmentEmail(student, course, {
            amount: course.price,
            paymentId: payment._id,
            method: payment.paymentMethod,
            status: payment.status
        });


        return res.status(200).json({
            success: true,
            message: "Payment verified and course enrolled successfully",
            payment,
        });
    }

    // Payment invalid
    return res.status(400).json({ success: false, message: "Payment verification failed!" });
}


module.exports = {
    createPaymentOrder,
    verifyPayment
}