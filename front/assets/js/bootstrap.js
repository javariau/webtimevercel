function initApp() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            try {
                await handleLoginSubmit(loginForm);
            } catch (err) {
                alert('Login gagal. Coba lagi.');
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            try {
                await handleRegisterSubmit(registerForm);
            } catch (err) {
                alert('Register gagal. Coba lagi.');
            }
        });
    }

    document.querySelectorAll('.gender-option').forEach(option => {
        option.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.gender-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('input').checked = false;
            });
            this.classList.add('selected');
            this.querySelector('input').checked = true;
        });
    });

    document.querySelectorAll('.category-pills .pill').forEach(pill => {
        pill.addEventListener('click', function () {
            const parent = this.parentElement;
            parent.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.addEventListener('click', function (e) {
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.querySelector('.mobile-menu-btn');

        if (
            window.innerWidth <= 992 &&
            sidebar &&
            menuBtn &&
            !sidebar.contains(e.target) &&
            !menuBtn.contains(e.target) &&
            sidebar.classList.contains('open')
        ) {
            toggleSidebar();
        }
    });

    initMateriPage();

    if (typeof window.initDataPages === 'function') {
        window.initDataPages();
    }

    requireAuthIfNeeded();
}
