# EMG/ENG AI: AI-Assisted Electrophysiology Report System

A tool that helps neurophysiologists write EMG/ENG examination reports. You enter study results, the system automatically compares them against reference norms and generates a full clinical report for review, editing and sign-off.

> **Goal:** speed up report writing and standardise its quality.

## How it works

```
Enter data -> Validate against norms -> AI generates report -> Physician edits -> Sign off
```

### 1. Entering study results

The form covers a full electrophysiology study:

- **Nerve conduction studies (NCS):** motor and sensory nerves of the upper and lower limbs (median, ulnar, radial, peroneal, tibial, sural). Parameters: distal latency, amplitude, conduction velocity, F-wave.
- **Needle EMG:** 17 muscles with a full parameter set: insertional activity, fibrillations, positive sharp waves, fasciculations, motor unit potentials (duration, amplitude, polyphasia), recruitment.
- **Patient data:** age, sex, height, clinical indication, referring physician.

<img width="959" height="432" alt="mainPage" src="https://github.com/user-attachments/assets/9668ead8-1ba9-40e4-a6fa-ae6196d686de" />

### 2. Automatic validation against norms

Every measured parameter is compared against published reference values (Preston & Shapiro, Kimura) and **abnormalities are flagged immediately**, shown as red markers next to each nerve and muscle.

<img width="947" height="439" alt="pre-opis" src="https://github.com/user-attachments/assets/bacfd6ef-eb87-4758-b837-0b0928c7cead" />

### 3. AI report generation

A single click sends the study data, with flagged abnormalities, to an LLM that produces a **complete clinical report** in standard format:

- Nerve conduction study findings
- Needle EMG findings
- Summary and clinical interpretation
- Diagnostic suggestion in the context of the clinical indication

<img width="952" height="430" alt="opis3" src="https://github.com/user-attachments/assets/6bc67da7-50a8-4d78-bdd2-58bd9d6ffa5b" />

### 4. Review, edit, sign off

The physician can:
- Review the generated report
- Freely edit it
- Approve it with their name (timestamped)
- Regenerate if needed

<img width="946" height="422" alt="opis1" src="https://github.com/user-attachments/assets/d1d931d9-640a-4d22-b506-a74c9a5f126c" />

## Reference norms

Reference values implemented for nerve conduction studies:

| Nerve | Type | Distal lat. | Amplitude | CV |
|------|-----|---------------|-----------|-----|
| Median | motor | <=4.2 ms | >=4.0 mV | >=49 m/s |
| Median | sensory | <=3.5 ms | >=20 uV | >=50 m/s |
| Ulnar | motor | <=3.5 ms | >=6.0 mV | >=49 m/s |
| Ulnar | sensory | <=3.1 ms | >=17 uV | >=50 m/s |
| Peroneal | motor | <=6.1 ms | >=2.0 mV | >=41 m/s |
| Tibial | motor | <=5.8 ms | >=4.0 mV | >=41 m/s |
| Sural | sensory | <=4.4 ms | >=6.0 uV | >=40 m/s |

Values per Preston & Shapiro, Kimura: standard adult norms.

## Architecture

```
+-------------------------------------------------+
|                   Browser                       |
|           (form, preview, editor)               |
+----------------------+--------------------------+
                       | HTTP / JSON
+----------------------v---------------------------+
|              Application server                  |
|                  (FastAPI)                       |
|                                                  |
|  +-------------+  +----------+  +------------+   |
|  |  Norm       |  | Exam     |  | AI report  |   |
|  |  validation |  | logic    |  | generation |   |
|  +-------------+  +----------+  +-----+------+   |
+----------------------+----------------+----------+
                       |                |
              +--------v-------+  +-----v------+
              |   Database     |  |   AI API   |
              |   (SQLite)     |  |  (GLM/GPT) |
              +----------------+  +------------+
```
