# Neuroatlas — raport rozbudowy, 8 października 2026

Projekt roboczy: `Neuroatlas/dist/`. Kopia całego stanu sprzed zmian: `../_kopia_przed_codex_2026-10-08/`. Zachowano statyczne moduły ES i lokalne Three.js; brak bundlera, frameworka i zależności CDN w czasie działania. Etapy 1–4 przeszły kontrolę przed rozpoczęciem następnego. Etap 5 i regresja całej aplikacji również przeszły testy.

## Funkcje i miejsce w interfejsie

| Funkcja | Gdzie jej szukać | Działanie |
| --- | --- | --- |
| Połączenia | Atlas → opis struktury → Połączenia | Drogi i partnerzy, klikalne wybory, nakładki i przezroczystość; wyłączenie przywraca prezentację. |
| Trzy przekroje | Przekroje → Trzy przekroje 2D | Osiowa, czołowa i strzałkowa; wspólny celownik, klik / strzałki, aseg i powierzchniowy RAS w mm. |
| Alternatywne podziały | Anatomia szczegółowa → Podział powierzchni | DK, 9 rzeczywistych progowanych pól ex vivo FreeSurfer oraz 7 sieci Yeo. Wybór mapy, legenda, półkule. |
| Mapa metod | Badania → Mapa metod | Orientacyjne zakresy czas / przestrzeń, inwazyjność, opis 8 metod i 8 przypadków doboru. |
| Farmakologia | Neuroprzekaźniki → Transport → Farmakologia | 10 mechanizmów, zgodność z transmiterem, reset po jego zmianie; jakościowy wpływ na wybrany etap. |
| Układy modulacyjne | Neuroprzekaźniki → Projekcje | Dopamina, serotonina, noradrenalina i acetylocholina; przybliżone źródła, tory, cele i klikalne opisy. |
| Potencjał błonowy | Impulsy → Potencjał błonowy | Oscyloskop, EPSP / IPSP, sumowanie przestrzenne / czasowe, próg, AP i refrakcja. |
| Patologia | Impulsy → Patologia przewodzenia | Dwa równoległe aksony, prawidłowy / demielinizacja / lidokaina / TTX / bez mieliny, czas lub blokada. |
| Animacje | Impulsy → Neuron i synapsa / Drogi mózgu | Stabilny HUD, ponownie używane pozycje smugi, wiązanie / odłączenie cząstek; respektowana preferencja ograniczonego ruchu. |
| Terytoria naczyniowe | Unaczynienie i udary | ACA / MCA / PCA, obie półkule, klikalne koło Willisa, granice, przekroje i 4 przypadki. |
| Sieci | Sieci funkcjonalne | Siedem rzeczywistych map Yeo i osobna schematyczna uwaga brzuszna; kilka warstw, zadania i powiązane obszary. |
| Grywalne zadania | Pracownia testów | Interferencja, punkty A/B, fluencja i sortowanie; trening, przebieg, wynik, pauza, wyniki sesji i opisy obszarów. |
| Gatunki | Anatomia porównawcza | Dwa z pięciu gatunków, skala, 4 wyróżniane obszary i tabela ze źródłami oraz oznaczeniem brakujących danych. |

Nowe zakładki można otwierać przez `?tab=vascular`, `?tab=networks`, `?tab=tests`, `?tab=comparative`. Opcjonalnie dopisz `&detail=low` albo `&detail=high`.

## Dane i przybliżenia

- **Rzeczywiste dane:** istniejące ludzkie fsaverage / fsaverage5, brain.mgz i aseg; nowe etykiety Yeo2011_7Networks_N1000 oraz BA1, 2, 3a, 3b, 4a, 4p, 6, 44, 45 ex vivo FreeSurfer; uproszczona maska szczura Waxholm v4 z DANDI.
- **Podziały kory:** pola BA są progowane i nie pokrywają całej kory. Przy nakładaniu etykiet pierwsza w kolejności wymienionej powyżej ma pierwszeństwo. SD wykorzystuje zagnieżdżone indeksy HD; średnia różnica położeń wynosi około 1 mm. Yeo7 łączy część sieci istotności i uwagi brzusznej; dodatkowe rozdzielenie VAN to przybliżenie DK.
- **Literatura, nie dane pomiarowe:** listy połączeń, szlaki projekcyjne, farmakologia, zakresy metod oraz przypisanie terytoriów naczyniowych do całych parcel DK. Jądra neuromodulacyjne mają przybliżone znaczniki. Drogi nie są traktografią; mapa połączeń nie jest konektomem.
- **Modele fizjologiczne:** integrate-and-fire z upływem, krokiem 1 ms, tau 120 ms, narzuconym kształtem AP i refrakcją 80 ms. Czasy przewodzenia, procent uszkodzenia / blokady i liczby cząstek są dydaktyczne. Brak Hodgkina–Huxleya, modelu dawki i farmakokinetyki.
- **Zadania:** własne bodźce i procedury, bez skopiowanych materiałów testowych, norm i walidacji klinicznej. RT zależy od sprzętu. Interferencja i koszt przełączania są różnicami wyników tej sesji. Sortowanie ma mało prób; dwie próby po zmianie służą ilustracji kosztu. Fluencja nie sprawdza słownika ani prawdziwości kategorii.
- **Gatunki:** człowiek i szczur mają geometrię atlasową. Makak, pies i kot mają autorskie schematy z umownymi bruzdami, bez deformowania ludzkiej siatki. Zwierzęce wyróżnienia obszarów są schematyczne również na rzeczywistej masce szczura. Ludzka opuszka węchowa także jest znacznikiem schematycznym. Kora przedczołowa jest wyróżniona wyborem parcel DK, bez twierdzenia o pełnych granicach PFC.
- **Proporcje:** dla człowieka i szczura wspólny przelicznik mm; dla schematów pozostałych gatunków pierwiastek sześcienny stosunku mas. Liczby z innych próbek nie opisują wyświetlanych osobników. Brak porównywalnego EQ oraz wybranej wartości neuronów kory makaka oznaczono w tabeli, bez zgadywania.

## Główne źródła

Pełna literatura jest także w aplikacji pod ikoną książki i przy funkcjach.

- [FreeSurfer — etykiety fsaverage](https://www.freesurfer.net/pub/dist/freesurfer/tutorial_versions_centos6/freesurfer/subjects/fsaverage/label/) i [Yeo i in., 2011](https://pubmed.ncbi.nlm.nih.gov/21653723/).
- [Organizacja dróg istoty białej](https://pmc.ncbi.nlm.nih.gov/articles/PMC3753195/) oraz [rozdzielczość obrazowania](https://pmc.ncbi.nlm.nih.gov/articles/PMC3694179/).
- [Neuroscience — neuroprzekaźniki](https://www.ncbi.nlm.nih.gov/books/NBK10795/), [transport pęcherzykowy](https://pmc.ncbi.nlm.nih.gov/articles/PMC3281572/) i osobne źródło każdego mechanizmu leku w `pharmacology-data.js`.
- [Stroke Imaging](https://www.ncbi.nlm.nih.gov/books/NBK546635/) i [sieć istotności](https://pubmed.ncbi.nlm.nih.gov/20512370/).
- [Diamond, 2013 — funkcje wykonawcze](https://pmc.ncbi.nlm.nih.gov/articles/PMC4084861/).
- [Jardim-Messeder i in., 2017 — pies i kot](https://doi.org/10.3389/fnana.2017.00118), [Azevedo i in., 2009 — człowiek](https://pubmed.ncbi.nlm.nih.gov/19226510/), [neurony gryzoni](https://pmc.ncbi.nlm.nih.gov/articles/PMC3237106/) i [masy próbek](https://pmc.ncbi.nlm.nih.gov/articles/PMC3046985/).
- [Waxholm Space — źródło i licencja CC BY 4.0](https://www.nitrc.org/projects/whs-sd-atlas), [Kleven i in., 2023](https://pubmed.ncbi.nlm.nih.gov/37783883/) oraz [DANDI — przygotowanie siatki](https://github.com/dandi/dandi-atlas/blob/main/scripts/build_rat_atlas.py).

Nowe dane mają metadane i uznanie autorstwa w `dist/licenses/`; dołącz je przy redystrybucji. Samo udostępnienie atlasu do pobrania nie wystarczyło do potwierdzenia redystrybucji CATLAS / wybranych atlasów makaka, dlatego pozostały schematy.

## Weryfikacja

Raporty etapów `tools/qa/stage1.json` … `stage5.json` oraz `final-regression.json`, `final-focused.json`. Pełne przejście 13 zakładek w SD / HD; szerokości 1440, 1000 i 400 px; brak błędów / ostrzeżeń aplikacji i poziomego przepełnienia. Obejrzano zrzuty. Sprawdzono pełne treningi i przebiegi wszystkich zadań, pauzę, klawiaturę, cele dotykowe, wybór rzeczywistego wokselu hipokampa, bezpośrednie adresy nowych zakładek, źródła i przywracanie ustawień. Test modelu obejmuje EPSP, IPSP, sumowanie, AP, refrakcję i blokadę przewodzenia. To testy działania aplikacji, nie walidacja naukowa modeli lub psychometryczna zadań.

Skrypty przeglądarkowe używają Playwright / Chrome z programowym WebGL. Wyników RT z automatycznych kliknięć nie traktuj jako wyników człowieka. HD jest kosztowniejszy; SD pozostaje trybem na słabsze urządzenia. Testy nie zastępują prób na fizycznym telefonie z klawiaturą ekranową.

## Zmienione i nowe pliki

**Zmienione:** `README.md`, `dist/app.js`, `dist/data.js`, `dist/detailed-anatomy.js`, `dist/dissection.js`, `dist/impulse.js`, `dist/index.html`, `dist/neurotransmitter-lab.js`, `dist/readability.css`, `dist/research.js`, `dist/synapse-detail.js`.

**Nowe moduły:** `dist/atlas-connections.js`, `dist/comparative-lab.js`, `dist/cortical-maps.js`, `dist/cortical-overlays.js`, `dist/impulse-physiology.js`, `dist/networks-lab.js`, `dist/orthogonal-slices.js`, `dist/pharmacology-data.js`, `dist/physiology-model.js`, `dist/research-comparison.js`, `dist/tests-lab.js`, `dist/transmitter-projections.js`, `dist/vascular-lab.js`.

**Nowe dane:** `dist/assets/cortical-labels-{high,low}-{lh,rh}.bin` (4 pliki), `dist/assets/cortical-labels.json`, `dist/assets/rat-whs-positions.bin`, `dist/assets/rat-whs-indices.bin`, `dist/assets/rat-whs.json`.

**Licencje:** `dist/licenses/CORTICAL-LABELS-SOURCES.txt`, `dist/licenses/ANIMAL-MESH-SOURCES.txt`.

**Dokumentacja i narzędzia:** `ROZBUDOWA.md`; `tools/prepare-parcellations.py`, `tools/prepare-animal-mesh.py`, `tools/model-check.cjs`, `tools/browser-check.cjs`, `tools/stage5-check.cjs`, `tools/final-check.cjs`; źródłowe etykiety w `tools/source-labels/`, siatka wejściowa w `tools/source-animals/`, wyniki / zrzuty w `tools/qa/`.

## Znane ograniczenia i dalsze kroki

1. Dołączyć pełniejszy atlas BA i Yeo17 po uzgodnieniu prezentacji podregionów oraz zachowaniu licencji.
2. Zastąpić przypisanie naczyniowe DK wolumetrycznym atlasem terytoriów i dodać gałęzie głębokie oraz warianty koła Willisa.
3. Uzupełnić rzeczywiste siatki makaka, psa i kota po potwierdzeniu licencji i wspólnej orientacji; dodać segmentowane obszary homologiczne, zamiast znaczników.
4. Zebrać porównywalne dane EQ / mas ciała i liczby neuronów z określonymi próbkami oraz wzorem; obecna tabela celowo nie łączy różnych definicji.
5. Rozszerzyć fizjologię o przewodnictwa jonowe i parametr średnicy / długości, jeśli potrzebny będzie model ilościowy.
6. Dopiero osobny projekt walidacyjny mógłby uzasadnić normy testów; obecne zadania pozostają edukacyjne. Można dodać eksport lokalnego wyniku i wybór liczby prób.
7. Sprawdzić fizyczne telefony i urządzenia o słabszym GPU; ewentualnie uprościć siatkę szczura oraz granice sieci, zachowując metadane zmian.

## Uzupełnienie: nawigacja, rozłożenie i czytelne przewodzenie

Dodano neutralny Atlas, odznaczanie przez tło / ponowne kliknięcie / Esc, przywracanie kadru sprzed zaznaczenia, reset w bieżącej zakładce przez „Widok ogólny” / Home / dwuklik tła, zoom pod kursorem i odłączanie śledzenia przy ręcznym sterowaniu. Gesty PPM i przeciąganie nie zaznaczają przypadkowo struktur. Każda pracownia 3D ma własny kadr ogólny; zadania poznawcze zachowują przebieg i wyniki.

W Przekrojach jest rozłożenie wszystkich 89 dostępnych części makroanatomii: 68 parcel kory i 21 struktur głębokich. Wyświetlane części pochodzą z istniejących danych DK / aseg. Ich rozmieszczenie katalogowe jest umowne, a nie anatomiczne. Rozłożenie nie oznacza pełnej segmentacji mikroanatomii. Cięcia i drogi są wtedy schowane. Wybór części pozostaje klikalny; odznaczenie nie składa modelu.

W Impulsach przywrócono wyraźniejsze elementy mechanizmu: skokowy znacznik regeneracji AP w węzłach, osobne kolory lokalnego napływu Na⁺ i wypływu K⁺, Ca²⁺ przy zakończeniu, dotychczasową pompę i synapsę. Kamera / prąd bierny pozostają płynne. „Akson i jony” zapewnia czytelny kadr. Symbol nie jest pojedynczym jonem przemieszczającym się wzdłuż całej komórki.

Launcher otwiera serwer tego folderu, wybiera wolny port przy konflikcie i wymusza sprawdzanie aktualności kodu. Sprawdzono, że drugi serwer dostaje inny port oraz zwraca dokładnie aktualny `dist/index.html`.

Nowe pliki: `dist/scene-navigation.js`, `dist/brain-explosion.js`, `tools/serve.py`, `tools/controls-check.cjs`, `../Otwórz poprawiony Neuroatlas.bat`. Zmiany w `dist/app.js`, `index.html`, `readability.css`, `impulse.js`, `impulse-physiology.js`, `physiology-model.js`, `synapse-detail.js`, `detailed-anatomy.js`, `research.js`, `research-comparison.js`, `neurotransmitter-lab.js`, `transmitter-projections.js`, `extended-labs.js`, `vascular-lab.js`, `networks-lab.js`, `comparative-lab.js`, launcherze i skryptach weryfikacji. Raporty: `tools/qa/controls.json`, `tools/qa/navigation-regression.json`.


Ostatnia kontrola kadru i odznaczania: `tools/view-check.cjs`, `tools/qa/views-final.json`; zrzuty `*-whole-brain-final.png`, `*-axon-ions-final.png`. Przejścia kamery i rozłożenia korzystają z rzeczywistego czasu, aby docierały do końcowego kadru także przy wolniejszym renderowaniu.
