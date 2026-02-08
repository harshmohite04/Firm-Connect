const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); // or bcryptjs

// Account lockout settings
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: false }, // Optional at reg?
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["ATTORNEY", "CLIENT", "ADMIN", "PARALEGAL"],
      default: "CLIENT",
    },
    status: { type: String, enum: ["PENDING", "VERIFIED"], default: "PENDING" },
    isAdmin: { type: Boolean, default: false },
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Account lockout fields
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // Subscription Fields
    subscriptionStatus: { 
      type: String, 
      enum: ['ACTIVE', 'INACTIVE'], 
      default: 'INACTIVE' 
    },
    subscriptionPlan: { 
      type: String, 
      enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
      default: null
    },
    subscriptionExpiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Check if account is currently locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment failed attempts and lock if threshold exceeded
userSchema.methods.incrementLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  // Lock the account if we've reached max attempts
  if (this.failedLoginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME_MINUTES * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Reset failed login attempts on successful login
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
module.exports = User;

