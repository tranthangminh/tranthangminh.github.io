/**
 * MAX - Multi Chat welcome-guide.js
 * Generates and renders the Quick Start Guide welcome screen.
 */
function renderWelcomeGuide(containerId = "welcome-screen") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="welcome-card">
      <h1>MAX - Multi Chat</h1>
      <p class="welcome-subtitle">Quick Start Guide — Get started in 4 simple steps:</p>
      
      <div class="welcome-guide-steps">
        <div class="guide-step step-group">
          <div class="step-number">1</div>
          <div class="step-info">
            <h3>Create Main Group</h3>
            <p>Click the <span class="badge badge-group"><span class="icon-add"></span></span> button at the bottom of Column 1 to create a theme group (e.g., Work, Entertainment).</p>
          </div>
        </div>
        
        <div class="guide-step step-sub-group">
          <div class="step-number">2</div>
          <div class="step-info">
            <h3>Create Sub-group</h3>
            <p>Click the <span class="badge badge-sub-group"><span class="icon-add"></span> Add Sub-group</span> button at the bottom of Column 2 to create category folders.</p>
          </div>
        </div>
        
        <div class="guide-step step-link">
          <div class="step-number">3</div>
          <div class="step-info">
            <h3>Add Chat Channels</h3>
            <p>Click the <span class="badge badge-link"><span class="icon-add"></span> Add Link</span> button in Column 2 to add custom URLs or select pre-configured popular chat presets.</p>
          </div>
        </div>

        <div class="guide-step step-backup">
          <div class="step-number">4</div>
          <div class="step-info">
            <h3>Backup & Restore Data</h3>
            <p>Use <span class="badge badge-backup">Export CSV</span> or <span class="badge badge-backup">Import CSV</span> in Settings to safely backup and restore all your channel configurations anytime.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
