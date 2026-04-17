module.exports = (io) => {

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    //  join room
    socket.on("join_course", (courseId) => {
      socket.join(courseId);
      console.log(`User joined course: ${courseId}`);
    });

    //  load feature
    require("./discussionSocket")(io, socket);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

};