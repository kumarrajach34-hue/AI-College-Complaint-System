
require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const { analyzeComplaint } = require("./ai");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

const complaintSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true
  },
  complaint: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Resolved"],
    default: "Pending"
  },
  assignedTo: {
    type: String,
    default: "Not Assigned"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Complaint = mongoose.model("Complaint", complaintSchema);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.get("/", (req, res) => {
  res.send("AI College Complaint Management System is Running");
});

app.get("/api/complaints/track/:rollNumber", async (req, res) => {
  try {
    const rollNumber = String(req.params.rollNumber || "").trim();

    if (!rollNumber) {
      return res.status(400).json({
        message: "Roll number is required."
      });
    }

    const results = await Complaint.find({
      rollNumber: {
        $regex: "^" + escapeRegex(rollNumber) + "$",
        $options: "i"
      }
    }).sort({ createdAt: -1 });

    res.json(results);
  } catch (error) {
    console.error("Tracking failed:", error);

    res.status(500).json({
      message: "Could not track complaints."
    });
  }
});

io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  try {
    const savedComplaints = await Complaint.find().sort({
      createdAt: -1
    });

    socket.emit("complaints", savedComplaints);
  } catch (error) {
    console.error("Loading complaints failed:", error);
  }

  socket.on("newComplaint", async (data = {}) => {
    try {
      const studentName = String(data.studentName || "").trim();
      const rollNumber = String(data.rollNumber || "").trim();
      const department = String(data.department || "").trim();
      const complaintText = String(data.complaint || "").trim();
      const category = String(data.category || "").trim();

      if (
        !studentName ||
        !rollNumber ||
        !department ||
        !complaintText ||
        !category
      ) {
        socket.emit(
          "operationError",
          "Please fill in all required fields."
        );
        return;
      }

      if (complaintText.length < 5) {
        socket.emit(
          "operationError",
          "Complaint must be at least 5 characters."
        );
        return;
      }

      const ai = analyzeComplaint(complaintText);

      const saved = await Complaint.create({
        studentName,
        rollNumber,
        department,
        complaint: complaintText,
        category: ai.category || category,
        priority: ai.priority,
        status: "Pending"
      });

      console.log("AI analysis:", ai);
      console.log("Complaint saved:", saved._id);

      io.emit("complaintAdded", saved);
    } catch (error) {
      console.error("Creating complaint failed:", error);

      socket.emit(
        "operationError",
        "Could not save the complaint."
      );
    }
  });

  socket.on("assignStaff", async (data = {}) => {
    try {
      if (!mongoose.isValidObjectId(data.id)) {
        socket.emit("operationError", "Invalid complaint ID.");
        return;
      }

      const allowedStaff = [
        "Lab Technician",
        "Electrical Technician",
        "Maintenance Staff",
        "Housekeeping Staff",
        "IT Support"
      ];

      if (!allowedStaff.includes(data.assignedTo)) {
        socket.emit(
          "operationError",
          "Please select a valid staff member."
        );
        return;
      }

      const updated = await Complaint.findByIdAndUpdate(
        data.id,
        { assignedTo: data.assignedTo },
        { new: true, runValidators: true }
      );

      if (!updated) {
        socket.emit("operationError", "Complaint not found.");
        return;
      }

      io.emit("complaintUpdated", updated);
    } catch (error) {
      console.error("Staff assignment failed:", error);

      socket.emit(
        "operationError",
        "Could not assign staff."
      );
    }
  });

  socket.on("updateComplaint", async (data = {}) => {
    try {
      if (!mongoose.isValidObjectId(data._id)) {
        socket.emit("operationError", "Invalid complaint ID.");
        return;
      }

      const allowedStatuses = [
        "Pending",
        "In Progress",
        "Resolved"
      ];

      if (!allowedStatuses.includes(data.status)) {
        socket.emit(
          "operationError",
          "Invalid complaint status."
        );
        return;
      }

      const updated = await Complaint.findByIdAndUpdate(
        data._id,
        { status: data.status },
        { new: true, runValidators: true }
      );

      if (!updated) {
        socket.emit("operationError", "Complaint not found.");
        return;
      }

      io.emit("complaintUpdated", updated);
    } catch (error) {
      console.error("Status update failed:", error);

      socket.emit(
        "operationError",
        "Could not update complaint status."
      );
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

async function startServer() {
  if (!MONGODB_URI) {
    console.error(
      "MONGODB_URI is missing. Check your backend/.env file."
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB Atlas connected successfully");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
