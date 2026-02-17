const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const Project = require('../models/Project');
const Application = require('../models/Application');
const User = require('../models/User');
const Notification = require('../models/Notification');
const projectService = require('../services/projectService');

// Get all projects (public, with optional filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, minBudget, maxBudget, timeline, projectType, search } = req.query;

    let query = { status: 'open', visibility: 'public' };

    if (category) query.category = category;
    if (projectType) query.projectType = projectType;
    if (timeline) query.timeline = timeline;

    if (minBudget || maxBudget) {
      query['budget.min'] = {};
      if (minBudget) query['budget.min'].$gte = Number(minBudget);
      if (maxBudget) query['budget.max'].$lte = Number(maxBudget);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('clientId', 'firstName lastName avatar email isEmailVerified createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

// Get single project by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('clientId', 'firstName lastName avatar email bio location isEmailVerified createdAt')
      .populate('selectedCreatorId', 'firstName lastName avatar category');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Increment view count
    await project.incrementViews();

    // Check if current user has applied (if authenticated)
    let hasApplied = false;
    if (req.user) {
      hasApplied = await Application.checkExistingApplication(project._id, req.user._id);
    }

    res.json({
      success: true,
      data: {
        project: project.toObject(),
        hasApplied
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project'
    });
  }
});

// Create new project (clients only or any user)
router.post('/', protect, async (req, res) => {
  try {
    const {
      title, description, category, budget, timeline, deadline,
      skillsRequired, deliverables, projectType, coverImage
    } = req.body;

    // Validation
    if (!title || !description || !category || !budget || !timeline) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (budget.min > budget.max) {
      return res.status(400).json({
        success: false,
        message: 'Minimum budget cannot be greater than maximum budget'
      });
    }

    const project = new Project({
      title,
      description,
      category,
      budget,
      timeline,
      deadline: deadline ? new Date(deadline) : null,
      skillsRequired: skillsRequired || [],
      deliverables: deliverables || [],
      projectType: projectType || 'one-time',
      coverImage: coverImage || null,
      clientId: req.user._id
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('clientId', 'firstName lastName avatar email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project: populatedProject }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project'
    });
  }
});

// Update project
router.patch('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user owns this project
    if (project.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this project'
      });
    }

    const allowedUpdates = ['title', 'description', 'budget', 'timeline', 'deadline', 'skillsRequired', 'deliverables', 'status'];
    const updates = Object.keys(req.body);
    const isValidUpdate = updates.every(update => allowedUpdates.includes(update));

    if (!isValidUpdate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates'
      });
    }

    updates.forEach(update => project[update] = req.body[update]);
    await project.save();

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
});

// Get my projects (projects I posted AND projects where I'm the creator)
router.get('/my/posted', protect, async (req, res) => {
  try {
    // Get projects I posted OR projects where I'm the selected creator
    const projects = await Project.find({
      $or: [
        { clientId: req.user._id },
        { selectedCreatorId: req.user._id }
      ]
    })
      .populate('clientId', 'firstName lastName avatar email')
      .populate('selectedCreatorId', 'firstName lastName avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    console.error('Error fetching my projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

// Get applications for a project (project owner only)
router.get('/:id/applications', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user owns this project
    if (project.clientId.toString() !== req.user._id.toString().toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view applications'
      });
    }

    const applications = await Application.findByProject(req.params.id);

    res.json({
      success: true,
      data: { applications }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications'
    });
  }
});

// Apply to project (creators)
router.post('/:id/apply', protect, async (req, res) => {
  try {
    const { coverLetter, proposedBudget, proposedTimeline, portfolioLinks } = req.body;

    if (!coverLetter || !proposedBudget || !proposedTimeline) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'This project is no longer accepting applications'
      });
    }

    // Check if user already applied
    const hasApplied = await Application.checkExistingApplication(project._id, req.user._id);
    if (hasApplied) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this project'
      });
    }

    const application = new Application({
      projectId: project._id,
      creatorId: req.user._id,
      coverLetter,
      proposedBudget,
      proposedTimeline,
      portfolioLinks: portfolioLinks || []
    });

    await application.save();
    await project.incrementApplications();

    const populatedApplication = await Application.findById(application._id)
      .populate('creatorId', 'firstName lastName avatar category');

    // Populate project with client details for notification
    await project.populate('clientId', 'firstName lastName email');

    // Create notification for project owner
    await Notification.createNotification({
      recipient: project.clientId._id,
      sender: req.user._id,
      type: 'project_application_received',
      title: 'New Project Application',
      message: `${req.user.name} has applied to your project "${project.title}" with a proposed budget of ${proposedBudget.amount} ${proposedBudget.currency}`,
      link: `/projects`,
      project: project._id,
      metadata: {
        projectId: project._id,
        projectTitle: project.title,
        proposedBudget: proposedBudget.amount,
        currency: proposedBudget.currency,
        applicationId: application._id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application: populatedApplication }
    });
  } catch (error) {
    console.error('Error applying to project:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this project'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit application'
    });
  }
});

// Get my applications (applications I submitted)
router.get('/my/applications', protect, async (req, res) => {
  try {
    const applications = await Application.findByCreator(req.user._id);

    res.json({
      success: true,
      data: { applications }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications'
    });
  }
});

// Accept/reject application (project owner only)
router.patch('/applications/:id', protect, async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    if (status === 'accepted') {
      // Use projectService for payment/escrow transaction
      try {
        const result = await projectService.acceptApplicationWithTransaction(
          req.params.id,
          req.user._id
        );

        const { application, project } = result;

        // Populate creator details for notifications
        await application.populate('creatorId', 'firstName lastName email name');

        // Notify creator of acceptance
        await Notification.createNotification({
          recipient: application.creatorId._id,
          sender: req.user._id,
          type: 'project_application_accepted',
          title: 'Application Accepted!',
          message: `Congratulations! Your application for "${project.title}" has been accepted. The project has started.`,
          link: `/projects`,
          project: project._id,
          metadata: {
            projectId: project._id,
            projectTitle: project.title,
            proposedBudget: application.proposedBudget.amount,
            currency: application.proposedBudget.currency,
            reviewNotes
          }
        });

        // Notify client that project has started
        await Notification.createNotification({
          recipient: project.clientId,
          sender: application.creatorId._id,
          type: 'project_started',
          title: 'Project Started',
          message: `Your project "${project.title}" has started with ${application.creatorId.name}. Payment has been held in escrow.`,
          link: `/projects`,
          project: project._id,
          metadata: {
            projectId: project._id,
            projectTitle: project.title,
            creatorName: application.creatorId.name,
            amount: application.proposedBudget.amount
          }
        });

        res.json({
          success: true,
          message: 'Application accepted successfully. Please proceed to payment to start the project.',
          data: { application, project }
        });
      } catch (error) {
        console.error('Error accepting application:', error);

        // Handle specific errors
        if (error.statusCode === 400 && error.message.includes('Insufficient balance')) {
          return res.status(400).json({
            success: false,
            message: error.message
          });
        }

        return res.status(error.statusCode || 500).json({
          success: false,
          message: error.message || 'Failed to accept application'
        });
      }
    } else {
      // Rejection flow (no payment involved)
      const application = await Application.findById(req.params.id).populate('projectId');

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const project = application.projectId;

      // Check if user owns the project
      if (project.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Populate creator details for notification
      await application.populate('creatorId', 'firstName lastName email name');

      await application.reject(reviewNotes);

      // Notify creator of rejection
      await Notification.createNotification({
        recipient: application.creatorId._id,
        sender: req.user._id,
        type: 'project_application_rejected',
        title: 'Application Not Selected',
        message: `Your application for "${project.title}" was not selected.${reviewNotes ? ` Feedback: ${reviewNotes}` : ''}`,
        link: `/projects`,
        project: project._id,
        metadata: {
          projectId: project._id,
          projectTitle: project.title,
          reviewNotes
        }
      });

      res.json({
        success: true,
        message: 'Application rejected successfully',
        data: { application }
      });
    }
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application'
    });
  }
});

// Pay for project (clients only)
router.post('/:id/pay', protect, async (req, res) => {
  try {
    const result = await projectService.processProjectPayment(req.params.id, req.user._id);
    const { project, client } = result;

    // Notify creator that payment is received and work can start
    await Notification.createNotification({
      recipient: project.selectedCreatorId,
      sender: client._id,
      type: 'project_started',
      title: 'Project Payment Received',
      message: `${client.firstName} ${client.lastName} has paid for project "${project.title}". You can now start the work.`,
      link: `/projects`,
      project: project._id,
      metadata: {
        projectId: project._id,
        projectTitle: project.title,
        amount: project.amount
      }
    });

    res.json({
      success: true,
      message: 'Payment successful. Project is now in progress.',
      data: { project }
    });
  } catch (error) {
    console.error('Error processing project payment:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to process payment'
    });
  }
});

// Submit project deliverable (creators only)
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const { url, message } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Deliverable URL is required'
      });
    }

    const project = await projectService.submitProjectDeliverable(
      req.params.id,
      req.user._id,
      { url, filename: 'Deliverable', uploadedAt: new Date() }
    );

    // Notify client that work has been delivered
    await Notification.createNotification({
      recipient: project.clientId,
      sender: req.user._id,
      type: 'project_delivered',
      title: 'Project Work Delivered',
      message: `${req.user.name} has submitted deliverables for project "${project.title}". Please review it.`,
      link: `/projects`,
      project: project._id,
      metadata: {
        projectId: project._id,
        projectTitle: project.title
      }
    });

    res.json({
      success: true,
      message: 'Deliverable submitted successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Error submitting project deliverable:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to submit deliverable'
    });
  }
});

// Release funds for project (clients only)
router.post('/:id/release-funds', protect, async (req, res) => {
  try {
    const result = await projectService.releaseFundsWithTransaction(
      req.params.id,
      req.user._id
    );

    const { project, creator, amount } = result;

    // Notify creator that funds are released
    await Notification.createNotification({
      recipient: creator._id,
      sender: req.user._id,
      type: 'payment_received',
      title: 'Payment Released',
      message: `Payment of ${amount} USDC for project "${project.title}" has been released to your wallet.`,
      link: `/wallet`,
      project: project._id,
      metadata: {
        projectId: project._id,
        projectTitle: project.title,
        amount
      }
    });

    res.json({
      success: true,
      message: 'Funds released successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Error releasing project funds:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to release funds'
    });
  }
});

// Add message to project
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const isAuthorized =
      project.clientId.toString() === req.user._id.toString() ||
      project.selectedCreatorId?.toString() === req.user._id.toString();

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to message in this project'
      });
    }

    await project.addMessage(req.user._id, message);

    // Create notification for the other party
    const recipient = project.clientId.toString() === req.user._id.toString()
      ? project.selectedCreatorId
      : project.clientId;

    if (recipient) {
      await Notification.createNotification({
        recipient,
        sender: req.user._id,
        type: 'project_message',
        title: 'New Project Message',
        message: `${req.user.name} sent you a message regarding project "${project.title}"`,
        link: `/bookings`,
        project: project._id
      });
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Error adding project message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

module.exports = router;
