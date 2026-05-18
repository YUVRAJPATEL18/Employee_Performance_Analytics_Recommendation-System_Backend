const express = require('express');
const Employee = require('../models/Employee');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to all employee routes
router.use(protect);

// GET /api/employees/search
router.get('/search', async (req, res) => {
  try {
    const { department, minScore, search } = req.query;
    let query = {};

    if (department) {
      query.department = department;
    }
    
    if (minScore) {
      query.performanceScore = { $gte: Number(minScore) };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const employees = await Employee.find(query);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find({}).sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (employee) {
      res.json(employee);
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/employees
router.post('/', async (req, res) => {
  try {
    const { name, email, department, skills, performanceScore, experience } = req.body;
    
    const employeeExists = await Employee.findOne({ email });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    const employee = new Employee({
      name,
      email,
      department,
      skills,
      performanceScore,
      experience
    });

    const createdEmployee = await employee.save();
    res.status(201).json(createdEmployee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, department, skills, performanceScore, experience } = req.body;

    const employee = await Employee.findById(req.params.id);

    if (employee) {
      employee.name = name || employee.name;
      employee.email = email || employee.email;
      employee.department = department || employee.department;
      employee.skills = skills || employee.skills;
      employee.performanceScore = performanceScore !== undefined ? performanceScore : employee.performanceScore;
      employee.experience = experience !== undefined ? experience : employee.experience;

      const updatedEmployee = await employee.save();
      res.json(updatedEmployee);
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (employee) {
      await Employee.deleteOne({ _id: employee._id });
      res.json({ message: 'Employee removed' });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
