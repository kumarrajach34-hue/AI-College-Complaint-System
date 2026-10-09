const natural = require("natural");

const classifier = new natural.BayesClassifier();

// -----------------------------
// CATEGORY TRAINING DATA
// -----------------------------

classifier.addDocument("fan is not working", "Electrical");
classifier.addDocument("light is not working", "Electrical");
classifier.addDocument("power problem in classroom", "Electrical");
classifier.addDocument("electricity problem", "Electrical");
classifier.addDocument("ac is not working", "Electrical");

classifier.addDocument("projector is not working", "Equipment");
classifier.addDocument("computer is not working", "Equipment");
classifier.addDocument("printer is not working", "Equipment");
classifier.addDocument("lab equipment damaged", "Equipment");
classifier.addDocument("machine is not working", "Equipment");

classifier.addDocument("classroom door is broken", "Infrastructure");
classifier.addDocument("bench is damaged", "Infrastructure");
classifier.addDocument("building wall is damaged", "Infrastructure");
classifier.addDocument("classroom needs repair", "Infrastructure");
classifier.addDocument("water leakage in building", "Infrastructure");

classifier.addDocument("toilet is dirty", "Cleanliness");
classifier.addDocument("classroom is dirty", "Cleanliness");
classifier.addDocument("garbage is not removed", "Cleanliness");
classifier.addDocument("washroom needs cleaning", "Cleanliness");
classifier.addDocument("campus is dirty", "Cleanliness");

classifier.addDocument("college bus problem", "Other");
classifier.addDocument("canteen problem", "Other");
classifier.addDocument("general college issue", "Other");

classifier.train();

// -----------------------------
// PRIORITY ANALYSIS
// -----------------------------

function getPriority(text) {

    const complaint = text.toLowerCase();

    const highWords = [
        "urgent",
        "emergency",
        "exam",
        "tomorrow",
        "danger",
        "accident",
        "fire",
        "immediately",
        "not working",
        "critical"
    ];

    const lowWords = [
        "suggestion",
        "request",
        "minor",
        "small",
        "improvement"
    ];

    if (highWords.some(word => complaint.includes(word))) {
        return "High";
    }

    if (lowWords.some(word => complaint.includes(word))) {
        return "Low";
    }

    return "Medium";
}

// -----------------------------
// AI COMPLAINT ANALYZER
// -----------------------------

function analyzeComplaint(text) {

    const category = classifier.classify(text);
    const priority = getPriority(text);

    return {
        category,
        priority
    };
}

module.exports = {
    analyzeComplaint
};