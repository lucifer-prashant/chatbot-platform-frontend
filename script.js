document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chatbotConfigForm');
    const embedCodeSection = document.getElementById('embedCodeSection');
    const embedCodeOutput = document.getElementById('embedCodeOutput');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyStatus = document.getElementById('copyStatus');

    // The URL of YOUR hosted chatbot widget script
    const CHATBOT_WIDGET_URL = 'https://lucifer-prashant.github.io/chatbot-platform-frontend/chatbot-widget.js';

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const websiteUrl = document.getElementById('websiteUrl').value; // For your platform's internal use, not directly in widget config
        const chatbotName = document.getElementById('chatbotName').value;
        const theme = document.getElementById('theme').value;
        const language = document.getElementById('language').value;
        const greeting = document.getElementById('greeting').value;
        const mainColor = document.getElementById('mainColor').value;
        const textColor = document.getElementById('textColor').value;

        // Generate a pseudo-unique siteId (in a real app, this comes from a backend)
        const siteId = 'site_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

        // Escape double quotes in strings that will be part of the JS object
        const escapeDoubleQuotes = (str) => str.replace(/"/g, '\\"');

        const embedCode = `
<!-- Start of MyChatPlatform Embed Code -->
<script src="${CHATBOT_WIDGET_URL}" defer></script>
<script>
  window.chatbotConfig = {
    siteId: "${siteId}",
    options: {
      persona: "${escapeDoubleQuotes(chatbotName)}",
      greeting: "${escapeDoubleQuotes(greeting)}",
      theme: "${theme}",
      mainColor: "${mainColor}",
      textColor: "${textColor}",
      language: "${language}"
      // You can add more pre-configured options here from your form
    }
  };
</script>
<!-- End of MyChatPlatform Embed Code -->`;

        embedCodeOutput.value = embedCode.trim();
        embedCodeSection.style.display = 'block';
        copyStatus.textContent = ''; // Clear previous status
        copyStatus.className = 'copy-status'; // Reset class

        // Scroll to the embed code section
        embedCodeSection.scrollIntoView({ behavior: 'smooth' });
    });

    copyCodeBtn.addEventListener('click', () => {
        if (!embedCodeOutput.value) return;

        embedCodeOutput.select();
        embedCodeOutput.setSelectionRange(0, 99999); // For mobile devices

        try {
            // Using Clipboard API for modern browsers
            navigator.clipboard.writeText(embedCodeOutput.value).then(() => {
                copyStatus.textContent = 'Copied to clipboard!';
                copyStatus.className = 'copy-status success';
            }).catch(err => {
                // Fallback for older browsers or if Clipboard API fails
                oldCopyToClipboard();
            });
        } catch (e) {
            oldCopyToClipboard(); // Fallback for very old browsers that don't even have navigator.clipboard
        }

        setTimeout(() => {
            copyStatus.textContent = '';
            copyStatus.className = 'copy-status';
        }, 3000);
    });

    // Fallback copy method
    function oldCopyToClipboard() {
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                copyStatus.textContent = 'Copied (fallback method)!';
                copyStatus.className = 'copy-status success';
            } else {
                copyStatus.textContent = 'Failed to copy. Please copy manually.';
                copyStatus.className = 'copy-status error';
            }
        } catch (err) {
            copyStatus.textContent = 'Error copying. Please copy manually.';
            copyStatus.className = 'copy-status error';
            console.error('Fallback copy: Oops, unable to copy', err);
        }
    }
});