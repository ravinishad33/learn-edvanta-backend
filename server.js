const express=require("express");
const { connectDB } = require("./config/db");
const path=require("path")
const cors=require("cors");
require("dotenv").config();
const app=express();




app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(cors({
    origin:"*"
}));

// connection to mongoose 
connectDB();


app.use("/uploads", express.static("uploads"));



app.use("/api/auth",require("./routes/authRoute"));
app.use("/api/category",require("./routes/categoryRoute"));
app.use("/api/subcategory",require("./routes/subCategoryRoute"));
app.use("/api/course",require("./routes/courseRoute"));
app.use("/api/users",require("./routes/userRoute"));
app.use("/api/otp", require("./routes/OtpRoute"));

app.use("/api/instructor", require("./routes/instructorRoute"));
app.use("/api/student", require("./routes/studentRoute"));
app.use("/api/admin", require("./routes/adminRoute"));

app.use("/api/payment", require("./routes/paymentRoute"));

app.use("/api/enrollments", require("./routes/enrollmentRoute"));
app.use("/api/certificate", require("./routes/certificateRoute"));


app.use('/api/chat', require('./routes/chatRoute'));

app.listen(process.env.PORT,()=>{
    console.log("Server is running on PORT ",process.env.PORT);
});