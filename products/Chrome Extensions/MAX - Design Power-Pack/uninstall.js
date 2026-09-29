document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('feedback-form');
  const submitDirectBtn = document.getElementById('submit-direct-btn');
  const submitEmailBtn = document.getElementById('submit-email-btn');
  const formFields = document.getElementById('form-fields');
  const successPane = document.getElementById('success-pane');

  // 1. Direct Web-Submit (Anonymous/Online - no local mail client required)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Change button state
    submitDirectBtn.disabled = true;
    submitDirectBtn.querySelector('span').textContent = 'Submitting...';

    const formData = new FormData(form);
    const selectedReasons = Array.from(form.querySelectorAll('input[name="reason"]:checked')).map(cb => cb.value);
    const detailsText = document.getElementById('details').value.trim();

    // Prepare JSON payload for serverless handler
    const payload = {
      reasons: selectedReasons,
      details: detailsText,
      timestamp: new Date().toISOString()
    };

    try {
      // Send the feedback online to Formspree, Google Sheets web app, or custom webhook
      // Replace the form action URL in uninstall.html with your active endpoint
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Show success screen even if it is a mock endpoint to ensure smooth user experience
      showSuccessState();
    } catch (err) {
      console.warn('Online submission failed, showing success state anyway to maintain premium UX.', err);
      showSuccessState();
    }
  });

  // 2. Mailto Client fallback submission (Requires default mail client)
  submitEmailBtn.addEventListener('click', () => {
    const selectedReasons = Array.from(form.querySelectorAll('input[name="reason"]:checked')).map(cb => cb.value);
    const detailsText = document.getElementById('details').value.trim();

    const subject = encodeURIComponent('MAX - Design Power-Pack Uninstall Feedback');
    
    let bodyText = 'MAX Feedback Report:\n';
    bodyText += '=================================\n';
    bodyText += `Reasons for uninstalling:\n${selectedReasons.length > 0 ? selectedReasons.map(r => ` - ${r}`).join('\n') : ' - None selected'}\n\n`;
    bodyText += `Additional details:\n${detailsText ? detailsText : 'No additional details provided.'}\n`;
    bodyText += '=================================\n';
    
    const body = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:maxiechen96@gmail.com?subject=${subject}&body=${body}`;

    // Open mail client
    window.location.href = mailtoUrl;
  });

  function showSuccessState() {
    formFields.style.display = 'none';
    successPane.style.display = 'block';
  }
});
