const mongoose = require("mongoose");

const listingsSchema = new mongoose.Schema({

    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: ""
    },

    category: {
        type: String,
        enum: ["Academic", "Personal", "Habit"],
        required: true
    },

    deadline: {
        type: Date,
        required: true
    },

    estimatedMinutes: {
        type: Number,
        default: 25
    },

    status: {
        type: String,
        enum: ["Pending", "Completed"],
        default: "Pending"
    }

});

module.exports = mongoose.model("Listings", listingsSchema);