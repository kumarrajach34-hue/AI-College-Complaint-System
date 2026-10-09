
const BACKEND_URL = "https://ai-college-complaint-system.onrender.com";
const socket = io(BACKEND_URL);

const adminComplaintList = document.getElementById("adminComplaintList");
const totalComplaints = document.getElementById("totalComplaints");
const highComplaints = document.getElementById("highComplaints");
const pendingComplaints = document.getElementById("pendingComplaints");
const resolvedComplaints = document.getElementById("resolvedComplaints");
const filterStatus = document.getElementById("filterStatus");

let complaints = [];

const staffMembers = [
    "Lab Technician",
    "Electrical Technician",
    "Maintenance Staff",
    "Housekeeping Staff",
    "IT Support"
];

socket.on("connect", () => {
    console.log("Admin connected to server.");
});

socket.on("connect_error", error => {
    console.error("Admin connection error:", error.message);
});

socket.on("complaints", data => {
    complaints = Array.isArray(data) ? data : [];
    updateDashboard();
});

socket.on("complaintAdded", data => {
    if (!data) return;

    const id = String(data._id || data.id);
    const index = complaints.findIndex(
        item => String(item._id || item.id) === id
    );

    if (index === -1) {
        complaints.unshift(data);
    } else {
        complaints[index] = data;
    }

    updateDashboard();
});

socket.on("complaintUpdated", data => {
    if (!data) return;

    const id = String(data._id || data.id);
    const index = complaints.findIndex(
        item => String(item._id || item.id) === id
    );

    if (index === -1) {
        complaints.unshift(data);
    } else {
        complaints[index] = data;
    }

    updateDashboard();
});

socket.on("operationError", message => {
    alert(message || "The operation could not be completed.");
});

filterStatus.addEventListener("change", displayComplaints);

function updateDashboard() {
    totalComplaints.textContent = complaints.length;

    highComplaints.textContent = complaints.filter(
        item => item.priority === "High"
    ).length;

    pendingComplaints.textContent = complaints.filter(
        item => item.status === "Pending"
    ).length;

    resolvedComplaints.textContent = complaints.filter(
        item => item.status === "Resolved"
    ).length;

    displayComplaints();
}

function displayComplaints() {
    const selectedStatus = filterStatus.value;

    const filtered = selectedStatus === "All"
        ? complaints
        : complaints.filter(item => item.status === selectedStatus);

    adminComplaintList.replaceChildren();

    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "No complaints available.";
        adminComplaintList.appendChild(empty);
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "admin-complaint-card";

        const heading = document.createElement("h3");
        heading.textContent = item.complaint || "Complaint";

        const details = document.createElement("div");

        function addDetail(label, value, className = "") {
            const row = document.createElement("p");
            const strong = document.createElement("strong");
            strong.textContent = label + ": ";

            const span = document.createElement("span");
            span.textContent = value || "Not available";

            if (className) span.className = className;

            row.append(strong, span);
            details.appendChild(row);
        }

        addDetail("Student", item.studentName);
        addDetail("Roll Number", item.rollNumber);
        addDetail("Department", item.department);
        addDetail("AI Category", item.category);
        addDetail(
            "AI Priority",
            item.priority,
            `priority-${(item.priority || "medium").toLowerCase()}`
        );
        addDetail("Status", item.status, "status-badge");
        addDetail("Assigned Staff", item.assignedTo || "Not Assigned");

        if (item.createdAt) {
            addDetail(
                "Submitted",
                new Date(item.createdAt).toLocaleString()
            );
        }

        const staffLabel = document.createElement("label");
        const complaintId = item._id || item.id;

        staffLabel.textContent = "Assign Staff: ";
        staffLabel.htmlFor = `staff-${complaintId}`;

        const staffSelect = document.createElement("select");
        staffSelect.id = `staff-${complaintId}`;
        staffSelect.className = "staff-select";

        const unassigned = document.createElement("option");
        unassigned.value = "";
        unassigned.textContent = "Select staff member";
        staffSelect.appendChild(unassigned);

        staffMembers.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            staffSelect.appendChild(option);
        });

        if (item.assignedTo && staffMembers.includes(item.assignedTo)) {
            staffSelect.value = item.assignedTo;
        }

        const assignButton = document.createElement("button");
        assignButton.className = "progress-btn";
        assignButton.textContent = "Assign Staff";

        assignButton.addEventListener("click", () => {
            if (!staffSelect.value) {
                alert("Please select a staff member.");
                return;
            }

            if (!complaintId) {
                alert("Complaint ID missing. Refresh and try again.");
                return;
            }

            assignButton.disabled = true;

            socket.emit("assignStaff", {
                id: complaintId,
                assignedTo: staffSelect.value
            });

            setTimeout(() => {
                assignButton.disabled = false;
            }, 1500);
        });

        const assignmentRow = document.createElement("div");
        assignmentRow.className = "status-buttons";
        assignmentRow.append(staffSelect, assignButton);

        const progressButton = document.createElement("button");
        progressButton.className = "progress-btn";
        progressButton.textContent = "In Progress";
        progressButton.disabled =
            item.status === "In Progress" ||
            item.status === "Resolved";

        progressButton.addEventListener("click", () => {
            updateStatus(item, "In Progress");
        });

        const resolveButton = document.createElement("button");
        resolveButton.className = "resolve-btn";
        resolveButton.textContent = "Resolve";
        resolveButton.disabled = item.status === "Resolved";

        resolveButton.addEventListener("click", () => {
            updateStatus(item, "Resolved");
        });

        const statusRow = document.createElement("div");
        statusRow.className = "status-buttons";
        statusRow.append(progressButton, resolveButton);

        card.append(
            heading,
            details,
            staffLabel,
            assignmentRow,
            statusRow
        );

        adminComplaintList.appendChild(card);
    });
}

function updateStatus(item, status) {
    const id = item._id || item.id;

    if (!id) {
        alert("Complaint ID missing. Refresh the page and try again.");
        return;
    }

    socket.emit("updateComplaint", {
        _id: id,
        status
    });
}
