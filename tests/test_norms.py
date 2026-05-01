"""Tests for nerve-conduction and needle-EMG normative validation."""

from __future__ import annotations

import pytest

from backend.norms import (
    NERVE_NORMS,
    NormRange,
    validate_needle_emg,
    validate_nerve_study,
)


# ── NormRange ────────────────────────────────────────────────────────


class TestNormRange:
    def test_none_value_returns_none(self):
        nr = NormRange("Amplitude", min_val=4.0, unit="mV")
        assert nr.check(None) is None

    def test_within_bounds_returns_none(self):
        nr = NormRange("CV", min_val=49.0, max_val=70.0, unit="m/s")
        assert nr.check(55.0) is None

    def test_below_min_flags_low(self):
        nr = NormRange("Amplitude", min_val=4.0, unit="mV")
        flag = nr.check(2.5)
        assert flag is not None
        assert "low" in flag
        assert "2.5" in flag
        assert "4.0" in flag
        assert "mV" in flag

    def test_above_max_flags_high(self):
        nr = NormRange("Distal latency", max_val=4.2, unit="ms")
        flag = nr.check(5.1)
        assert flag is not None
        assert "high" in flag
        assert "5.1" in flag
        assert "4.2" in flag
        assert "ms" in flag

    def test_boundary_min_is_inclusive(self):
        # Spec uses strict `<`, so a value exactly at min_val is normal.
        nr = NormRange("Amplitude", min_val=4.0, unit="mV")
        assert nr.check(4.0) is None

    def test_boundary_max_is_inclusive(self):
        nr = NormRange("Distal latency", max_val=4.2, unit="ms")
        assert nr.check(4.2) is None

    def test_just_below_min_flags(self):
        nr = NormRange("Amplitude", min_val=4.0, unit="mV")
        assert nr.check(3.999) is not None

    def test_just_above_max_flags(self):
        nr = NormRange("Distal latency", max_val=4.2, unit="ms")
        assert nr.check(4.201) is not None

    def test_one_sided_range_only_checks_its_bound(self):
        # min-only range has no upper limit.
        min_only = NormRange("Amplitude", min_val=4.0, unit="mV")
        assert min_only.check(1000.0) is None
        # max-only range has no lower limit.
        max_only = NormRange("Latency", max_val=4.2, unit="ms")
        assert max_only.check(0.0) is None


# ── validate_nerve_study ─────────────────────────────────────────────


class TestValidateNerveStudy:
    def test_unknown_nerve_returns_empty(self):
        assert validate_nerve_study("phantom", "motor", {"amplitude": 1.0}) == []

    def test_unknown_study_type_returns_empty(self):
        assert validate_nerve_study("median", "telepathic", {"amplitude": 1.0}) == []

    def test_all_normal_values_returns_empty(self):
        # Healthy median motor study, every parameter inside its norm.
        flags = validate_nerve_study(
            "median",
            "motor",
            {
                "distal_latency_ms": 3.5,
                "amplitude": 8.0,
                "conduction_velocity_ms": 55.0,
                "f_wave_latency_ms": 28.0,
            },
        )
        assert flags == []

    def test_missing_values_are_not_flagged(self):
        # An undocumented parameter must not produce a "missing value" flag.
        flags = validate_nerve_study("median", "motor", {})
        assert flags == []

    def test_partial_input_only_flags_present_abnormalities(self):
        flags = validate_nerve_study(
            "median",
            "motor",
            {"amplitude": 2.0},  # below min of 4.0
        )
        assert len(flags) == 1
        assert "amplitude" in flags[0].lower()

    def test_carpal_tunnel_pattern_flags_expected_params(self):
        # Classic median motor abnormality: prolonged distal latency,
        # low CMAP amplitude, slowed CV. F-wave still in range.
        flags = validate_nerve_study(
            "median",
            "motor",
            {
                "distal_latency_ms": 5.1,
                "amplitude": 3.2,
                "conduction_velocity_ms": 48.0,
                "f_wave_latency_ms": 30.0,
            },
        )
        assert len(flags) == 3
        joined = " | ".join(flags).lower()
        assert "distal latency" in joined
        assert "amplitude" in joined
        assert "cv" in joined
        assert "f-wave" not in joined

    def test_case_insensitive_matching(self):
        flags_lower = validate_nerve_study("median", "motor", {"amplitude": 2.0})
        flags_upper = validate_nerve_study("MEDIAN", "MOTOR", {"amplitude": 2.0})
        assert flags_lower == flags_upper

    @pytest.mark.parametrize(
        "key",
        list(NERVE_NORMS.keys()),
    )
    def test_every_documented_nerve_validates(self, key):
        # Every key in NERVE_NORMS should be reachable through the public
        # entry point: empty values produce no flags, not a crash.
        nerve, study_type = key
        assert validate_nerve_study(nerve, study_type, {}) == []


# ── validate_needle_emg ──────────────────────────────────────────────


class TestValidateNeedleEMG:
    def test_empty_dict_returns_empty(self):
        # All fields default to "normal" / "0" — nothing to flag.
        assert validate_needle_emg({}) == []

    def test_all_normal_explicit_returns_empty(self):
        data = {
            "insertional_activity": "normal",
            "fibrillations": "0",
            "positive_sharp_waves": "0",
            "fasciculations": False,
            "mup_duration": "normal",
            "mup_amplitude": "normal",
            "mup_polyphasia": "normal",
            "recruitment": "normal",
        }
        assert validate_needle_emg(data) == []

    def test_increased_insertional_activity_flagged(self):
        flags = validate_needle_emg({"insertional_activity": "increased"})
        assert len(flags) == 1
        assert "Insertional activity" in flags[0]
        assert "increased" in flags[0]

    @pytest.mark.parametrize("zero_form", ["0", "none", "None", ""])
    def test_zero_fibrillations_not_flagged(self, zero_form):
        assert validate_needle_emg({"fibrillations": zero_form}) == []

    @pytest.mark.parametrize("grade", ["1+", "2+", "3+", "4+"])
    def test_nonzero_fibrillations_flagged(self, grade):
        flags = validate_needle_emg({"fibrillations": grade})
        assert any("Fibrillations" in f and grade in f for f in flags)

    def test_positive_sharp_waves_flagged_when_present(self):
        flags = validate_needle_emg({"positive_sharp_waves": "2+"})
        assert any("Positive sharp waves" in f for f in flags)

    def test_fasciculations_truthy_flagged(self):
        assert any(
            "Fasciculations" in f
            for f in validate_needle_emg({"fasciculations": True})
        )

    def test_fasciculations_false_not_flagged(self):
        assert validate_needle_emg({"fasciculations": False}) == []

    @pytest.mark.parametrize(
        "field,value,label",
        [
            ("mup_duration", "long", "MUP duration"),
            ("mup_duration", "short", "MUP duration"),
            ("mup_amplitude", "high", "MUP amplitude"),
            ("mup_amplitude", "low", "MUP amplitude"),
            ("mup_polyphasia", "increased", "Polyphasia"),
            ("recruitment", "reduced", "Recruitment"),
            ("recruitment", "early", "Recruitment"),
        ],
    )
    def test_mup_and_recruitment_abnormalities_flagged(self, field, value, label):
        flags = validate_needle_emg({field: value})
        assert any(label in f and value in f for f in flags)

    def test_full_neurogenic_pattern_collects_all_flags(self):
        # Chronic neurogenic remodeling: fibs and PSW present, MUPs long
        # and high, polyphasia, recruitment reduced.
        flags = validate_needle_emg(
            {
                "insertional_activity": "increased",
                "fibrillations": "1+",
                "positive_sharp_waves": "1+",
                "fasciculations": True,
                "mup_duration": "long",
                "mup_amplitude": "high",
                "mup_polyphasia": "increased",
                "recruitment": "reduced",
            }
        )
        assert len(flags) == 8
