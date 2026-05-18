const express = require('express');
const axios = require('axios');
const Employee = require('../models/Employee');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// POST /api/ai/recommend
router.post('/recommend', async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Fetch all employees to compare for ranking
    const allEmployees = await Employee.find({ department: employee.department }).select('performanceScore experience');
    const departmentAvgScore = allEmployees.reduce((acc, curr) => acc + curr.performanceScore, 0) / allEmployees.length;

    const prompt = `
    You are an expert HR AI assistant. Analyze the following employee's data and provide comprehensive, structured insights.
    
    Employee Data:
    - Name: ${employee.name}
    - Department: ${employee.department}
    - Experience: ${employee.experience} years
    - Performance Score: ${employee.performanceScore}/100 (Department Average: ${departmentAvgScore.toFixed(1)}/100)
    - Skills: ${employee.skills.join(', ')}

    Return your analysis strictly in the following JSON structure without markdown wrapping or extra text:
    {
      "promotionReadiness": {
        "isReady": true,
        "readinessScore": 85,
        "detailedReasoning": "string",
        "requiredImprovements": ["string"],
        "timeline": "string"
      },
      "trainingRecommendations": [
        {
          "courseTitle": "string",
          "priorityLevel": "High",
          "reason": "string",
          "platform": "string",
          "duration": "string"
        }
      ],
      "performanceImprovement": {
        "currentLevelAssessment": "string",
        "strengths": ["string"],
        "areasForImprovement": ["string"],
        "actionableItems": ["string"]
      },
      "careerPath": {
        "nextRoles": ["string"],
        "developmentAreas": ["string"]
      },
      "ranking": {
        "estimatedPercentile": "string",
        "competitiveAdvantages": ["string"]
      },
      "skillGapAnalysis": {
        "industryStandardsGap": "string",
        "criticalMissingSkills": ["string"]
      },
      "performancePrediction": {
        "trend": "Upward",
        "sixMonthForecast": "string"
      },
      "overallRecommendation": "string"
    }
    `;

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return res.status(500).json({ message: 'OpenRouter API key not configured' });
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-sonnet-latest',
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let aiData = response.data.choices[0].message.content;
    
    // Parse the response, handling potential markdown wrappers
    try {
      if (aiData.startsWith('```json')) {
        aiData = aiData.replace(/```json\n?/, '').replace(/```\n?$/, '');
      }
      const parsedData = JSON.parse(aiData);
      res.json(parsedData);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiData);
      res.status(500).json({ message: 'Failed to parse AI response' });
    }

  } catch (error) {
    console.error('AI Route Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error communicating with AI service' });
  }
});

// POST /api/ai/bulk-rank
router.post('/bulk-rank', async (req, res) => {
  try {
    const { employeeIds } = req.body;
    if (!employeeIds || employeeIds.length < 2) {
      return res.status(400).json({ message: 'At least 2 employees required for bulk ranking' });
    }

    const employees = await Employee.find({ _id: { $in: employeeIds } });
    
    const prompt = `
    Rank the following employees based on performance and experience.
    
    Employees:
    ${employees.map(e => `- ${e.name}: ${e.performanceScore}/100 score, ${e.experience} yrs exp, Skills: ${e.skills.join(',')}`).join('\n')}

    Return strictly JSON without markdown:
    {
      "rankings": [
        {
          "employeeId": "id string (MUST match input)",
          "name": "string",
          "rank": number,
          "strengths": ["string"],
          "comparativeAnalysis": "string"
        }
      ],
      "summary": "string"
    }
    `;

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-sonnet-latest',
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      },
      {
        headers: { 'Authorization': `Bearer ${openRouterApiKey}`, 'Content-Type': 'application/json' }
      }
    );

    let aiData = response.data.choices[0].message.content;
    if (aiData.startsWith('```json')) {
      aiData = aiData.replace(/```json\n?/, '').replace(/```\n?$/, '');
    }
    res.json(JSON.parse(aiData));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error in bulk ranking' });
  }
});

module.exports = router;
