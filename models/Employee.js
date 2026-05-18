const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  skills: { type: [String], default: [] },
  performanceScore: { type: Number, min: 0, max: 100, default: 0 },
  experience: { type: Number, default: 0 }, // in years
}, { timestamps: true });

// Optional text index for search
employeeSchema.index({ name: 'text', department: 'text', skills: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);
