module.exports = (io, socket) => {

  socket.on("typing", ({ courseId, userName }) => {
    // Stores the courseId on the socket object so we know where they were typing 
    // if they suddenly disconnect
    socket.currentCourse = courseId; 
    socket.to(courseId).emit("user_typing", { userName });
  });

  socket.on("stop_typing", ({ courseId }) => {
    socket.to(courseId).emit("user_stop_typing");
  });

  //  Handle sudden disconnects
  socket.on("disconnect", () => {
    if (socket.currentCourse) {
      socket.to(socket.currentCourse).emit("user_stop_typing");
    }
  });

};