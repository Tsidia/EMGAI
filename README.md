# EMG/ENG AI — Inteligentny System Opisu Badań Elektrofizjologicznych

System wspomagający lekarzy neurofizjologów w tworzeniu opisów badań EMG/ENG. Wprowadzasz wyniki badania, system automatycznie porównuje je z normami i generuje gotowy opis kliniczny do przejrzenia, edycji i zatwierdzenia.

> **Cel:** Przyspieszenie tworzenia opisów badań i standaryzacja ich jakości.

## Jak to działa

```
Wprowadzenie danych → Walidacja z normami → Generowanie opisu AI → Edycja przez lekarza → Zatwierdzenie
```

### 1. Wprowadzanie wyników badania

Formularz obejmuje pełne badanie elektrofizjologiczne:

- **Przewodzenie nerwowe (NCS)** — nerwy motoryczne i sensoryczne kończyn górnych i dolnych (n. pośrodkowy, łokciowy, promieniowy, strzałkowy, piszczelowy, łydkowy). Parametry: latencja dystalna, amplituda, szybkość przewodzenia, fala F.
- **EMG igłowe** — 17 mięśni z pełnym zestawem parametrów: aktywność wkłucia, fibrylacje, PSW, fascykulacje, potencjały jednostki ruchowej (czas trwania, amplituda, polifazja), rekrutacja.
- **Dane pacjenta** — wiek, płeć, wzrost, wskazanie kliniczne, lekarz kierujący.
<img width="959" height="432" alt="mainPage" src="https://github.com/user-attachments/assets/9668ead8-1ba9-40e4-a6fa-ae6196d686de" />

### 2. Automatyczna walidacja z normami

System porównuje każdy zmierzony parametr z opublikowanymi wartościami referencyjnymi (wg Preston & Shapiro, Kimura) i **natychmiast oznacza odchylenia** — widoczne jako czerwone flagi przy każdym badanym nerwie i mięśniu.

<img width="947" height="439" alt="pre-opis" src="https://github.com/user-attachments/assets/bacfd6ef-eb87-4758-b837-0b0928c7cead" />

### 3. Generowanie opisu przez AI

Jednym kliknięciem system wysyła dane badania — wraz z oznaczonymi nieprawidłowościami — do modelu AI, który generuje **kompletny opis badania**, w formacie klinicznym:

- Wyniki badania przewodzenia nerwowego
- Wyniki EMG igłowego
- Podsumowanie i interpretacja kliniczna
- Sugestia diagnostyczna w kontekście wskazania

<img width="952" height="430" alt="opis3" src="https://github.com/user-attachments/assets/6bc67da7-50a8-4d78-bdd2-58bd9d6ffa5b" />


### 4. Przegląd, edycja i zatwierdzenie

Lekarz może:
- Przejrzeć wygenerowany opis
- Dowolnie go edytować
- Zatwierdzić raport swoim nazwiskiem (z datą i godziną)
- W razie potrzeby — wygenerować opis ponownie

<img width="946" height="422" alt="opis1" src="https://github.com/user-attachments/assets/d1d931d9-640a-4d22-b506-a74c9a5f126c" />

## Uruchomienie

Wymagania: Python 3.10+ i klucz API (Zhipu AI, OpenAI, lub inny kompatybilny dostawca).

```bash
pip install -r requirements.txt
cp .env.example .env       # skopiuj szablon konfiguracji
                            # wpisz swój klucz API w pliku .env
python run.py              # uruchom serwer
```

Aplikacja będzie dostępna pod adresem **http://localhost:8000**

## Konfiguracja AI

System współpracuje z dowolnym dostawcą API kompatybilnym z OpenAI. W pliku `.env` wystarczy ustawić trzy zmienne:

```env
LLM_API_KEY=twoj-klucz-api
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
LLM_MODEL=glm-5
```

Obsługiwani dostawcy: Zhipu AI (GLM-5), OpenAI (GPT-4o), oraz lokalne modele (Ollama, LM Studio).

## Normy referencyjne

Zaimplementowane wartości referencyjne dla badania przewodzenia nerwowego:

| Nerw | Typ | Latencja dyst. | Amplituda | CV |
|------|-----|---------------|-----------|-----|
| N. pośrodkowy | motoryczny | ≤4.2 ms | ≥4.0 mV | ≥49 m/s |
| N. pośrodkowy | sensoryczny | ≤3.5 ms | ≥20 µV | ≥50 m/s |
| N. łokciowy | motoryczny | ≤3.5 ms | ≥6.0 mV | ≥49 m/s |
| N. łokciowy | sensoryczny | ≤3.1 ms | ≥17 µV | ≥50 m/s |
| N. strzałkowy | motoryczny | ≤6.1 ms | ≥2.0 mV | ≥41 m/s |
| N. piszczelowy | motoryczny | ≤5.8 ms | ≥4.0 mV | ≥41 m/s |
| N. łydkowy | sensoryczny | ≤4.4 ms | ≥6.0 µV | ≥40 m/s |

Wartości wg Preston & Shapiro, Kimura — standardowe normy dla dorosłych.

## Architektura

```
┌─────────────────────────────────────────────────┐
│                   Przeglądarka                  │
│         (formularz, podgląd, edycja)            │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼───────────────────────────┐
│              Serwer aplikacji                    │
│                  (FastAPI)                       │
│                                                  │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐   │
│  │  Walidacja  │  │ Logika   │  │ Generowanie│   │
│  │  z normami  │  │ badań    │  │ opisów AI  │   │
│  └─────────────┘  └──────────┘  └─────┬──────┘   │
└──────────────────────┬────────────────┬──────────┘
                       │                │
              ┌────────▼───────┐  ┌─────▼──────┐
              │   Baza danych  │  │   API AI   │
              │   (SQLite)     │  │  (GLM/GPT) │
              └────────────────┘  └────────────┘
```
