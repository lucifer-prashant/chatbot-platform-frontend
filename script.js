document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chatbotConfigForm');
    const embedCodeSection = document.getElementById('embedCodeSection');
    const embedCodeOutput = document.getElementById('embedCodeOutput');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyStatus = document.getElementById('copyStatus');

    // The URLs of YOUR hosted scripts
    const CHATBOT_WIDGET_URL = 'https://lucifer-prashant.github.io/chatbot-platform-frontend/chatbot-widget.js'; // Ensure this is your actual hosted path
    const CONTENT_SCRAPER_URL = 'https://lucifer-prashant.github.io/chatbot-platform-frontend/content-scraper.js'; // Ensure this is your actual hosted path

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const siteId = 'site_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

        // Build the options object
        const chatbotOptions = {
            persona: document.getElementById('chatbotName').value,
            greeting: document.getElementById('greeting').value,
            theme: document.getElementById('theme').value,
            mainColor: document.getElementById('mainColor').value,
            textColor: document.getElementById('textColor').value,
            language: document.getElementById('language').value,
            enablePageContentContext: document.getElementById('enablePageContentContext').checked
            // Default options from defaultConfig in chatbot-widget.js will fill in the rest
            // e.g., iconPosition, windowAlignment, pulseAnimation, windowWidth, windowHeight, pageContentContextGreetingSuffix
        };

        const hfToken = document.getElementById('hfToken').value.trim();
        if (hfToken) {
            chatbotOptions.hfToken = hfToken;
        }

        const scraperScriptTag = chatbotOptions.enablePageContentContext
            ? `<script src="${CONTENT_SCRAPER_URL}" defer><\/script>\n` // Escaped closing script tag
            : '';

        const embedCode = `
<!-- Start of MyChatPlatform Embed Code -->
${scraperScriptTag}<script src="${CHATBOT_WIDGET_URL}" defer><\/script>
<script>
  window.chatbotConfig = {
    siteId: "${siteId}",
    options: ${JSON.stringify(chatbotOptions, null, 2).replace(/</g, '\\u003c')} /* Escape < for script tag safety */
  };
<\/script> <!-- Escaped closing script tag -->
<!-- End of MyChatPlatform Embed Code -->`;

        embedCodeOutput.value = embedCode.trim();
        embedCodeSection.style.display = 'block';
        copyStatus.textContent = '';
        copyStatus.className = 'copy-status';

        embedCodeSection.scrollIntoView({ behavior: 'smooth' });
    });

    copyCodeBtn.addEventListener('click', () => {
        if (!embedCodeOutput.value) return;

        embedCodeOutput.select();
        embedCodeOutput.setSelectionRange(0, 99999); // For mobile devices

        try {
            // Modern way: Clipboard API
            navigator.clipboard.writeText(embedCodeOutput.value).then(() => {
                copyStatus.textContent = 'Copied to clipboard!';
                copyStatus.className = 'copy-status success';
            }).catch(err => {
                console.warn('Async clipboard copy failed, trying fallback:', err);
                oldCopyToClipboard(); // Fallback for browsers that don't support navigator.clipboard or if it fails
            });
        } catch (e) {
            console.warn('Clipboard API not available, trying fallback:', e);
            oldCopyToClipboard(); // Fallback for older browsers
        }

        setTimeout(() => {
            copyStatus.textContent = '';
            copyStatus.className = 'copy-status';
        }, 3000);
    });
    
    function oldCopyToClipboard() {
        // Fallback method using execCommand
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