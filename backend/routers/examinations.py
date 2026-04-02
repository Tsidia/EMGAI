from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Examination, NeedleEMG, NerveStudy, Report, ReportStatus
from backend.norms import (
    AVAILABLE_MUSCLES,
    AVAILABLE_NERVES,
    validate_needle_emg,
    validate_nerve_study,
)
from backend.schemas import (
    ExaminationCreate,
    ExaminationOut,
    ExaminationSummary,
    NeedleEMGOut,
    NerveStudyOut,
)

router = APIRouter(prefix="/api/examinations", tags=["examinations"])


def _enrich_nerve_study(study: NerveStudy) -> NerveStudyOut:
    flags = validate_nerve_study(
        study.nerve,
        study.study_type,
        {
            "distal_latency_ms": study.distal_latency_ms,
            "amplitude": study.amplitude,
            "conduction_velocity_ms": study.conduction_velocity_ms,
            "f_wave_latency_ms": study.f_wave_latency_ms,
        },
    )
    out = NerveStudyOut.model_validate(study)
    out.flags = flags
    return out


def _enrich_needle_emg(study: NeedleEMG) -> NeedleEMGOut:
    flags = validate_needle_emg(
        {
            "insertional_activity": study.insertional_activity,
            "fibrillations": study.fibrillations,
            "positive_sharp_waves": study.positive_sharp_waves,
            "fasciculations": study.fasciculations,
            "mup_duration": study.mup_duration,
            "mup_amplitude": study.mup_amplitude,
            "mup_polyphasia": study.mup_polyphasia,
            "recruitment": study.recruitment,
        }
    )
    out = NeedleEMGOut.model_validate(study)
    out.flags = flags
    return out


@router.get("/options")
def get_options():
    """Return available nerves and muscles for the UI form."""
    return {
        "nerves": AVAILABLE_NERVES,
        "muscles": AVAILABLE_MUSCLES,
    }


@router.get("/", response_model=list[ExaminationSummary])
def list_examinations(db: Session = Depends(get_db)):
    exams = db.query(Examination).order_by(Examination.created_at.desc()).all()
    results = []
    for exam in exams:
        status = exam.report.status.value if exam.report else None
        results.append(
            ExaminationSummary(
                id=exam.id,
                patient_age=exam.patient_age,
                patient_sex=exam.patient_sex,
                clinical_indication=exam.clinical_indication,
                created_at=exam.created_at,
                report_status=status,
            )
        )
    return results


@router.post("/", response_model=ExaminationOut, status_code=201)
def create_examination(data: ExaminationCreate, db: Session = Depends(get_db)):
    exam = Examination(
        patient_age=data.patient_age,
        patient_sex=data.patient_sex,
        patient_height_cm=data.patient_height_cm,
        clinical_indication=data.clinical_indication,
        referring_physician=data.referring_physician,
    )
    db.add(exam)
    db.flush()  # ensure exam.id is available

    for ns in data.nerve_studies:
        db.add(NerveStudy(examination_id=exam.id, **ns.model_dump()))
    for ne in data.needle_emg_studies:
        db.add(NeedleEMG(examination_id=exam.id, **ne.model_dump()))

    # Create a draft report
    db.add(Report(examination_id=exam.id, status=ReportStatus.DRAFT))

    db.commit()
    db.refresh(exam)
    return _build_exam_response(exam)


@router.get("/{exam_id}", response_model=ExaminationOut)
def get_examination(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    return _build_exam_response(exam)


@router.delete("/{exam_id}", status_code=204)
def delete_examination(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    db.delete(exam)
    db.commit()


def _build_exam_response(exam: Examination) -> ExaminationOut:
    out = ExaminationOut.model_validate(exam)
    out.nerve_studies = [_enrich_nerve_study(s) for s in exam.nerve_studies]
    out.needle_emg_studies = [_enrich_needle_emg(s) for s in exam.needle_emg_studies]
    return out
