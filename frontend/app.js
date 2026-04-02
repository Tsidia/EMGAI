// EMG/ENG AI — Frontend Application
const API = '';
let currentExamId = null;
let formOptions = { nerves: { motor: [], sensory: [] }, muscles: [] };

// ── Views ──────────────────────────────────────────────────────────

function showView(name) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${name}`).classList.remove('hidden');
    if (name === 'list') loadExamList();
    if (name === 'form') resetForm();
}

// ── Exam List ──────────────────────────────────────────────────────

async function loadExamList() {
    const res = await fetch(`${API}/api/examinations/`);
    const exams = await res.json();
    const container = document.getElementById('exam-list');

    if (exams.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>Brak badań</p>
                <p class="text-sm mt-1">Kliknij „Nowe badanie" aby rozpocząć</p>
            </div>`;
        return;
    }

    container.innerHTML = exams.map(e => `
        <div onclick="openExam('${e.id}')" class="bg-white rounded-xl border border-gray-200 p-4 hover:border-medical-500 hover:shadow-sm transition cursor-pointer">
            <div class="flex items-center justify-between">
                <div>
                    <span class="font-medium text-gray-800">Pacjent: ${e.patient_age} lat, ${e.patient_sex === 'M' ? 'mężczyzna' : 'kobieta'}</span>
                    <p class="text-sm text-gray-500 mt-0.5">${e.clinical_indication}</p>
                </div>
                <div class="flex items-center gap-3">
                    ${statusBadge(e.report_status)}
                    <span class="text-xs text-gray-400">${new Date(e.created_at).toLocaleDateString('pl-PL')}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function statusBadge(status) {
    const labels = { draft: 'Szkic', generated: 'Wygenerowany', approved: 'Zatwierdzony' };
    const s = status || 'draft';
    return `<span class="status-badge status-${s}">${labels[s] || s}</span>`;
}

// ── Exam Detail ────────────────────────────────────────────────────

async function openExam(id) {
    currentExamId = id;
    const res = await fetch(`${API}/api/examinations/${id}`);
    const exam = await res.json();

    showView('detail');
    renderDetail(exam);
}

function renderDetail(exam) {
    // Status badge
    const status = exam.report?.status || 'draft';
    document.getElementById('detail-status').innerHTML = statusBadge(status);

    // Patient info
    document.getElementById('detail-patient').innerHTML = `
        <h3 class="font-semibold text-gray-700 mb-3">Dane pacjenta</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span class="text-gray-500">Wiek:</span> <strong>${exam.patient_age}</strong></div>
            <div><span class="text-gray-500">Płeć:</span> <strong>${exam.patient_sex === 'M' ? 'Mężczyzna' : 'Kobieta'}</strong></div>
            ${exam.patient_height_cm ? `<div><span class="text-gray-500">Wzrost:</span> <strong>${exam.patient_height_cm} cm</strong></div>` : ''}
            ${exam.referring_physician ? `<div><span class="text-gray-500">Lekarz kier.:</span> <strong>${exam.referring_physician}</strong></div>` : ''}
        </div>
        <div class="mt-3 text-sm"><span class="text-gray-500">Wskazanie:</span> ${exam.clinical_indication}</div>
    `;

    // Studies
    let studiesHtml = '';

    if (exam.nerve_studies.length > 0) {
        studiesHtml += `<h3 class="font-semibold text-gray-700 mb-3">Badanie przewodzenia nerwowego</h3>`;
        studiesHtml += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>';
        studiesHtml += '<th class="text-left p-2">Nerw</th><th class="p-2">Strona</th><th class="p-2">Typ</th>';
        studiesHtml += '<th class="p-2">Lat. dyst. (ms)</th><th class="p-2">Amplituda</th><th class="p-2">CV (m/s)</th><th class="p-2">Fala F (ms)</th><th class="p-2 text-left">Ocena</th>';
        studiesHtml += '</tr></thead><tbody>';
        for (const s of exam.nerve_studies) {
            const hasFlags = s.flags && s.flags.length > 0;
            studiesHtml += `<tr class="${hasFlags ? 'bg-red-50' : ''}">`;
            studiesHtml += `<td class="p-2 font-medium">${formatName(s.nerve)}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.side}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.study_type}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.distal_latency_ms ?? '—'}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.amplitude ?? '—'}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.conduction_velocity_ms ?? '—'}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.f_wave_latency_ms ?? '—'}</td>`;
            studiesHtml += `<td class="p-2">${hasFlags ? s.flags.map(f => `<div class="flag-abnormal mb-1">${f}</div>`).join('') : '<div class="flag-normal">Norma</div>'}</td>`;
            studiesHtml += '</tr>';
        }
        studiesHtml += '</tbody></table></div>';
    }

    if (exam.needle_emg_studies.length > 0) {
        studiesHtml += `<h3 class="font-semibold text-gray-700 mb-3 mt-6">EMG igłowe</h3>`;
        studiesHtml += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>';
        studiesHtml += '<th class="text-left p-2">Mięsień</th><th class="p-2">Strona</th><th class="p-2">Akt. wkłucia</th>';
        studiesHtml += '<th class="p-2">Fibr.</th><th class="p-2">PSW</th><th class="p-2">Fasc.</th>';
        studiesHtml += '<th class="p-2">MUP czas</th><th class="p-2">MUP ampl.</th><th class="p-2">Polifazja</th><th class="p-2">Rekrut.</th><th class="p-2 text-left">Ocena</th>';
        studiesHtml += '</tr></thead><tbody>';
        for (const s of exam.needle_emg_studies) {
            const hasFlags = s.flags && s.flags.length > 0;
            studiesHtml += `<tr class="${hasFlags ? 'bg-red-50' : ''}">`;
            studiesHtml += `<td class="p-2 font-medium">${formatName(s.muscle)}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.side}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.insertional_activity}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.fibrillations}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.positive_sharp_waves}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.fasciculations ? 'tak' : 'nie'}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.mup_duration}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.mup_amplitude}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.mup_polyphasia}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.recruitment}</td>`;
            studiesHtml += `<td class="p-2">${hasFlags ? s.flags.map(f => `<div class="flag-abnormal mb-1">${f}</div>`).join('') : '<div class="flag-normal">Norma</div>'}</td>`;
            studiesHtml += '</tr>';
        }
        studiesHtml += '</tbody></table></div>';
    }

    document.getElementById('detail-studies').innerHTML = studiesHtml || '<p class="text-gray-400 text-sm">Brak danych badań</p>';

    // Report section
    renderReport(exam.report);
}

function renderReport(report) {
    const actionsEl = document.getElementById('report-actions');
    const contentEl = document.getElementById('report-content');
    const status = report?.status || 'draft';

    // Actions
    let actions = '';
    if (status === 'draft') {
        actions = `<button onclick="generateReport()" class="bg-medical-600 text-white px-4 py-2 rounded-lg hover:bg-medical-700 transition text-sm font-medium" id="btn-generate">Generuj opis AI</button>`;
    } else if (status === 'generated') {
        actions = `
            <button onclick="generateReport()" class="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium" id="btn-generate">Regeneruj</button>
            <button onclick="toggleEdit()" class="border border-blue-300 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition text-sm font-medium" id="btn-edit">Edytuj</button>
            <button onclick="approveReport()" class="bg-medical-600 text-white px-4 py-2 rounded-lg hover:bg-medical-700 transition text-sm font-medium">Zatwierdź</button>
        `;
    } else if (status === 'approved') {
        actions = `<span class="text-sm text-green-600 font-medium">Zatwierdzony${report.approved_by ? ` przez ${report.approved_by}` : ''}</span>`;
    }
    actionsEl.innerHTML = actions;

    // Content
    if (status === 'draft') {
        contentEl.innerHTML = '<p class="text-gray-400 text-center py-8">Kliknij „Generuj opis AI" aby wygenerować opis badania</p>';
    } else {
        const text = report.final_text || report.ai_generated_text || '';
        contentEl.innerHTML = `<div class="report-text" id="report-display">${markdownToHtml(text)}</div>`;
    }
}

let isEditing = false;

function toggleEdit() {
    const contentEl = document.getElementById('report-content');
    const btnEdit = document.getElementById('btn-edit');

    if (!isEditing) {
        const displayEl = document.getElementById('report-display');
        // Get raw text from the current exam data (we'll fetch it)
        fetch(`${API}/api/examinations/${currentExamId}`).then(r => r.json()).then(exam => {
            const rawText = exam.report.final_text || exam.report.ai_generated_text || '';
            contentEl.innerHTML = `
                <textarea class="report-editor" id="report-editor">${escapeHtml(rawText)}</textarea>
                <div class="flex justify-end mt-3">
                    <button onclick="saveReport()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">Zapisz zmiany</button>
                </div>
            `;
            btnEdit.textContent = 'Anuluj edycję';
            isEditing = true;
        });
    } else {
        openExam(currentExamId);
        isEditing = false;
    }
}

async function saveReport() {
    const text = document.getElementById('report-editor').value;
    await fetch(`${API}/api/reports/${currentExamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_text: text }),
    });
    isEditing = false;
    openExam(currentExamId);
}

async function generateReport() {
    const btn = document.getElementById('btn-generate');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Generowanie...';
    btn.disabled = true;

    try {
        await fetch(`${API}/api/reports/${currentExamId}/generate`, { method: 'POST' });
        openExam(currentExamId);
    } catch (err) {
        alert('Błąd generowania: ' + err.message);
    } finally {
        btn.innerHTML = orig;
        btn.disabled = false;
    }
}

async function approveReport() {
    const name = prompt('Imię i nazwisko lekarza zatwierdzającego:');
    if (!name) return;
    await fetch(`${API}/api/reports/${currentExamId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: name }),
    });
    openExam(currentExamId);
}

// ── Form ───────────────────────────────────────────────────────────

let nerveCount = 0;
let emgCount = 0;

async function resetForm() {
    document.getElementById('exam-form').reset();
    document.getElementById('nerve-studies').innerHTML = '';
    document.getElementById('needle-emg-studies').innerHTML = '';
    document.getElementById('no-ncs').classList.remove('hidden');
    document.getElementById('no-emg').classList.remove('hidden');
    nerveCount = 0;
    emgCount = 0;

    // Load options
    try {
        const res = await fetch(`${API}/api/examinations/options`);
        formOptions = await res.json();
    } catch (e) { /* use defaults */ }
}

function addNerveStudy() {
    document.getElementById('no-ncs').classList.add('hidden');
    const i = nerveCount++;
    const motorNerves = formOptions.nerves.motor.map(n => `<option value="${n}">${formatName(n)}</option>`).join('');
    const sensoryNerves = formOptions.nerves.sensory.map(n => `<option value="${n}">${formatName(n)}</option>`).join('');

    const html = `
    <div class="border border-gray-200 rounded-lg p-4 relative" id="ncs-${i}">
        <button type="button" onclick="document.getElementById('ncs-${i}').remove()" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg">&times;</button>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
                <label class="block text-gray-500 mb-1">Typ</label>
                <select name="ncs_type_${i}" onchange="updateNerveOptions(${i})" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="motor">Motoryczny</option>
                    <option value="sensory">Sensoryczny</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Nerw</label>
                <select name="ncs_nerve_${i}" id="ncs_nerve_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    ${motorNerves}
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Strona</label>
                <select name="ncs_side_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="L">Lewa</option>
                    <option value="R">Prawa</option>
                </select>
            </div>
            <div></div>
            <div>
                <label class="block text-gray-500 mb-1">Latencja dyst. (ms)</label>
                <input type="number" step="0.1" name="ncs_lat_${i}" class="w-full border rounded-lg px-2 py-1.5">
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Amplituda</label>
                <input type="number" step="0.1" name="ncs_amp_${i}" class="w-full border rounded-lg px-2 py-1.5">
            </div>
            <div>
                <label class="block text-gray-500 mb-1">CV (m/s)</label>
                <input type="number" step="0.1" name="ncs_cv_${i}" class="w-full border rounded-lg px-2 py-1.5">
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Fala F (ms)</label>
                <input type="number" step="0.1" name="ncs_fwave_${i}" class="w-full border rounded-lg px-2 py-1.5">
            </div>
        </div>
    </div>`;
    document.getElementById('nerve-studies').insertAdjacentHTML('beforeend', html);
}

function updateNerveOptions(i) {
    const type = document.querySelector(`[name="ncs_type_${i}"]`).value;
    const nerves = formOptions.nerves[type] || [];
    const sel = document.getElementById(`ncs_nerve_${i}`);
    sel.innerHTML = nerves.map(n => `<option value="${n}">${formatName(n)}</option>`).join('');
}

function addNeedleEMG() {
    document.getElementById('no-emg').classList.add('hidden');
    const i = emgCount++;
    const muscles = formOptions.muscles.map(m => `<option value="${m}">${formatName(m)}</option>`).join('');

    const html = `
    <div class="border border-gray-200 rounded-lg p-4 relative" id="emg-${i}">
        <button type="button" onclick="document.getElementById('emg-${i}').remove()" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg">&times;</button>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
                <label class="block text-gray-500 mb-1">Mięsień</label>
                <select name="emg_muscle_${i}" class="w-full border rounded-lg px-2 py-1.5">${muscles}</select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Strona</label>
                <select name="emg_side_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="L">Lewa</option>
                    <option value="R">Prawa</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Akt. wkłucia</label>
                <select name="emg_insert_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Prawidłowa</option>
                    <option value="increased">Zwiększona</option>
                    <option value="decreased">Zmniejszona</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Fibrylacje</label>
                <select name="emg_fib_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="0">0</option><option value="1+">1+</option><option value="2+">2+</option><option value="3+">3+</option><option value="4+">4+</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">PSW</label>
                <select name="emg_psw_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="0">0</option><option value="1+">1+</option><option value="2+">2+</option><option value="3+">3+</option><option value="4+">4+</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Fascykulacje</label>
                <select name="emg_fasc_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="false">Nie</option><option value="true">Tak</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">MUP czas trwania</label>
                <select name="emg_mup_dur_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Prawidłowy</option><option value="short">Skrócony</option><option value="long">Wydłużony</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">MUP amplituda</label>
                <select name="emg_mup_amp_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Prawidłowa</option><option value="low">Niska</option><option value="high">Wysoka</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Polifazja</label>
                <select name="emg_poly_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Prawidłowa</option><option value="increased">Zwiększona</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Rekrutacja</label>
                <select name="emg_recruit_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Prawidłowa</option><option value="reduced">Zmniejszona</option><option value="early">Wczesna</option><option value="discrete">Dyskretna</option>
                </select>
            </div>
        </div>
    </div>`;
    document.getElementById('needle-emg-studies').insertAdjacentHTML('beforeend', html);
}

async function submitExam(e) {
    e.preventDefault();
    const fd = new FormData(e.target);

    const body = {
        patient_age: parseInt(fd.get('patient_age')),
        patient_sex: fd.get('patient_sex'),
        patient_height_cm: fd.get('patient_height_cm') ? parseFloat(fd.get('patient_height_cm')) : null,
        clinical_indication: fd.get('clinical_indication'),
        referring_physician: fd.get('referring_physician') || '',
        nerve_studies: [],
        needle_emg_studies: [],
    };

    // Collect NCS
    for (let i = 0; i < nerveCount; i++) {
        if (!document.getElementById(`ncs-${i}`)) continue;
        body.nerve_studies.push({
            nerve: fd.get(`ncs_nerve_${i}`),
            side: fd.get(`ncs_side_${i}`),
            study_type: fd.get(`ncs_type_${i}`),
            distal_latency_ms: fd.get(`ncs_lat_${i}`) ? parseFloat(fd.get(`ncs_lat_${i}`)) : null,
            amplitude: fd.get(`ncs_amp_${i}`) ? parseFloat(fd.get(`ncs_amp_${i}`)) : null,
            conduction_velocity_ms: fd.get(`ncs_cv_${i}`) ? parseFloat(fd.get(`ncs_cv_${i}`)) : null,
            f_wave_latency_ms: fd.get(`ncs_fwave_${i}`) ? parseFloat(fd.get(`ncs_fwave_${i}`)) : null,
        });
    }

    // Collect EMG
    for (let i = 0; i < emgCount; i++) {
        if (!document.getElementById(`emg-${i}`)) continue;
        body.needle_emg_studies.push({
            muscle: fd.get(`emg_muscle_${i}`),
            side: fd.get(`emg_side_${i}`),
            insertional_activity: fd.get(`emg_insert_${i}`),
            fibrillations: fd.get(`emg_fib_${i}`),
            positive_sharp_waves: fd.get(`emg_psw_${i}`),
            fasciculations: fd.get(`emg_fasc_${i}`) === 'true',
            mup_duration: fd.get(`emg_mup_dur_${i}`),
            mup_amplitude: fd.get(`emg_mup_amp_${i}`),
            mup_polyphasia: fd.get(`emg_poly_${i}`),
            recruitment: fd.get(`emg_recruit_${i}`),
        });
    }

    const res = await fetch(`${API}/api/examinations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (res.ok) {
        const exam = await res.json();
        openExam(exam.id);
    } else {
        const err = await res.json();
        alert('Błąd: ' + (err.detail || JSON.stringify(err)));
    }
}

// ── Demo Data ──────────────────────────────────────────────────────

function loadDemoData() {
    // Classic carpal tunnel syndrome case
    const form = document.getElementById('exam-form');
    form.querySelector('[name="patient_age"]').value = 52;
    form.querySelector('[name="patient_sex"]').value = 'F';
    form.querySelector('[name="patient_height_cm"]').value = 165;
    form.querySelector('[name="referring_physician"]').value = 'Dr Jan Kowalski';
    form.querySelector('[name="clinical_indication"]').value = 'Podejrzenie zespołu cieśni nadgarstka prawego. Drętwienie palców I-III ręki prawej, nasilające się w nocy, od ok. 6 miesięcy.';

    // Reset existing studies
    document.getElementById('nerve-studies').innerHTML = '';
    document.getElementById('needle-emg-studies').innerHTML = '';
    nerveCount = 0;
    emgCount = 0;

    // Add nerve studies with a delay to let DOM settle
    setTimeout(() => {
        // Median motor R — abnormal
        addNerveStudy();
        setVal('ncs_type_0', 'motor');
        updateNerveOptions(0);
        setVal('ncs_nerve_0', 'median');
        setVal('ncs_side_0', 'R');
        setInput('ncs_lat_0', '5.1');   // prolonged (norm ≤4.2)
        setInput('ncs_amp_0', '3.2');   // low (norm ≥4.0)
        setInput('ncs_cv_0', '48.0');   // borderline low
        setInput('ncs_fwave_0', '30.0');

        // Median sensory R — abnormal
        addNerveStudy();
        setVal('ncs_type_1', 'sensory');
        updateNerveOptions(1);
        setVal('ncs_nerve_1', 'median');
        setVal('ncs_side_1', 'R');
        setInput('ncs_lat_1', '4.2');   // prolonged
        setInput('ncs_amp_1', '12.0');  // low
        setInput('ncs_cv_1', '42.0');   // slow

        // Ulnar motor R — normal (comparison)
        addNerveStudy();
        setVal('ncs_type_2', 'motor');
        updateNerveOptions(2);
        setVal('ncs_nerve_2', 'ulnar');
        setVal('ncs_side_2', 'R');
        setInput('ncs_lat_2', '2.8');
        setInput('ncs_amp_2', '9.5');
        setInput('ncs_cv_2', '58.0');
        setInput('ncs_fwave_2', '28.0');

        // Ulnar sensory R — normal
        addNerveStudy();
        setVal('ncs_type_3', 'sensory');
        updateNerveOptions(3);
        setVal('ncs_nerve_3', 'ulnar');
        setVal('ncs_side_3', 'R');
        setInput('ncs_lat_3', '2.5');
        setInput('ncs_amp_3', '22.0');
        setInput('ncs_cv_3', '55.0');

        // Needle EMG — APB (abnormal)
        addNeedleEMG();
        setVal('emg_muscle_0', 'abductor_pollicis_brevis');
        setVal('emg_side_0', 'R');
        setVal('emg_insert_0', 'normal');
        setVal('emg_fib_0', '1+');
        setVal('emg_psw_0', '1+');
        setVal('emg_mup_dur_0', 'long');
        setVal('emg_mup_amp_0', 'high');
        setVal('emg_poly_0', 'increased');
        setVal('emg_recruit_0', 'reduced');

        // Needle EMG — FDI (normal comparison)
        addNeedleEMG();
        setVal('emg_muscle_1', 'first_dorsal_interosseous');
        setVal('emg_side_1', 'R');
    }, 100);
}

function setVal(name, val) { const el = document.querySelector(`[name="${name}"]`); if (el) el.value = val; }
function setInput(name, val) { const el = document.querySelector(`[name="${name}"]`); if (el) el.value = val; }

// ── Utilities ──────────────────────────────────────────────────────

function formatName(s) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function markdownToHtml(md) {
    // Simple markdown → HTML for report display
    return md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

// ── Init ───────────────────────────────────────────────────────────
showView('list');
