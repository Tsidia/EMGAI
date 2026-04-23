// EMG/ENG AI: Frontend Application
const API = '';
let currentExamId = null;
let formOptions = { nerves: { motor: [], sensory: [] }, muscles: [] };

// Views

function showView(name) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${name}`).classList.remove('hidden');
    if (name === 'list') loadExamList();
    if (name === 'form') resetForm();
}

// Exam list

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
                <p>No examinations</p>
                <p class="text-sm mt-1">Click "New examination" to get started</p>
            </div>`;
        return;
    }

    container.innerHTML = exams.map(e => `
        <div onclick="openExam('${e.id}')" class="bg-white rounded-xl border border-gray-200 p-4 hover:border-medical-500 hover:shadow-sm transition cursor-pointer">
            <div class="flex items-center justify-between">
                <div>
                    <span class="font-medium text-gray-800">Patient: ${e.patient_age} y/o ${e.patient_sex === 'M' ? 'male' : 'female'}</span>
                    <p class="text-sm text-gray-500 mt-0.5">${e.clinical_indication}</p>
                </div>
                <div class="flex items-center gap-3">
                    ${statusBadge(e.report_status)}
                    <span class="text-xs text-gray-400">${new Date(e.created_at).toLocaleDateString('en-US')}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function statusBadge(status) {
    const labels = { draft: 'Draft', generated: 'Generated', approved: 'Approved' };
    const s = status || 'draft';
    return `<span class="status-badge status-${s}">${labels[s] || s}</span>`;
}

// Exam detail

async function openExam(id) {
    currentExamId = id;
    const res = await fetch(`${API}/api/examinations/${id}`);
    const exam = await res.json();

    showView('detail');
    renderDetail(exam);
}

function renderDetail(exam) {
    const status = exam.report?.status || 'draft';
    document.getElementById('detail-status').innerHTML = statusBadge(status);

    document.getElementById('detail-patient').innerHTML = `
        <h3 class="font-semibold text-gray-700 mb-3">Patient data</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span class="text-gray-500">Age:</span> <strong>${exam.patient_age}</strong></div>
            <div><span class="text-gray-500">Sex:</span> <strong>${exam.patient_sex === 'M' ? 'Male' : 'Female'}</strong></div>
            ${exam.patient_height_cm ? `<div><span class="text-gray-500">Height:</span> <strong>${exam.patient_height_cm} cm</strong></div>` : ''}
            ${exam.referring_physician ? `<div><span class="text-gray-500">Referring:</span> <strong>${exam.referring_physician}</strong></div>` : ''}
        </div>
        <div class="mt-3 text-sm"><span class="text-gray-500">Indication:</span> ${exam.clinical_indication}</div>
    `;

    let studiesHtml = '';

    if (exam.nerve_studies.length > 0) {
        studiesHtml += `<h3 class="font-semibold text-gray-700 mb-3">Nerve conduction studies</h3>`;
        studiesHtml += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>';
        studiesHtml += '<th class="text-left p-2">Nerve</th><th class="p-2">Side</th><th class="p-2">Type</th>';
        studiesHtml += '<th class="p-2">Distal lat. (ms)</th><th class="p-2">Amplitude</th><th class="p-2">CV (m/s)</th><th class="p-2">F-wave (ms)</th><th class="p-2 text-left">Assessment</th>';
        studiesHtml += '</tr></thead><tbody>';
        for (const s of exam.nerve_studies) {
            const hasFlags = s.flags && s.flags.length > 0;
            studiesHtml += `<tr class="${hasFlags ? 'bg-red-50' : ''}">`;
            studiesHtml += `<td class="p-2 font-medium">${formatName(s.nerve)}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.side}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.study_type}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.distal_latency_ms ?? '-'}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.amplitude ?? '-'}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.conduction_velocity_ms ?? '-'}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.f_wave_latency_ms ?? '-'}</td>`;
            studiesHtml += `<td class="p-2">${hasFlags ? s.flags.map(f => `<div class="flag-abnormal mb-1">${f}</div>`).join('') : '<div class="flag-normal">Normal</div>'}</td>`;
            studiesHtml += '</tr>';
        }
        studiesHtml += '</tbody></table></div>';
    }

    if (exam.needle_emg_studies.length > 0) {
        studiesHtml += `<h3 class="font-semibold text-gray-700 mb-3 mt-6">Needle EMG</h3>`;
        studiesHtml += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>';
        studiesHtml += '<th class="text-left p-2">Muscle</th><th class="p-2">Side</th><th class="p-2">Insert. act.</th>';
        studiesHtml += '<th class="p-2">Fibs</th><th class="p-2">PSW</th><th class="p-2">Fasc.</th>';
        studiesHtml += '<th class="p-2">MUP dur.</th><th class="p-2">MUP amp.</th><th class="p-2">Polyphasia</th><th class="p-2">Recruit.</th><th class="p-2 text-left">Assessment</th>';
        studiesHtml += '</tr></thead><tbody>';
        for (const s of exam.needle_emg_studies) {
            const hasFlags = s.flags && s.flags.length > 0;
            studiesHtml += `<tr class="${hasFlags ? 'bg-red-50' : ''}">`;
            studiesHtml += `<td class="p-2 font-medium">${formatName(s.muscle)}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.side}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.insertional_activity}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.fibrillations}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.positive_sharp_waves}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.fasciculations ? 'yes' : 'no'}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.mup_duration}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.mup_amplitude}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.mup_polyphasia}</td>`;
            studiesHtml += `<td class="p-2 text-center">${s.recruitment}</td>`;
            studiesHtml += `<td class="p-2">${hasFlags ? s.flags.map(f => `<div class="flag-abnormal mb-1">${f}</div>`).join('') : '<div class="flag-normal">Normal</div>'}</td>`;
            studiesHtml += '</tr>';
        }
        studiesHtml += '</tbody></table></div>';
    }

    document.getElementById('detail-studies').innerHTML = studiesHtml || '<p class="text-gray-400 text-sm">No study data</p>';

    renderReport(exam.report);
}

function renderReport(report) {
    const actionsEl = document.getElementById('report-actions');
    const contentEl = document.getElementById('report-content');
    const status = report?.status || 'draft';

    let actions = '';
    if (status === 'draft') {
        actions = `<button onclick="generateReport()" class="bg-medical-600 text-white px-4 py-2 rounded-lg hover:bg-medical-700 transition text-sm font-medium" id="btn-generate">Generate AI report</button>`;
    } else if (status === 'generated') {
        actions = `
            <button onclick="generateReport()" class="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium" id="btn-generate">Regenerate</button>
            <button onclick="toggleEdit()" class="border border-blue-300 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition text-sm font-medium" id="btn-edit">Edit</button>
            <button onclick="approveReport()" class="bg-medical-600 text-white px-4 py-2 rounded-lg hover:bg-medical-700 transition text-sm font-medium">Approve</button>
        `;
    } else if (status === 'approved') {
        actions = `<span class="text-sm text-green-600 font-medium">Approved${report.approved_by ? ` by ${report.approved_by}` : ''}</span>`;
    }
    actionsEl.innerHTML = actions;

    if (status === 'draft') {
        contentEl.innerHTML = '<p class="text-gray-400 text-center py-8">Click "Generate AI report" to produce the examination report</p>';
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
        fetch(`${API}/api/examinations/${currentExamId}`).then(r => r.json()).then(exam => {
            const rawText = exam.report.final_text || exam.report.ai_generated_text || '';
            contentEl.innerHTML = `
                <textarea class="report-editor" id="report-editor">${escapeHtml(rawText)}</textarea>
                <div class="flex justify-end mt-3">
                    <button onclick="saveReport()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">Save changes</button>
                </div>
            `;
            btnEdit.textContent = 'Cancel edit';
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
    btn.innerHTML = '<span class="spinner"></span> Generating...';
    btn.disabled = true;

    try {
        await fetch(`${API}/api/reports/${currentExamId}/generate`, { method: 'POST' });
        openExam(currentExamId);
    } catch (err) {
        alert('Generation error: ' + err.message);
    } finally {
        btn.innerHTML = orig;
        btn.disabled = false;
    }
}

async function approveReport() {
    const name = prompt('Approving physician name:');
    if (!name) return;
    await fetch(`${API}/api/reports/${currentExamId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: name }),
    });
    openExam(currentExamId);
}

// Form

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

    try {
        const res = await fetch(`${API}/api/examinations/options`);
        formOptions = await res.json();
    } catch (e) { /* use defaults */ }
}

function addNerveStudy() {
    document.getElementById('no-ncs').classList.add('hidden');
    const i = nerveCount++;
    const motorNerves = formOptions.nerves.motor.map(n => `<option value="${n}">${formatName(n)}</option>`).join('');

    const html = `
    <div class="border border-gray-200 rounded-lg p-4 relative" id="ncs-${i}">
        <button type="button" onclick="document.getElementById('ncs-${i}').remove()" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg">&times;</button>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
                <label class="block text-gray-500 mb-1">Type</label>
                <select name="ncs_type_${i}" onchange="updateNerveOptions(${i})" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="motor">Motor</option>
                    <option value="sensory">Sensory</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Nerve</label>
                <select name="ncs_nerve_${i}" id="ncs_nerve_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    ${motorNerves}
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Side</label>
                <select name="ncs_side_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="L">Left</option>
                    <option value="R">Right</option>
                </select>
            </div>
            <div></div>
            <div>
                <label class="block text-gray-500 mb-1">Distal latency (ms)</label>
                <input type="number" step="0.1" name="ncs_lat_${i}" class="w-full border rounded-lg px-2 py-1.5">
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Amplitude</label>
                <input type="number" step="0.1" name="ncs_amp_${i}" class="w-full border rounded-lg px-2 py-1.5">
            </div>
            <div>
                <label class="block text-gray-500 mb-1">CV (m/s)</label>
                <input type="number" step="0.1" name="ncs_cv_${i}" class="w-full border rounded-lg px-2 py-1.5">
            </div>
            <div>
                <label class="block text-gray-500 mb-1">F-wave (ms)</label>
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
                <label class="block text-gray-500 mb-1">Muscle</label>
                <select name="emg_muscle_${i}" class="w-full border rounded-lg px-2 py-1.5">${muscles}</select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Side</label>
                <select name="emg_side_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="L">Left</option>
                    <option value="R">Right</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Insertional activity</label>
                <select name="emg_insert_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Normal</option>
                    <option value="increased">Increased</option>
                    <option value="decreased">Decreased</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Fibrillations</label>
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
                <label class="block text-gray-500 mb-1">Fasciculations</label>
                <select name="emg_fasc_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="false">No</option><option value="true">Yes</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">MUP duration</label>
                <select name="emg_mup_dur_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Normal</option><option value="short">Short</option><option value="long">Long</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">MUP amplitude</label>
                <select name="emg_mup_amp_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Polyphasia</label>
                <select name="emg_poly_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Normal</option><option value="increased">Increased</option>
                </select>
            </div>
            <div>
                <label class="block text-gray-500 mb-1">Recruitment</label>
                <select name="emg_recruit_${i}" class="w-full border rounded-lg px-2 py-1.5">
                    <option value="normal">Normal</option><option value="reduced">Reduced</option><option value="early">Early</option><option value="discrete">Discrete</option>
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
        alert('Error: ' + (err.detail || JSON.stringify(err)));
    }
}

// Demo data: classic right carpal tunnel syndrome

function loadDemoData() {
    const form = document.getElementById('exam-form');
    form.querySelector('[name="patient_age"]').value = 52;
    form.querySelector('[name="patient_sex"]').value = 'F';
    form.querySelector('[name="patient_height_cm"]').value = 165;
    form.querySelector('[name="referring_physician"]').value = 'Dr. John Smith';
    form.querySelector('[name="clinical_indication"]').value = 'Suspected right carpal tunnel syndrome. Numbness of digits I-III of the right hand, worse at night, for approximately 6 months.';

    document.getElementById('nerve-studies').innerHTML = '';
    document.getElementById('needle-emg-studies').innerHTML = '';
    nerveCount = 0;
    emgCount = 0;

    setTimeout(() => {
        // Median motor R: abnormal
        addNerveStudy();
        setVal('ncs_type_0', 'motor');
        updateNerveOptions(0);
        setVal('ncs_nerve_0', 'median');
        setVal('ncs_side_0', 'R');
        setInput('ncs_lat_0', '5.1');   // prolonged (norm <=4.2)
        setInput('ncs_amp_0', '3.2');   // low (norm >=4.0)
        setInput('ncs_cv_0', '48.0');   // borderline low
        setInput('ncs_fwave_0', '30.0');

        // Median sensory R: abnormal
        addNerveStudy();
        setVal('ncs_type_1', 'sensory');
        updateNerveOptions(1);
        setVal('ncs_nerve_1', 'median');
        setVal('ncs_side_1', 'R');
        setInput('ncs_lat_1', '4.2');   // prolonged
        setInput('ncs_amp_1', '12.0');  // low
        setInput('ncs_cv_1', '42.0');   // slow

        // Ulnar motor R: normal (comparison)
        addNerveStudy();
        setVal('ncs_type_2', 'motor');
        updateNerveOptions(2);
        setVal('ncs_nerve_2', 'ulnar');
        setVal('ncs_side_2', 'R');
        setInput('ncs_lat_2', '2.8');
        setInput('ncs_amp_2', '9.5');
        setInput('ncs_cv_2', '58.0');
        setInput('ncs_fwave_2', '28.0');

        // Ulnar sensory R: normal
        addNerveStudy();
        setVal('ncs_type_3', 'sensory');
        updateNerveOptions(3);
        setVal('ncs_nerve_3', 'ulnar');
        setVal('ncs_side_3', 'R');
        setInput('ncs_lat_3', '2.5');
        setInput('ncs_amp_3', '22.0');
        setInput('ncs_cv_3', '55.0');

        // Needle EMG: APB (abnormal)
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

        // Needle EMG: FDI (normal comparison)
        addNeedleEMG();
        setVal('emg_muscle_1', 'first_dorsal_interosseous');
        setVal('emg_side_1', 'R');
    }, 100);
}

function setVal(name, val) { const el = document.querySelector(`[name="${name}"]`); if (el) el.value = val; }
function setInput(name, val) { const el = document.querySelector(`[name="${name}"]`); if (el) el.value = val; }

// Utilities

function formatName(s) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function markdownToHtml(md) {
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

// Init
showView('list');
