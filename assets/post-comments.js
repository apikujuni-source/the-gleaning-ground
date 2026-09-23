(() => {
  const section = document.querySelector('[data-post-comments]');
  if (!section) return;

  const ENDPOINT = '/api/comments';
  const NAME_KEY = 'gg-comment-name';
  const postPath = section.dataset.postPath;
  const postTitle = section.dataset.postTitle || document.title;

  const list = section.querySelector('.comment-list');
  const empty = section.querySelector('.comment-empty');
  const count = section.querySelector('.comment-count');
  const form = section.querySelector('.comment-form');
  const status = section.querySelector('.comment-status');
  const submit = form.querySelector('button[type="submit"]');
  const nameInput = form.querySelector('[name="name"]');
  const bodyInput = form.querySelector('[name="body"]');
  const honeypot = form.querySelector('[name="website"]');

  let total = 0;

  const formatDate = (value) => {
    try { return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  };

  const setCount = (value) => {
    total = value;
    count.textContent = value ? `(${value})` : '';
    empty.hidden = value > 0;
  };

  const setStatus = (message, tone = '') => {
    status.textContent = message;
    status.dataset.tone = tone;
  };

  // Comment text is always inserted with textContent so visitors cannot inject markup.
  const renderComment = (comment) => {
    const item = document.createElement('li');
    item.className = 'comment';

    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    const avatar = document.createElement('span');
    avatar.className = 'comment-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = (comment.name || '?').trim().charAt(0).toUpperCase();
    const author = document.createElement('strong');
    author.textContent = comment.name;
    const time = document.createElement('time');
    time.dateTime = comment.createdAt;
    time.textContent = formatDate(comment.createdAt);
    meta.append(avatar, author, time);

    const body = document.createElement('p');
    body.className = 'comment-body';
    body.textContent = comment.body;

    item.append(meta, body);
    return item;
  };

  const load = async () => {
    try {
      const response = await fetch(`${ENDPOINT}?post=${encodeURIComponent(postPath)}`, { headers: { accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || 'Comments could not be loaded.');
      list.replaceChildren(...result.comments.map(renderComment));
      setCount(result.comments.length);
    } catch {
      empty.hidden = true;
      setStatus('Comments could not be loaded right now. Please refresh the page to try again.', 'error');
    } finally {
      section.setAttribute('aria-busy', 'false');
    }
  };

  try { nameInput.value = localStorage.getItem(NAME_KEY) || ''; } catch {}

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submit.disabled = true;
    setStatus('Posting your comment…');
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          post: postPath,
          title: postTitle,
          name: nameInput.value,
          body: bodyInput.value,
          website: honeypot.value
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || 'Your comment could not be posted. Please try again.');

      if (result.comment) {
        const item = renderComment(result.comment);
        item.classList.add('is-new');
        list.append(item);
        setCount(total + 1);
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      try { localStorage.setItem(NAME_KEY, nameInput.value.trim()); } catch {}
      bodyInput.value = '';
      setStatus('Thank you — your comment has been posted.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });

  load();
})();
