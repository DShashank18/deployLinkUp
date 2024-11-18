import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import { connectToSocket } from "./controllers/socketManager.js";

const app = express();
const server = createServer(app);

// Configure CORS for Express
const corsOptions = {
    origin: ['https://deploylinkup3.onrender.com', 'http://localhost:3000'], // Add your frontend URLs
    methods: 'GET, POST, PUT, DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};


app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/meetings", meetingRoutes);

// Configure Socket.IO
const io = connectToSocket(server, {
    cors: {
        origin: 'https://deploylinkup3.onrender.com',
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    }
});

app.set("port", process.env.PORT || 8000);

const start = async () => {
   try {
      const connectionDb = await mongoose.connect(
         "mongodb+srv://praneethapkr1218:iompProject@cluster0.dakiq.mongodb.net/"
      );
      console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);
      
      server.listen(app.get("port"), () => {
         console.log(`Server is listening on port ${app.get("port")}`);
      });
   } catch (error) {
      console.error("Error connecting to the database:", error);
   }
};

start();
