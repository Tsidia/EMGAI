import datetime
import enum
import uuid

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class ReportStatus(str, enum.Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    APPROVED = "approved"


class Examination(Base):
    __tablename__ = "examinations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_age: Mapped[int]
    patient_sex: Mapped[str] = mapped_column(String(1))  # M / F
    patient_height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    clinical_indication: Mapped[str] = mapped_column(Text)
    referring_physician: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    nerve_studies: Mapped[list["NerveStudy"]] = relationship(
        back_populates="examination", cascade="all, delete-orphan"
    )
    needle_emg_studies: Mapped[list["NeedleEMG"]] = relationship(
        back_populates="examination", cascade="all, delete-orphan"
    )
    report: Mapped["Report | None"] = relationship(
        back_populates="examination", cascade="all, delete-orphan", uselist=False
    )


class NerveStudy(Base):
    """Nerve Conduction Study (NCS) result for a single nerve."""

    __tablename__ = "nerve_studies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    examination_id: Mapped[str] = mapped_column(ForeignKey("examinations.id"))
    nerve: Mapped[str] = mapped_column(String(50))  # e.g. "median", "ulnar"
    side: Mapped[str] = mapped_column(String(1))  # L / R
    study_type: Mapped[str] = mapped_column(String(10))  # motor / sensory

    distal_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    amplitude: Mapped[float | None] = mapped_column(Float, nullable=True)  # mV or µV
    conduction_velocity_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    f_wave_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)

    examination: Mapped["Examination"] = relationship(back_populates="nerve_studies")


class NeedleEMG(Base):
    """Needle EMG result for a single muscle."""

    __tablename__ = "needle_emg_studies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    examination_id: Mapped[str] = mapped_column(ForeignKey("examinations.id"))
    muscle: Mapped[str] = mapped_column(String(80))
    side: Mapped[str] = mapped_column(String(1))

    insertional_activity: Mapped[str] = mapped_column(
        String(20), default="normal"
    )  # normal / increased / decreased
    fibrillations: Mapped[str] = mapped_column(String(5), default="0")  # 0-4+
    positive_sharp_waves: Mapped[str] = mapped_column(String(5), default="0")
    fasciculations: Mapped[bool] = mapped_column(default=False)

    mup_duration: Mapped[str] = mapped_column(
        String(20), default="normal"
    )  # short / normal / long
    mup_amplitude: Mapped[str] = mapped_column(String(20), default="normal")
    mup_polyphasia: Mapped[str] = mapped_column(
        String(20), default="normal"
    )  # normal / increased
    recruitment: Mapped[str] = mapped_column(
        String(20), default="normal"
    )  # normal / reduced / early / discrete

    examination: Mapped["Examination"] = relationship(
        back_populates="needle_emg_studies"
    )


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    examination_id: Mapped[str] = mapped_column(
        ForeignKey("examinations.id"), unique=True
    )
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus), default=ReportStatus.DRAFT
    )
    ai_generated_text: Mapped[str] = mapped_column(Text, default="")
    final_text: Mapped[str] = mapped_column(Text, default="")
    approved_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    approved_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    examination: Mapped["Examination"] = relationship(back_populates="report")
