// Auth Page Navigation
function showAuthPage(pageId) {
    document.querySelectorAll('.auth-page').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

// Main App Page Navigation
function showMainPage(pageId) {
    // Hide all main pages
    document.querySelectorAll('.main-page').forEach(page => {
        page.classList.add('hidden');
    });

    // Show target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('fade-in');
        window.scrollTo(0, 0);
    }

    // Update sidebar nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('active');
    }
}

// Toggle Sidebar on Mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// Notification Tab Switching
function switchNotifTab(tabElement, type) {
    // Remove active from all tabs
    document.querySelectorAll('.notification-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Add active to clicked tab
    tabElement.classList.add('active');

    // Hide all notification lists
    document.getElementById('generalNotif').classList.add('hidden');
    document.getElementById('systemNotif').classList.add('hidden');
    document.getElementById('promoNotif').classList.add('hidden');

    // Show target list
    if (type === 'general') document.getElementById('generalNotif').classList.remove('hidden');
    if (type === 'system') document.getElementById('systemNotif').classList.remove('hidden');
    if (type === 'promo') document.getElementById('promoNotif').classList.remove('hidden');
}

// Level Selection
function selectLevel(card) {
    const cards = card.parentElement.querySelectorAll('.level-card');
    cards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
}

// Modal Functions
function showModal() {
    document.getElementById('successModal').classList.add('active');
}

function closeModal() {
    document.getElementById('successModal').classList.remove('active');
    if (document.body && document.body.dataset && document.body.dataset.page === 'auth') {
        showAuthPage('loginPage');
    }
}

// Logout
function logout() {
    window.location.href = 'login.html';
}

// Initialize + event listeners
function initApp() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            showModal();
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

    showAuthPage('loginPage');
}

document.addEventListener('DOMContentLoaded', initApp);
