const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    auth0Id: {
        type: String,
        unique: true,
        sparse: true,
    },

    provider: {
        type: String,
        enum: ["google-oauth2", "github", "local"],
        default: "local",
    },

    name: {
        type: String,
        required: function () {
            return this.provider !== "github";
        }
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        required: function () {
            return this.provider !== "github";
        }
    },
    phone: {
        type: String,
    },
    password: {
        type: String,
        required: function () {
            return !this.auth0Id;
        },
        minlength: 6,
    },
    role: {
        type: String,
        enum: ['student', 'instructor', 'admin'],
        default: 'student'
    },
    isVerified: {
        type: Boolean,
        default: false
    },



    avatar: {
        url: {
            type: String,
            default:"https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg",
        },
        publicId: {
            type: String,
        },
    },


    coverPhoto: {
        type: String,
        default: ""
    },
    bio: {
        type: String,
        default: ""
    },
    location: {
        type: String
    },

    website: {
        type: String,
        default: ""
    },
    github: {
        type: String,
        default: ""
    },
    linkedin: {
        type: String,
        default: ""
    },

    lastLogin: {
        type: Date
    },
},
    {
        timestamps: true
    }
);
const User = mongoose.model("User", userSchema);

module.exports = { User };