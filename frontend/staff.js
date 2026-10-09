const BACKEND_URL = "https://ai-college-complaint-system.onrender.com";
const socket = io(BACKEND_URL);

const staffSelector = document.getElementById("staffMember");
const staffFilter = document.getElementById("staffFilter");
const complaintList = document.getElementById("staffComplaintList");
const connectionMessage = document.getElementById("connectionMessage");

const totalAssigned = document.getElementById("totalAssigned");
const myPending = document.getElementById("myPending");
const myProgress = document.getElementById("myProgress");
const myResolved = document.getElementById("myResolved");

let allComplaints = [];
let receivedComplaints = false;

function showConnectionMessage(message, isError = false) {
    connectionMessage.textContent = message;
    connectionMessage.style.color = isError ? "#f87171" : "#34d399";
}

function updateDashboard() {
    const staffName = staffSelector.value;

    const assigned = allComplaints.filter(item =>
        item.assignedTo === staffName
    );

    totalAssigned.textContent = assigned.length;

    myPending.textContent = assigned.filter(item =>
        item.status === "Pending"
    ).length;

    myProgress.textContent = assigned.filter(item =>
        item.status === "In Progress"
    ).length;

    myResolved.textContent = assigned.filter(item =>
        item.status === "Resolved"
    ).length;

    const statusFilter = staffFilter.value;

    const visible = assigned.filter(item =>
        statusFilter === "All" || item.status === statusFilter
    );

    displayComplaints(visible);
}

function displayComplaints(items) {
    complaintList.replaceChildren();

    if (items.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = receivedComplaints
            ? "No complaints assigned to this staff member."
            : "Waiting for complaints from the server...";
        complaintList.appendChild(empty);
        return;
    }

    items.forEach(item => {
        const card = document.createElement("article");
        card.className = "complaint-card";

        const title = document.createElement("h3");
        title.textContent = item.complaint || "Untitled complaint";
        card.appendChild(title);

        addDetail(card, "Student", item.studentName);
        addDetail(card, "Roll Number", item.rollNumber);
        addDetail(card, "Department", item.department);
        addDetail(card, "Category", item.category);
        addDetail(card, "Priority", item.priority);
        addDetail(card, "Assigned Staff", item.assignedTo);
        addDetail(card, "Status", item.status || "Pending");

        if (item.createdAt) {
            addDetail(
                card,
                "Submitted",
                new Date(item.createdAt).toLocaleString()
            );
        }

        if (item.status !== "Resolved") {
            const actions = document.createElement("div");
            actions.className = "staff-actions";

            if (item.status === "Pending") {
                const startButton = document.createElement("button");
                startButton.type = "button";
                startButton.textContent = "Start Work";

                startButton.addEventListener("click", () => {
                    updateStatus(item._id, "In Progress");
                });

                actions.appendChild(startButton);
            }

            const resolveButton = document.createElement("button");
            resolveButton.type = "button";
            resolveButton.textContent = "Mark Resolved";

            resolveButton.addEventListener("click", () => {
                updateStatus(item._id, "Resolved");
            });

            actions.appendChild(resolveButton);
            card.appendChild(actions);
        }

        complaintList.appendChild(card);
    });
}

function addDetail(card, label, value) {
    const row = document.createElement("p");
    const strong = document.createElement("strong");
    const span = document.createElement("span");

    strong.textContent = label + ": ";
    span.textContent = value || "Not available";

    row.append(strong, span);
    card.appendChild(row);
}

function updateStatus(id, status) {
    if (!id) {
        alert("Complaint ID is missing.");
        return;
    }

    if (!socket.connected) {
        alert("Server is disconnected. Please try again.");
        return;
    }

    socket.emit("updateComplaint", {
        _id: id,
        status: status
    });
}

function saveComplaintUpdate(data) {
    if (!data || !data._id) return;

    const index = allComplaints.findIndex(item =>
        String(item._id) === String(data._id)
    );

    if (index === -1) {
        allComplaints.push(data);
    } else {
        allComplaints[index] = {
            ...allComplaints[index],
            ...data
        };
    }

    updateDashboard();
}

socket.on("connect", () => {
    showConnectionMessage("Connected to complaint server.");
    console.log("Staff panel connected to backend.");
});

socket.on("disconnect", () => {
    showConnectionMessage(
        "Disconnected. Reconnecting to server...",
        true
    );
});

socket.on("connect_error", error => {
    console.error("Staff connection error:", error.message);
    showConnectionMessage(
        "Could not connect to server. Please refresh the page.",
        true
    );
});

socket.on("complaints", data => {
    allComplaints = Array.isArray(data) ? data : [];
    receivedComplaints = true;
    updateDashboard();
});

socket.on("complaintAdded", data => {
    saveComplaintUpdate(data);
});

socket.on("complaintUpdated", data => {
    saveComplaintUpdate(data);
});

socket.on("operationError", message => {
    alert(
        typeof message === "string"
            ? message
            : "Could not update complaint."
    );
});

staffSelector.addEventListener("change", updateDashboard);
staffFilter.addEventListener("change", updateDashboard);