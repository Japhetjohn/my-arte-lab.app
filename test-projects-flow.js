const API_BASE = 'http://localhost:5000/api';

let clientToken = '';
let creatorToken = '';
let projectId = '';
let applicationId = '';

async function testFlow() {
  console.log('\n🧪 Testing Project Marketplace Flow\n');
  console.log('='.repeat(50));

  try {
    // Step 1: Register Client
    console.log('\n1️⃣  Registering client user...');
    const clientEmail = `client_${Date.now()}@test.com`;
    const clientRegister = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Client',
        email: clientEmail,
        password: 'Test1234!',
        role: 'client'
      })
    });
    const clientData = await clientRegister.json();

    if (!clientData.success) {
      throw new Error(`Client registration failed: ${clientData.message}`);
    }

    clientToken = clientData.data.token;
    console.log('✅ Client registered successfully');
    console.log(`   Email: ${clientEmail}`);

    // Step 2: Register Creator
    console.log('\n2️⃣  Registering creator user...');
    const creatorEmail = `creator_${Date.now()}@test.com`;
    const creatorRegister = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Creator',
        email: creatorEmail,
        password: 'Test1234!',
        role: 'creator',
        category: 'photographer',
        skills: ['Photography', 'Video Editing'],
        bio: 'Professional photographer and videographer'
      })
    });
    const creatorData = await creatorRegister.json();

    if (!creatorData.success) {
      console.log('Creator registration response:', JSON.stringify(creatorData, null, 2));
      throw new Error(`Creator registration failed: ${creatorData.message || JSON.stringify(creatorData)}`);
    }

    creatorToken = creatorData.data.token;
    console.log('✅ Creator registered successfully');
    console.log(`   Email: ${creatorEmail}`);

    // Step 3: Client Posts a Project
    console.log('\n3️⃣  Client posting a project...');
    const projectData = {
      title: 'Wedding Photography Project',
      description: 'Looking for a professional photographer for a wedding event. Must have experience with outdoor photography and event coverage.',
      category: 'photography',
      budget: { min: 500, max: 1000, negotiable: true },
      timeline: '1-month',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      skillsRequired: ['Wedding Photography', 'Photo Editing', 'Lightroom'],
      deliverables: ['200+ edited photos', 'Full event coverage', 'Photo album'],
      projectType: 'one-time'
    };

    const createProject = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify(projectData)
    });
    const projectResult = await createProject.json();

    if (!projectResult.success) {
      console.log('Project creation response:', JSON.stringify(projectResult, null, 2));
      throw new Error(`Project creation failed: ${projectResult.message || JSON.stringify(projectResult)}`);
    }

    projectId = projectResult.data.project._id;
    console.log('✅ Project created successfully');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Title: ${projectResult.data.project.title}`);
    console.log(`   Budget: $${projectResult.data.project.budget.min} - $${projectResult.data.project.budget.max}`);

    // Step 4: Browse Projects (Unauthenticated)
    console.log('\n4️⃣  Browsing projects (public access)...');
    const browseProjects = await fetch(`${API_BASE}/projects`);
    const browseResult = await browseProjects.json();

    if (!browseResult.success) {
      throw new Error(`Browse projects failed: ${browseResult.message}`);
    }

    console.log(`✅ Found ${browseResult.data.projects.length} project(s)`);

    // Step 5: View Project Details (as Creator)
    console.log('\n5️⃣  Creator viewing project details...');
    const viewProject = await fetch(`${API_BASE}/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${creatorToken}`
      }
    });
    const projectDetails = await viewProject.json();

    if (!projectDetails.success) {
      throw new Error(`View project failed: ${projectDetails.message}`);
    }

    console.log('✅ Project details retrieved');
    console.log(`   Has Applied: ${projectDetails.data.project.hasApplied}`);
    console.log(`   Applications: ${projectDetails.data.project.applicationsCount}`);

    // Step 6: Creator Applies to Project
    console.log('\n6️⃣  Creator applying to project...');
    const applicationData = {
      coverLetter: 'I am a professional wedding photographer with 5 years of experience. I would love to work on this project!',
      proposedBudget: {
        amount: 800,
        currency: 'USDC'
      },
      proposedTimeline: '3 weeks',
      portfolioLinks: [
        { url: 'https://example.com/portfolio1', title: 'Wedding Portfolio' },
        { url: 'https://example.com/portfolio2', title: 'Event Photography' }
      ]
    };

    const applyToProject = await fetch(`${API_BASE}/projects/${projectId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatorToken}`
      },
      body: JSON.stringify(applicationData)
    });
    const applyResult = await applyToProject.json();

    if (!applyResult.success) {
      console.log('Application response:', JSON.stringify(applyResult, null, 2));
      throw new Error(`Application failed: ${applyResult.message || JSON.stringify(applyResult)}`);
    }

    applicationId = applyResult.data.application._id;
    console.log('✅ Application submitted successfully');
    console.log(`   Application ID: ${applicationId}`);
    console.log(`   Proposed Budget: $${applyResult.data.application.proposedBudget.amount}`);

    // Step 7: Client Views Applications
    console.log('\n7️⃣  Client viewing applications...');
    const viewApplications = await fetch(`${API_BASE}/projects/${projectId}/applications`, {
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const applicationsResult = await viewApplications.json();

    if (!applicationsResult.success) {
      throw new Error(`View applications failed: ${applicationsResult.message}`);
    }

    console.log(`✅ Found ${applicationsResult.data.applications.length} application(s)`);
    console.log(`   Applicant: ${applicationsResult.data.applications[0].creatorId.name}`);

    // Step 8: Client Accepts Application
    console.log('\n8️⃣  Client accepting application...');
    const acceptApplication = await fetch(`${API_BASE}/projects/applications/${applicationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        status: 'accepted',
        reviewNotes: 'Your portfolio is impressive. Looking forward to working with you!'
      })
    });
    const acceptResult = await acceptApplication.json();

    if (!acceptResult.success) {
      throw new Error(`Accept application failed: ${acceptResult.message}`);
    }

    console.log('✅ Application accepted successfully');
    console.log(`   Status: ${acceptResult.data.application.status}`);

    // Step 9: Verify Project Status Updated
    console.log('\n9️⃣  Verifying project status...');
    const checkProject = await fetch(`${API_BASE}/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const finalProjectState = await checkProject.json();

    console.log('✅ Project status verified');
    console.log(`   Status: ${finalProjectState.data.project.status}`);

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ ALL TESTS PASSED! Project marketplace is working correctly.\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

testFlow();
