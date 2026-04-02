from __future__ import annotations

import datetime

from pydantic import BaseModel, Field


# ── Nerve Conduction Study ──────────────────────────────────────────

class NerveStudyIn(BaseModel):
    nerve: str = Field(..., examples=["median"])
    side: str = Field(..., pattern="^[LR]$")
    study_type: str = Field(..., pattern="^(motor|sensory)$")
    distal_latency_ms: float | None = None
    amplitude: float | None = None
    conduction_velocity_ms: float | None = None
    f_wave_latency_ms: float | None = None


class NerveStudyOut(NerveStudyIn):
    id: str
    flags: list[str] = []

    model_config = {"from_attributes": True}


# ── Needle EMG ──────────────────────────────────────────────────────

class NeedleEMGIn(BaseModel):
    muscle: str = Field(..., examples=["first_dorsal_interosseous"])
    side: str = Field(..., pattern="^[LR]$")
    insertional_activity: str = "normal"
    fibrillations: str = "0"
    positive_sharp_waves: str = "0"
    fasciculations: bool = False
    mup_duration: str = "normal"
    mup_amplitude: str = "normal"
    mup_polyphasia: str = "normal"
    recruitment: str = "normal"


class NeedleEMGOut(NeedleEMGIn):
    id: str
    flags: list[str] = []

    model_config = {"from_attributes": True}


# ── Examination ─────────────────────────────────────────────────────

class ExaminationCreate(BaseModel):
    patient_age: int = Field(..., ge=0, le=120)
    patient_sex: str = Field(..., pattern="^[MF]$")
    patient_height_cm: float | None = None
    clinical_indication: str
    referring_physician: str = ""
    nerve_studies: list[NerveStudyIn] = []
    needle_emg_studies: list[NeedleEMGIn] = []


class ReportOut(BaseModel):
    id: str
    status: str
    ai_generated_text: str
    final_text: str
    approved_by: str | None
    approved_at: datetime.datetime | None

    model_config = {"from_attributes": True}


class ExaminationOut(BaseModel):
    id: str
    patient_age: int
    patient_sex: str
    patient_height_cm: float | None
    clinical_indication: str
    referring_physician: str
    created_at: datetime.datetime
    nerve_studies: list[NerveStudyOut] = []
    needle_emg_studies: list[NeedleEMGOut] = []
    report: ReportOut | None = None

    model_config = {"from_attributes": True}


class ExaminationSummary(BaseModel):
    id: str
    patient_age: int
    patient_sex: str
    clinical_indication: str
    created_at: datetime.datetime
    report_status: str | None = None

    model_config = {"from_attributes": True}


# ── Report actions ──────────────────────────────────────────────────

class ReportUpdate(BaseModel):
    final_text: str


class ReportApprove(BaseModel):
    approved_by: str
