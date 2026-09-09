const form = document.querySelector('#login-form'), button = form.querySelector('button'), error = document.querySelector('#login-error');
form.addEventListener('submit', async event => {
  event.preventDefault(); button.disabled = true; error.textContent = ''; button.textContent = 'Abrindo…';
  try {
    const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: form.password.value }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    location.replace('/');
  } catch (e) { error.textContent = e.message === 'Failed to fetch' ? 'Não foi possível conectar. Tente novamente.' : e.message; form.password.select(); }
  finally { button.disabled = false; button.textContent = 'Abrir meu cantinho ♡'; }
});
