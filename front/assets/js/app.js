async function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-src="${src}"]`);
        if (existing) {
            resolve();
            return;
        }

        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.dataset.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(s);
    });
}

async function boot() {
    await loadScript('assets/js/supabaseClient.js');
    await loadScript('assets/js/ui.js');
    await loadScript('assets/js/auth.js');
    await loadScript('assets/js/materiPage.js');
    await loadScript('assets/js/dataPages.js');
    await loadScript('assets/js/bootstrap.js');

    const run = () => {
        if (typeof window.initApp === 'function') {
            window.initApp();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
}

boot().catch(() => null);
