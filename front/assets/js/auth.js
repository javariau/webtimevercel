async function handleLoginSubmit(loginForm) {
    const emailInput = loginForm.querySelector('input[type="email"]');
    const passwordInput = loginForm.querySelector('input[type="password"]');
    const email = emailInput ? String(emailInput.value || '').trim().toLowerCase() : '';
    const password = passwordInput ? String(passwordInput.value || '').trim() : '';

    const sb = await getSupabaseClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
        alert(error.message);
        return;
    }

    window.location.href = 'index.html';
}

async function handleRegisterSubmit(registerForm) {
    const fullNameInput = registerForm.querySelector('input[type="text"]');
    const usernameInput = registerForm.querySelector('input[name="username"]');
    const emailInput = registerForm.querySelector('input[type="email"]');
    const mobileInput = registerForm.querySelector('input[type="tel"]');
    const passwordInputs = registerForm.querySelectorAll('input[type="password"]');
    const email = emailInput ? String(emailInput.value || '').trim().toLowerCase() : '';
    const fullName = fullNameInput ? String(fullNameInput.value || '').trim() : '';
    const username = usernameInput ? String(usernameInput.value || '').trim() : '';
    const mobileNo = mobileInput ? String(mobileInput.value || '').trim() : '';
    const password = passwordInputs && passwordInputs[0] ? String(passwordInputs[0].value || '').trim() : '';
    const confirmPassword = passwordInputs && passwordInputs[1] ? String(passwordInputs[1].value || '').trim() : '';

    if (password !== confirmPassword) {
        alert('Konfirmasi password tidak sama.');
        return;
    }

    const sb = await getSupabaseClient();
    const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                username,
                mobile_no: mobileNo,
            },
        },
    });
    if (error) {
        alert(error.message);
        return;
    }

    alert('Pendaftaran berhasil. Silakan login.');
    window.location.href = 'login.html';
}

function logout() {
    getSupabaseClient()
        .then(sb => sb.auth.signOut())
        .catch(() => null)
        .finally(() => {
            window.location.href = 'login.html';
        });
}
