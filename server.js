const express = require("express");
const { connectDB } = require("./config/db");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
    origin: "*"
}));

// DB connection
connectDB();


// Routes
app.use('/api/public', require("./routes/publicRoutes"));
app.use("/api/auth", require("./routes/authRoute"));
app.use("/api/category", require("./routes/categoryRoute"));
app.use("/api/subcategory", require("./routes/subCategoryRoute"));
app.use("/api/course", require("./routes/courseRoute"));
app.use("/api/users", require("./routes/userRoute"));
app.use("/api/otp", require("./routes/OtpRoute"));
app.use("/api/instructor", require("./routes/instructorRoute"));
app.use("/api/student", require("./routes/studentRoute"));
app.use("/api/admin", require("./routes/adminRoute"));
app.use("/api/payment", require("./routes/paymentRoute"));
app.use("/api/enrollments", require("./routes/enrollmentRoute"));
app.use("/api/certificate", require("./routes/certificateRoute"));
app.use('/api/chat', require('./routes/chatRoute'));
app.use("/api/meeting", require("./routes/meetingRoute"));
app.use("/api/discussions", require("./routes/discussionRoute"))


// socket io add
// create server
const server = http.createServer(app);
// socket setup
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// make io available in controllers
app.set("io", io);

require("./sockets")(io);

// ❗ replace app.listen with server.listen
server.listen(process.env.PORT, () => {
    console.log("Server is running on PORT", process.env.PORT);
});