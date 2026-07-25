const { query } = require('../config/database');
const aiService = require('../services/aiService');
const { applyMetadataToDesignSpecs } = require('../utils/projectMetadata');
const { scheduleExteriorRender } = require('../services/designExteriorRenderService');
const { AppError } = require('../middleware/errorHandler');

const chat = async (req, res, next) => {
  try {
    const { message, messages, projectId, conversationId } = req.body;
    const userMessage = message || messages?.filter((m) => m.role === 'user').pop()?.content;
    if (!userMessage) throw new AppError('Message is required', 400);

    let conversation;
    if (conversationId) {
      const existing = await query(
        'SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2',
        [conversationId, req.user.id]
      );
      conversation = existing.rows[0];
    }

    let history = conversation?.messages || [];
    if (typeof history === 'string') {
      try { history = JSON.parse(history); } catch { history = []; }
    }
    if (!Array.isArray(history)) history = [];

    const chatMessages = Array.isArray(messages) && messages.length
      ? messages.map((m) => ({ role: m.role, content: m.content }))
      : [...history, { role: 'user', content: userMessage }];

    let context = {};
    if (projectId) {
      const project = await query(
        `SELECT name, description, status, budget, progress_percentage, project_type, building_type,
         total_area_sqft, floors, location, start_date, end_date, metadata
         FROM projects WHERE id = $1`,
        [projectId]
      );
      if (project.rows[0]) {
        let metadata = project.rows[0].metadata;
        if (typeof metadata === 'string') {
          try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
        }
        context.project = { ...project.rows[0], metadata };
      }
    }

    const aiResponse = await aiService.chat(chatMessages, context);
    const storedMessages = [
      ...chatMessages,
      { role: 'assistant', content: aiResponse.reply, timestamp: new Date().toISOString() },
    ];

    let savedConversation;
    if (conversation) {
      const updated = await query(
        `UPDATE ai_conversations SET messages = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(storedMessages), conversationId]
      );
      savedConversation = updated.rows[0];
    } else {
      const created = await query(
        `INSERT INTO ai_conversations (user_id, project_id, title, messages, context)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, projectId || null, userMessage.substring(0, 100), JSON.stringify(storedMessages), JSON.stringify(context)]
      );
      savedConversation = created.rows[0];
    }

    res.json({
      success: true,
      data: {
        reply: aiResponse.reply,
        message: aiResponse.reply,
        conversationId: savedConversation.id,
        mock: aiResponse.mock,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, project_id, conversation_type, is_active, created_at, updated_at
       FROM ai_conversations WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: { conversations: result.rows } });
  } catch (err) {
    next(err);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) throw new AppError('Conversation not found', 404);
    res.json({ success: true, data: { conversation: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const generateBuildingDesign = async (req, res, next) => {
  try {
    const { projectId, projectType, buildingType, floors, areaSqft, requirements } = req.body;
    let projectData = {};
    if (projectId) {
      const pr = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (pr.rows[0]) projectData = pr.rows[0];
    }

    const floorCount = Number(floors) || projectData.floors || 8;
    const area = Number(areaSqft) || projectData.total_area_sqft || 80000;
    const aiResult = await aiService.generateBuildingDesign({
      projectType: projectType || projectData.project_type,
      buildingType: buildingType || projectData.building_type,
      floors: floorCount,
      areaSqft: area,
      requirements: requirements || projectData.description,
      location: projectData.location,
      budget: projectData.budget,
    });

    const ai = aiResult.design || {};
    const isRes = (projectType || projectData.project_type) === 'residential'
      || (buildingType || projectData.building_type) === 'residential';
    const baseWidth = isRes ? 10 : Math.max(8, Math.round(Math.sqrt(area / floorCount) / 10));
    const baseDepth = isRes ? 8.5 : Math.max(6, Math.round(baseWidth * 0.75));

    const designPayload = applyMetadataToDesignSpecs({
      floors: ai.floors || floorCount,
      width: ai.width || baseWidth,
      depth: ai.depth || baseDepth,
      buildingStyle: ai.buildingStyle || (isRes ? 'residential' : 'commercial'),
      buildingType: buildingType || projectData.building_type,
      materials: ai.materials || {
        wallColor: isRes ? '#F5F5F5' : '#D5DBDB',
        roofColor: '#FAFAFA',
        accentColor: isRes ? '#8B7355' : '#E67E22',
        stoneColor: '#7F8C8D',
      },
      doorStyle: ai.doorStyle || 'glass',
      windowStyle: ai.windowStyle || (isRes ? 'standard' : 'curtain'),
      viewMode: ai.viewMode || (isRes ? 'cutaway' : 'exterior'),
      placedItems: ai.placedItems || [],
      suggestions: (ai.recommendations || []).map((r) =>
        typeof r === 'string' ? { title: r, desc: r, impact: 'AI' } : r
      ),
      name: ai.name,
      description: ai.description,
      estimatedCostFRw: ai.estimatedCostFRw,
    }, projectData);

    let saved = null;
    if (projectId) {
      const result = await query(
        `INSERT INTO building_designs (project_id, created_by, name, design_type, description, specifications, ai_generated, status)
         VALUES ($1, $2, $3, $4, $5, $6, true, 'draft') RETURNING *`,
        [
          projectId, req.user.id,
          aiResult.design.name || 'AI Generated Design',
          buildingType || 'commercial',
          aiResult.design.description,
          JSON.stringify({ ...aiResult.design.specifications, ...designPayload }),
        ]
      );
      saved = result.rows[0];
      scheduleExteriorRender(projectId, saved.id);
    }

    res.status(201).json({
      success: true,
      data: { design: { ...designPayload, ...saved }, aiAnalysis: aiResult.design, mock: aiResult.mock },
    });
  } catch (err) {
    next(err);
  }
};

const estimateCost = async (req, res, next) => {
  try {
    let { projectId, projectType, areaSqft, floors, location, budget } = req.body;
    if (projectId) {
      const pr = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (pr.rows[0]) {
        const p = pr.rows[0];
        projectType = projectType || p.project_type;
        areaSqft = areaSqft || p.total_area_sqft;
        floors = floors || p.floors;
        location = location || p.location;
        budget = budget || p.budget;
      }
    }
    const aiResult = await aiService.estimateCost({ projectType, areaSqft, floors, location, budget });
    const est = aiResult.estimation;

    if (!projectId) {
      return res.status(201).json({ success: true, data: { estimation: est, aiAnalysis: est, mock: aiResult.mock } });
    }

    const result = await query(
      `INSERT INTO cost_estimations (project_id, created_by, title, total_estimated_cost, labor_cost, material_cost,
       equipment_cost, contingency_cost, overhead_cost, breakdown, ai_generated, confidence_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, 'draft') RETURNING *`,
      [
        projectId, req.user.id, 'AI Cost Estimation',
        est.totalEstimatedCost ?? est.total_estimated_cost ?? null,
        est.laborCost ?? est.labor_cost ?? null,
        est.materialCost ?? est.material_cost ?? null,
        est.equipmentCost ?? est.equipment_cost ?? null,
        est.contingencyCost ?? est.contingency_cost ?? null,
        est.overheadCost ?? est.overhead_cost ?? null,
        JSON.stringify(est.breakdown || []),
        est.confidenceScore ?? est.confidence_score ?? 80,
      ]
    );

    res.status(201).json({ success: true, data: { estimation: result.rows[0], aiAnalysis: est, mock: aiResult.mock } });
  } catch (err) {
    next(err);
  }
};

const predictRisks = async (req, res, next) => {
  try {
    const { projectId, materialsSummary, ...bodyFields } = req.body;
    let params = { ...bodyFields, materialsSummary };

    if (projectId) {
      const project = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (project.rows[0]) {
        const p = project.rows[0];
        params = {
          projectName: bodyFields.projectName || p.name,
          projectType: bodyFields.projectType || p.project_type,
          timeline: bodyFields.timeline || `${p.start_date} to ${p.end_date}`,
          budget: bodyFields.budget ?? p.budget,
          location: bodyFields.location || p.location,
          currentProgress: bodyFields.currentProgress ?? p.progress_percentage,
          materialsSummary,
        };
      }
    }

    const aiResult = await aiService.predictRisks(params);
    const savedRisks = [];

    if (!projectId) {
      const mapped = (aiResult.risks || []).map((risk, i) => ({
        id: i + 1,
        title: risk.riskType || risk.title,
        severity: risk.riskLevel || risk.severity,
        probability: risk.probability,
        impact: risk.description || risk.impact,
        mitigation: risk.mitigationPlan || risk.mitigation,
      }));
      return res.status(201).json({ success: true, data: { risks: mapped, aiAnalysis: aiResult.risks, mock: aiResult.mock } });
    }

    for (const risk of aiResult.risks) {
      const result = await query(
        `INSERT INTO risk_predictions (project_id, created_by, risk_type, risk_level, probability, impact_score, description, mitigation_plan, ai_generated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
        [projectId, req.user.id, risk.riskType, risk.riskLevel, risk.probability, risk.impactScore, risk.description, risk.mitigationPlan]
      );
      savedRisks.push(result.rows[0]);
    }

    res.status(201).json({
      success: true,
      data: {
        risks: savedRisks.map((r) => ({
          id: r.id,
          title: r.risk_type || r.description,
          severity: r.risk_level,
          probability: r.probability,
          impact: r.description,
          mitigation: r.mitigation_plan,
        })),
        aiAnalysis: aiResult.risks,
        mock: aiResult.mock,
      },
    });
  } catch (err) {
    next(err);
  }
};

const generateRenderPrompt = async (req, res, next) => {
  try {
    const { specifications, buildingType, projectType, buildingStyle, projectName, projectId } = req.body;
    let name = projectName;
    if (projectId && !name) {
      const pr = await query('SELECT name FROM projects WHERE id = $1', [projectId]);
      name = pr.rows[0]?.name;
    }
    const aiResult = await aiService.generateRenderPrompt({
      specifications: specifications || {},
      buildingType,
      projectType,
      buildingStyle,
      projectName: name || 'Building',
    });
    res.json({ success: true, data: aiResult });
  } catch (err) {
    next(err);
  }
};

const generateRender = async (req, res, next) => {
  try {
    const {
      specifications,
      buildingType,
      projectType,
      buildingStyle,
      projectName,
      projectId,
      referenceImage,
      referenceImages,
      mode,
      floor,
      aspectRatio,
      resolution,
      preferredProvider,
    } = req.body;

    const refs = Array.isArray(referenceImages) && referenceImages.length
      ? referenceImages
      : referenceImage
        ? [referenceImage]
        : [];

    let name = projectName;
    if (projectId && !name) {
      const pr = await query('SELECT name FROM projects WHERE id = $1', [projectId]);
      name = pr.rows[0]?.name;
    }

    const aiResult = await aiService.generateBuildingRender({
      specifications: specifications || {},
      buildingType,
      projectType,
      buildingStyle,
      projectName: name || 'Building',
      referenceImage: refs[0],
      referenceImages: refs,
      mode: mode || 'exterior',
      floor,
      aspectRatio,
      resolution,
      preferredProvider: preferredProvider || 'auto',
    });

    res.json({ success: true, data: aiResult });
  } catch (err) {
    next(err);
  }
};

const fluxImage = async (req, res, next) => {
  try {
    const { prompt, aspectRatio = '16:9', model = 'flux' } = req.body;
    if (!prompt?.trim()) {
      return res.status(400).json({ success: false, message: 'prompt is required' });
    }
    const pollinationsService = require('../services/pollinationsService');
    const result = await pollinationsService.generateImage({
      prompt,
      aspectRatio,
      model: model === 'turbo' ? 'turbo' : 'flux',
    });
    res.json({
      success: true,
      data: {
        imageDataUri: pollinationsService.toDataUri(result.base64, result.mime),
        provider: model === 'turbo' ? 'pollinations-turbo' : 'pollinations-flux',
        providerLabel: model === 'turbo' ? 'Turbo (free)' : 'Flux (free)',
      },
    });
  } catch (err) {
    next(err);
  }
};

const listImageProviders = async (req, res) => {
  const imageRenderService = require('../services/imageRenderService');
  res.json({ success: true, data: imageRenderService.listAvailableProviders() });
};

const analyzeProgress = async (req, res, next) => {
  try {
    const { projectId, plannedProgress, actualProgress } = req.body;
    const project = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (project.rows.length === 0) throw new AppError('Project not found', 404);

    const tasks = await query('SELECT title, status, progress_percentage FROM project_tasks WHERE project_id = $1', [projectId]);
    const issues = await query('SELECT title, severity, status FROM issue_reports WHERE project_id = $1 AND status = $2', [projectId, 'open']);

    const aiResult = await aiService.analyzeProgress({
      projectName: project.rows[0].name,
      plannedProgress: plannedProgress || 50,
      actualProgress: actualProgress || project.rows[0].progress_percentage,
      tasks: tasks.rows,
      issues: issues.rows,
    });

    res.json({ success: true, data: { analysis: aiResult.analysis, mock: aiResult.mock } });
  } catch (err) {
    next(err);
  }
};

const reviewMaterialRequest = async (req, res, next) => {
  try {
    const {
      projectName, materialName, quantity, unit, plannedQty, usedQty, contractorNotes,
    } = req.body;
    const review = aiService.reviewMaterialRequest({
      projectName,
      materialName,
      quantity,
      unit,
      plannedQty,
      usedQty,
      contractorNotes,
    });
    res.json({ success: true, data: { review } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  chat, getConversations, getConversation, generateBuildingDesign,
  generateRenderPrompt, generateRender, fluxImage, listImageProviders, estimateCost, predictRisks, analyzeProgress,
  reviewMaterialRequest,
};
