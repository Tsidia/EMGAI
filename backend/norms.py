"""
EMG / ENG normative reference ranges and validation logic.

Reference values based on standard clinical neurophysiology references
(Preston & Shapiro, Kimura). These are simplified adult norms for
demonstration purposes.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class NormRange:
    label: str
    min_val: float | None = None
    max_val: float | None = None
    unit: str = ""

    def check(self, value: float | None) -> str | None:
        if value is None:
            return None
        if self.min_val is not None and value < self.min_val:
            return f"{self.label} low ({value} {self.unit}, norm ≥{self.min_val})"
        if self.max_val is not None and value > self.max_val:
            return f"{self.label} high ({value} {self.unit}, norm ≤{self.max_val})"
        return None


# ── Motor Nerve Conduction Norms ────────────────────────────────────
# Key: (nerve, study_type) → dict of parameter → NormRange

NERVE_NORMS: dict[tuple[str, str], dict[str, NormRange]] = {
    # ── Upper limb motor ──
    ("median", "motor"): {
        "distal_latency_ms": NormRange("Distal latency", max_val=4.2, unit="ms"),
        "amplitude": NormRange("CMAP amplitude", min_val=4.0, unit="mV"),
        "conduction_velocity_ms": NormRange("CV", min_val=49.0, unit="m/s"),
        "f_wave_latency_ms": NormRange("F-wave latency", max_val=31.0, unit="ms"),
    },
    ("ulnar", "motor"): {
        "distal_latency_ms": NormRange("Distal latency", max_val=3.5, unit="ms"),
        "amplitude": NormRange("CMAP amplitude", min_val=6.0, unit="mV"),
        "conduction_velocity_ms": NormRange("CV", min_val=49.0, unit="m/s"),
        "f_wave_latency_ms": NormRange("F-wave latency", max_val=32.0, unit="ms"),
    },
    ("radial", "motor"): {
        "distal_latency_ms": NormRange("Distal latency", max_val=4.0, unit="ms"),
        "amplitude": NormRange("CMAP amplitude", min_val=2.0, unit="mV"),
        "conduction_velocity_ms": NormRange("CV", min_val=50.0, unit="m/s"),
    },
    # ── Lower limb motor ──
    ("peroneal", "motor"): {
        "distal_latency_ms": NormRange("Distal latency", max_val=6.1, unit="ms"),
        "amplitude": NormRange("CMAP amplitude", min_val=2.0, unit="mV"),
        "conduction_velocity_ms": NormRange("CV", min_val=41.0, unit="m/s"),
        "f_wave_latency_ms": NormRange("F-wave latency", max_val=56.0, unit="ms"),
    },
    ("tibial", "motor"): {
        "distal_latency_ms": NormRange("Distal latency", max_val=5.8, unit="ms"),
        "amplitude": NormRange("CMAP amplitude", min_val=4.0, unit="mV"),
        "conduction_velocity_ms": NormRange("CV", min_val=41.0, unit="m/s"),
        "f_wave_latency_ms": NormRange("F-wave latency", max_val=56.0, unit="ms"),
    },
    # ── Upper limb sensory ──
    ("median", "sensory"): {
        "distal_latency_ms": NormRange("Peak latency", max_val=3.5, unit="ms"),
        "amplitude": NormRange("SNAP amplitude", min_val=20.0, unit="µV"),
        "conduction_velocity_ms": NormRange("CV", min_val=50.0, unit="m/s"),
    },
    ("ulnar", "sensory"): {
        "distal_latency_ms": NormRange("Peak latency", max_val=3.1, unit="ms"),
        "amplitude": NormRange("SNAP amplitude", min_val=17.0, unit="µV"),
        "conduction_velocity_ms": NormRange("CV", min_val=50.0, unit="m/s"),
    },
    ("radial", "sensory"): {
        "distal_latency_ms": NormRange("Peak latency", max_val=2.9, unit="ms"),
        "amplitude": NormRange("SNAP amplitude", min_val=15.0, unit="µV"),
        "conduction_velocity_ms": NormRange("CV", min_val=50.0, unit="m/s"),
    },
    # ── Lower limb sensory ──
    ("sural", "sensory"): {
        "distal_latency_ms": NormRange("Peak latency", max_val=4.4, unit="ms"),
        "amplitude": NormRange("SNAP amplitude", min_val=6.0, unit="µV"),
        "conduction_velocity_ms": NormRange("CV", min_val=40.0, unit="m/s"),
    },
    ("superficial_peroneal", "sensory"): {
        "distal_latency_ms": NormRange("Peak latency", max_val=4.4, unit="ms"),
        "amplitude": NormRange("SNAP amplitude", min_val=6.0, unit="µV"),
        "conduction_velocity_ms": NormRange("CV", min_val=40.0, unit="m/s"),
    },
}

# Parameters to check for each study type
NCS_PARAMS = ["distal_latency_ms", "amplitude", "conduction_velocity_ms", "f_wave_latency_ms"]


def validate_nerve_study(
    nerve: str, study_type: str, values: dict[str, float | None]
) -> list[str]:
    """Return list of abnormality flags for a nerve conduction study."""
    key = (nerve.lower(), study_type.lower())
    norms = NERVE_NORMS.get(key)
    if norms is None:
        return []
    flags: list[str] = []
    for param in NCS_PARAMS:
        norm = norms.get(param)
        if norm is None:
            continue
        flag = norm.check(values.get(param))
        if flag:
            flags.append(flag)
    return flags


def validate_needle_emg(data: dict) -> list[str]:
    """Return list of abnormality flags for a needle EMG study."""
    flags: list[str] = []
    if data.get("insertional_activity", "normal") != "normal":
        flags.append(f"Insertional activity: {data['insertional_activity']}")
    for field, label in [
        ("fibrillations", "Fibrillations"),
        ("positive_sharp_waves", "Positive sharp waves"),
    ]:
        val = data.get(field, "0")
        if val not in ("0", "none", "None", ""):
            flags.append(f"{label}: {val}")
    if data.get("fasciculations"):
        flags.append("Fasciculations present")
    if data.get("mup_duration", "normal") != "normal":
        flags.append(f"MUP duration: {data['mup_duration']}")
    if data.get("mup_amplitude", "normal") != "normal":
        flags.append(f"MUP amplitude: {data['mup_amplitude']}")
    if data.get("mup_polyphasia", "normal") != "normal":
        flags.append(f"Polyphasia: {data['mup_polyphasia']}")
    if data.get("recruitment", "normal") != "normal":
        flags.append(f"Recruitment: {data['recruitment']}")
    return flags


# ── Available nerves & muscles for the UI ───────────────────────────

AVAILABLE_NERVES = {
    "motor": ["median", "ulnar", "radial", "peroneal", "tibial"],
    "sensory": [
        "median", "ulnar", "radial", "sural", "superficial_peroneal",
    ],
}

AVAILABLE_MUSCLES = [
    "first_dorsal_interosseous",
    "abductor_pollicis_brevis",
    "abductor_digiti_minimi",
    "biceps",
    "triceps",
    "deltoid",
    "extensor_digitorum_communis",
    "flexor_carpi_radialis",
    "tibialis_anterior",
    "gastrocnemius_medial",
    "gastrocnemius_lateral",
    "vastus_medialis",
    "vastus_lateralis",
    "iliopsoas",
    "gluteus_medius",
    "paraspinal_cervical",
    "paraspinal_lumbar",
]
