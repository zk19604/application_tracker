const STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Ghosted'];
const STATUS_CLASS = {
  'Applied': 'badge-applied',
  'Screening': 'badge-screening',
  'Interview': 'badge-interview',
  'Offer': 'badge-offer',
  'Rejected': 'badge-rejected',
  'Ghosted': 'badge-ghosted',
};

let jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
let sortField = 'date';
let sortDir = 'desc';



function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function save() {
  localStorage.setItem('jobs', JSON.stringify(jobs));
}

function updateStats() {
  document.getElementById('stat-total').textContent = jobs.length;
  const active = jobs.filter(j => ['Applied', 'Screening'].includes(j.status)).length;
  const interviewing = jobs.filter(j => j.status === 'Interview').length;
  const offers = jobs.filter(j => j.status === 'Offer').length;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-interviewing').textContent = interviewing;
  document.getElementById('stat-offers').textContent = offers;
  document.getElementById('empty-state').style.display = jobs.length === 0 ? 'block' : 'none';
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function getSortValue(job, field) {
  switch (field) {
    case 'date':
      return job.date ? new Date(job.date + 'T12:00:00').getTime() : 0;
    case 'status':
      return STATUSES.indexOf(job.status);
    case 'salary':
      const num = parseInt((job.salary || '0').replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    default:
      return (job[field] || '').toString().toLowerCase();
  }
}

function sortJobs() {
  jobs.sort((a, b) => {
    const aVal = getSortValue(a, sortField);
    const bVal = getSortValue(b, sortField);
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function updateSortIcons() {
  document.querySelectorAll('thead th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === sortField) {
      th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function buildRow(job, index) {
  const tr = document.createElement('tr');
  tr.dataset.id = job.id;
  tr.dataset.index = index;

  const editCell = (field, value, cls = '') => {
    const td = document.createElement('td');
    if (cls) td.className = cls;
    const span = document.createElement('span');
    span.className = 'editable';
    span.contentEditable = 'true';
    span.spellcheck = false;
    span.textContent = value || '';
    span.dataset.field = field;
    if (!value) span.classList.add('muted');
    span.addEventListener('focus', () => { if (!span.textContent.trim()) span.textContent = ''; });
    span.addEventListener('blur', () => {
      const val = span.textContent.trim();
      job[field] = val;
      if (!val) span.textContent = '';
      save();
      updateStats();
    });
    span.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        span.blur();
        moveToNextCell(span, e.shiftKey);
      }
    });
    td.appendChild(span);
    return td;
  };

  tr.appendChild(editCell('company', job.company));
  tr.appendChild(editCell('role', job.role));

  const dateTd = document.createElement('td');
  dateTd.className = 'col-date';
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = job.date || '';
  dateInput.className = 'date-input';
  dateInput.tabIndex = 0;
  dateInput.addEventListener('change', () => {
    job.date = dateInput.value;
    save();
  });
  dateInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (!e.shiftKey) {
        e.preventDefault();
        moveToNextCell(dateInput, false);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const current = new Date(job.date || Date.now());
      current.setDate(current.getDate() + 1);
      job.date = current.toISOString().slice(0, 10);
      dateInput.value = job.date;
      save();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const current = new Date(job.date || Date.now());
      current.setDate(current.getDate() - 1);
      job.date = current.toISOString().slice(0, 10);
      dateInput.value = job.date;
      save();
    }
  });
  dateTd.appendChild(dateInput);
  tr.appendChild(dateTd);

  const statusTd = document.createElement('td');
  statusTd.className = 'col-status';
  const badgeWrap = document.createElement('div');
  badgeWrap.style.position = 'relative';
  badgeWrap.style.display = 'inline-block';

  const badge = document.createElement('span');
  badge.className = 'badge ' + STATUS_CLASS[job.status];
  badge.textContent = job.status;

  const sel = document.createElement('select');
  sel.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;`;
  sel.tabIndex = 0;
  STATUSES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === job.status) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    job.status = sel.value;
    badge.className = 'badge ' + STATUS_CLASS[job.status];
    badge.textContent = job.status;
    save();
    updateStats();
  });
  badgeWrap.appendChild(badge);
  badgeWrap.appendChild(sel);
  statusTd.appendChild(badgeWrap);
  tr.appendChild(statusTd);

  tr.appendChild(editCell('salary', job.salary, 'col-salary'));
  tr.appendChild(editCell('source', job.source, 'col-source'));
  tr.appendChild(editCell('email', job.email, 'col-email'));
  tr.appendChild(editCell('notes', job.notes));

  const delTd = document.createElement('td');
  delTd.className = 'col-del';
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.title = 'Remove';
  delBtn.textContent = '✕';
  delBtn.tabIndex = 0;
  delBtn.addEventListener('click', () => {
    jobs = jobs.filter(j => j.id !== job.id);
    save();
    render();
  });
  delTd.appendChild(delBtn);
  tr.appendChild(delTd);

  return tr;
}

function getEditableElements() {
  const cells = [];
  document.querySelectorAll('tbody td .editable').forEach(el => cells.push(el));
  document.querySelectorAll('tbody td select').forEach(el => cells.push(el));
  document.querySelectorAll('tbody td .delete-btn').forEach(el => cells.push(el));
  return cells;
}

function moveToNextCell(currentEl, reverse) {
  const cells = getEditableElements();
  const idx = cells.indexOf(currentEl);
  if (idx === -1) return;
  const nextIdx = reverse ? idx - 1 : idx + 1;
  if (nextIdx >= 0 && nextIdx < cells.length) {
    cells[nextIdx].focus();
  }
}

function render() {
  const tbody = document.getElementById('job-tbody');
  tbody.innerHTML = '';
  sortJobs();
  jobs.forEach((job, i) => tbody.appendChild(buildRow(job, i)));
  updateStats();
  updateSortIcons();
}

document.getElementById('add-btn').addEventListener('click', addJob);

function addJob() {
  const company = document.getElementById('input-company').value.trim();
  const role = document.getElementById('input-role').value.trim();
  const date = document.getElementById('input-date').value;
  const status = document.getElementById('input-status').value;
  const salary = document.getElementById('input-salary').value.trim();
  const source = document.getElementById('input-source').value;
  const email = document.getElementById('input-email').value.trim();
  if (!company && !role) return;
  const jobDate = date || new Date().toISOString().slice(0, 10);
  jobs.unshift({ id: uid(), company, role, date: jobDate, status, salary, source, email, notes: '' });
  document.getElementById('input-company').value = '';
  document.getElementById('input-role').value = '';
  document.getElementById('input-date').value = '';
  document.getElementById('input-salary').value = '';
  document.getElementById('input-email').value = '';
  document.getElementById('input-source').value = '';
  document.getElementById('input-status').value = 'Applied';
  save();
  render();
}

document.querySelectorAll('thead th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;
    if (field === sortField) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDir = field === 'date' ? 'desc' : 'asc';
    }
    render();
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && !e.target.matches('.editable, select, button')) {
    e.preventDefault();
    const cells = getEditableElements();
    if (cells.length > 0) {
      cells[0].focus();
    }
  }
});

render();
