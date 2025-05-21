document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chatbotConfigForm');
    const generateCodeBtn = document.getElementById('generateCodeBtn');
    const embedCodeSection = document.getElementById('embedCodeSection');
    const embedCodeOutput = document.getElementById('embedCodeOutput');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyStatus = document.getElementById('copyStatus');

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const websiteUrl = document.getElementById('websiteUrl').value; // Not used in embed code yet, but good to have
        const chatbotName = document.getElementById('chatbotName').value;
        const theme = document.getElementById('theme').value;
        const language = document.getElementById('language').value;

        // In a real platform, siteId would be generated uniquely by your backend
        // and associated with the user's account. For this demo, a simple random one.
        const siteId = 'site_' + Math.random().toString(36).substring(2, 15);

        // IMPORTANT: The src for chatbot-widget.js should be your actual CDN URL in production.
        // For local testing, we'll assume it's in the same directory.
        const chatbotWidgetUrl = 'chatbot-widget.js'; // Replace with 'https://yourcdn.com/chatbot-widget.js' in production

        const embedCode = `
<script src="${chatbotWidgetUrl}" defer></script>
<script>
  window.chatbotConfig = {
    siteId: "${siteId}",
    options: {
      theme: "${theme}",
      persona: "${chatbotName}",
      language: "${language}"
      // You can add more pre-configured options here
    }
  };
</script>`;

        embedCodeOutput.value = embedCode.trim();
        embedCodeSection.style.display = 'block';
        copyStatus.style.display = 'none'; // Hide status if shown previously
    });

    copyCodeBtn.addEventListener('click', () => {
        embedCodeOutput.select();
        embedCodeOutput.setSelectionRange(0, 99999); // For mobile devices

        try {
            document.execCommand('copy');
            copyStatus.textContent = 'Copied!';
            copyStatus.style.color = 'green';
        } catch (err) {
            copyStatus.textContent = 'Failed to copy!';
            copyStatus.style.color = 'red';
            console.error('Failed to copy text: ', err);
        }
        copyStatus.style.display = 'inline';
        setTimeout(() => {
            copyStatus.style.display = 'none';
        }, 2000);
    });
});