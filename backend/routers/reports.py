import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.ai_service import generate_description
from backend.database import get_db
from backend.models import Examination, Report, ReportStatus
from backend.schemas import ReportApprove, ReportOut, ReportUpdate

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/{exam_id}/generate", response_model=ReportOut)
async def generate_report(exam_id: str, db: Session = Depends(get_db)):
    """Trigger AI description generation for an examination."""
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    report = exam.report
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.status == ReportStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Report already approved")

    # Build exam data dict for the AI service
    exam_data = {
        "patient_age": exam.patient_age,
        "patient_sex": exam.patient_sex,
        "patient_height_cm": exam.patient_height_cm,
        "clinical_indication": exam.clinical_indication,
        "referring_physician": exam.referring_physician,
        "nerve_studies": [
            {
                "nerve": s.nerve,
                "side": s.side,
                "study_type": s.study_type,
                "distal_latency_ms": s.distal_latency_ms,
                "amplitude": s.amplitude,
                "conduction_velocity_ms": s.conduction_velocity_ms,
                "f_wave_latency_ms": s.f_wave_latency_ms,
            }
            for s in exam.nerve_studies
        ],
        "needle_emg_studies": [
            {
                "muscle": s.muscle,
                "side": s.side,
                "insertional_activity": s.insertional_activity,
                "fibrillations": s.fibrillations,
                "positive_sharp_waves": s.positive_sharp_waves,
                "fasciculations": s.fasciculations,
                "mup_duration": s.mup_duration,
                "mup_amplitude": s.mup_amplitude,
                "mup_polyphasia": s.mup_polyphasia,
                "recruitment": s.recruitment,
            }
            for s in exam.needle_emg_studies
        ],
    }

    ai_text = await generate_description(exam_data)

    report.ai_generated_text = ai_text
    report.final_text = ai_text
    report.status = ReportStatus.GENERATED
    db.commit()
    db.refresh(report)

    return ReportOut.model_validate(report)


@router.put("/{exam_id}", response_model=ReportOut)
def update_report(exam_id: str, data: ReportUpdate, db: Session = Depends(get_db)):
    """Update the report text (physician editing)."""
    report = (
        db.query(Report).filter(Report.examination_id == exam_id).first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status == ReportStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cannot edit approved report")

    report.final_text = data.final_text
    db.commit()
    db.refresh(report)
    return ReportOut.model_validate(report)


@router.post("/{exam_id}/approve", response_model=ReportOut)
def approve_report(
    exam_id: str, data: ReportApprove, db: Session = Depends(get_db)
):
    """Approve the report (locks it for further editing)."""
    report = (
        db.query(Report).filter(Report.examination_id == exam_id).first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status == ReportStatus.DRAFT:
        raise HTTPException(
            status_code=400, detail="Generate description before approving"
        )
    if report.status == ReportStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Report already approved")

    report.status = ReportStatus.APPROVED
    report.approved_by = data.approved_by
    report.approved_at = datetime.datetime.now(datetime.UTC)
    db.commit()
    db.refresh(report)
    return ReportOut.model_validate(report)
