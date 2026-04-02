"""
AI-powered EMG/ENG description generation.

Uses any OpenAI-compatible API (OpenAI, xAI/Grok, etc.) to generate
structured medical examination descriptions from raw study data.
"""

from __future__ import annotations

from openai import AsyncOpenAI

from backend.config import settings
from backend.norms import validate_needle_emg, validate_nerve_study

SYSTEM_PROMPT = """\
You are a clinical neurophysiology assistant helping physicians write \
EMG/ENG examination reports. You produce professional, structured \
descriptions in Polish medical language.

Rules:
- Use standard Polish medical terminology for EMG/ENG reports.
- Structure the report with clear sections: nerve conduction studies, \
needle EMG findings, and a summary/conclusion.
- Flag all abnormal findings and correlate them with the clinical indication.
- Be precise with values and units.
- End with a clinical interpretation suggesting possible diagnoses or \
confirming/ruling out the clinical indication.
- Use a professional, concise clinical tone — no filler text.
- Format the report with clear headings using markdown.
"""


def _build_study_summary(exam_data: dict) -> str:
    """Build a structured text summary of all study data for the LLM."""
    lines: list[str] = []

    lines.append(f"Patient: age {exam_data['patient_age']}, sex {exam_data['patient_sex']}")
    if exam_data.get("patient_height_cm"):
        lines.append(f"Height: {exam_data['patient_height_cm']} cm")
    lines.append(f"Clinical indication: {exam_data['clinical_indication']}")
    if exam_data.get("referring_physician"):
        lines.append(f"Referring physician: {exam_data['referring_physician']}")

    # Nerve conduction studies
    ncs = exam_data.get("nerve_studies", [])
    if ncs:
        lines.append("\n## Nerve Conduction Studies")
        for study in ncs:
            header = (
                f"{study['nerve'].replace('_', ' ').title()} nerve "
                f"({study['study_type']}, {study['side']})"
            )
            lines.append(f"\n### {header}")
            params = {
                "distal_latency_ms": study.get("distal_latency_ms"),
                "amplitude": study.get("amplitude"),
                "conduction_velocity_ms": study.get("conduction_velocity_ms"),
                "f_wave_latency_ms": study.get("f_wave_latency_ms"),
            }
            for k, v in params.items():
                if v is not None:
                    label = k.replace("_", " ").replace(" ms", "")
                    unit = "ms" if "latency" in k else ("m/s" if "velocity" in k else ("mV" if study["study_type"] == "motor" else "µV"))
                    lines.append(f"- {label}: {v} {unit}")

            flags = validate_nerve_study(study["nerve"], study["study_type"], params)
            if flags:
                lines.append(f"- **ABNORMAL**: {'; '.join(flags)}")
            else:
                lines.append("- Within normal limits")

    # Needle EMG
    emg = exam_data.get("needle_emg_studies", [])
    if emg:
        lines.append("\n## Needle EMG")
        for study in emg:
            muscle_name = study["muscle"].replace("_", " ").title()
            lines.append(f"\n### {muscle_name} ({study['side']})")
            lines.append(f"- Insertional activity: {study.get('insertional_activity', 'normal')}")
            lines.append(f"- Fibrillations: {study.get('fibrillations', '0')}")
            lines.append(f"- Positive sharp waves: {study.get('positive_sharp_waves', '0')}")
            lines.append(f"- Fasciculations: {'yes' if study.get('fasciculations') else 'no'}")
            lines.append(f"- MUP duration: {study.get('mup_duration', 'normal')}")
            lines.append(f"- MUP amplitude: {study.get('mup_amplitude', 'normal')}")
            lines.append(f"- Polyphasia: {study.get('mup_polyphasia', 'normal')}")
            lines.append(f"- Recruitment: {study.get('recruitment', 'normal')}")

            flags = validate_needle_emg(study)
            if flags:
                lines.append(f"- **ABNORMAL**: {'; '.join(flags)}")
            else:
                lines.append("- Within normal limits")

    return "\n".join(lines)


async def generate_description(exam_data: dict) -> str:
    """Generate an AI-powered EMG/ENG examination description."""
    client = AsyncOpenAI(
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
    )

    study_summary = _build_study_summary(exam_data)

    user_prompt = (
        "Based on the following EMG/ENG examination data, generate a complete "
        "examination description report in Polish. Include all measured values, "
        "flag abnormalities, and provide a clinical interpretation.\n\n"
        f"{study_summary}"
    )

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=2000,
    )

    return response.choices[0].message.content or ""
