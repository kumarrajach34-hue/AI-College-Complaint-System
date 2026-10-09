
const BACKEND_URL = "https://ai-college-complaint-system.onrender.com";
const socket = io(BACKEND_URL);

const studentName = document.getElementById("studentName");
const rollNumber = document.getElementById("rollNumber");
const department = document.getElementById("department");
const category = document.getElementById("category");
const complaint = document.getElementById("complaint");
const submitBtn = document.getElementById("submitBtn");
const formMessage = document.getElementById("formMessage");
const trackRollNumber = document.getElementById("trackRollNumber");
const trackBtn = document.getElementById("trackBtn");
const trackMessage = document.getElementById("trackMessage");
const complaintList = document.getElementById("complaintList");

let trackedRollNumber = "";
let requestNumber = 0;
let submitting = false;

function normalizeRoll(value) {
    return String(value || "").trim().toUpperCase();
}

function showMessage(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? "#dc2626" : "#16a34a";
}

submitBtn.addEventListener("click", () => {
    if (submitting) return;

    const name = studentName.value.trim();
    const roll = normalizeRoll(rollNumber.value);
    const dept = department.value.trim();
    const cat = category.value;
    const text = complaint.value.trim();

    if (!name || !roll || !dept || !cat || !text) {
        showMessage(formMessage, "Please fill in all fields.", true);
        return;
    }

    if (text.length < 5) {
        showMessage(
            formMessage,
            "Complaint must be at least 5 characters.",
            true
        );
        return;
    }

    if (!socket.connected) {
        showMessage(
            formMessage,
            "Backend is connecting. Please try again in a moment.",
            true
        );
        return;
    }

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    showMessage(formMessage, "Submitting complaint...");

    socket.emit("newComplaint", {
        studentName: name,
        rollNumber: roll,
        department: dept,
        category: cat,
        complaint: text
    });
});

trackBtn.addEventListener("click", () => {
    const roll = normalizeRoll(trackRollNumber.value);

    if (!roll) {
        showMessage(trackMessage, "Please enter your roll number.", true);
        return;
    }

    trackedRollNumber = roll;
    loadMyComplaints(roll);
});

async function loadMyComplaints(roll) {
    const thisRequest = ++requestNumber;
    trackBtn.disabled = true;
    showMessage(trackMessage, "Searching complaints...");

    try {
        const response = await fetch(
            `${BACKEND_URL}/api/complaints/track/${encodeURIComponent(roll)}`
        );

        const data = await response.json();

        if (thisRequest !== requestNumber) return;

        if (!response.ok) {
            throw new Error(data.message || "Tracking failed.");
        }

        const items = Array.isArray(data) ? data : [];
        displayComplaints(items);

        showMessage(
            trackMessage,
            items.length
                ? `Found ${items.length} complaint(s) for ${roll}.`
                : `No complaints found for roll number ${roll}.`
        );
    } catch (error) {
        if (thisRequest === requestNumber) {
            complaintList.replaceChildren();
            showMessage(
                trackMessage,
                error.message || "Could not load complaints.",
                true
            );
        }
    } finally {
        if (thisRequest === requestNumber) {
            trackBtn.disabled = false;
        }
    }
}

socket.on("complaintAdded", data => {
    if (!data) return;

    submitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Complaint";

    studentName.value = "";
    rollNumber.value = "";
    department.value = "";
    category.value = "";
    complaint.value = "";

    showMessage(formMessage, "Complaint submitted successfully!");

    if (
        trackedRollNumber &&
        normalizeRoll(data.rollNumber) === trackedRollNumber
    ) {
        loadMyComplaints(trackedRollNumber);
    }
});

socket.on("complaintUpdated", data => {
    if (
        data &&
        trackedRollNumber &&
        normalizeRoll(data.rollNumber) === trackedRollNumber
    ) {
        loadMyComplaints(trackedRollNumber);
    }
});

socket.on("operationError", message => {
    submitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Complaint";
    showMessage(
        formMessage,
        message || "Could not save complaint.",
        true
    );
});

socket.on("connect", () => {
    console.log("Connected to complaint server.");
});

socket.on("connect_error", error => {
    console.error("Backend connection error:", error.message);

    if (!submitting) {
        showMessage(
            formMessage,
            "Cannot connect to backend server. Please try again.",
            true
        );
    }
});

function displayComplaints(items) {
    complaintList.replaceChildren();

    if (items.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "No complaints found for this roll number.";
        complaintList.appendChild(empty);
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "complaint-card";

        const title = document.createElement("h3");
        title.textContent = item.complaint || "Untitled complaint";
        card.appendChild(title);

        addDetail(card, "Roll Number", item.rollNumber);
        addDetail(card, "Student", item.studentName);
        addDetail(card, "Department", item.department);
        addDetail(card, "Category", item.category);
        addDetail(card, "Priority", item.priority);
        addDetail(card, "Assigned Staff", item.assignedTo);

        const status = item.status || "Pending";
        const statusClass = {
            "Pending": "status-pending",
            "In Progress": "status-progress",
            "Resolved": "status-resolved"
        }[status] || "";

        addDetail(card, "Status", status, statusClass);

        if (item.createdAt) {
            addDetail(
                card,
                "Submitted",
                new Date(item.createdAt).toLocaleString()
            );
        }

        complaintList.appendChild(card);
    });
}

function addDetail(card, label, value, className = "") {
    const row = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";

    const span = document.createElement("span");
    span.textContent = value || "Not available";

    if (className) span.className = className;

    row.append(strong, span);
    card.appendChild(row);
}
