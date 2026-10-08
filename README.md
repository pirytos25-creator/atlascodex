# atlascodex — Neuroatlas

Interaktywny atlas 3D i laboratorium neuropsychologii. Strona: [pirytos25-creator.github.io/atlascodex](https://pirytos25-creator.github.io/atlascodex/).

Repozytorium zawiera pełny projekt. GitHub Pages publikuje zawartość `dist/` z gałęzi `gh-pages`; wszystkie modele, biblioteki i licencje są dołączone do strony. Wyniki testów i zrzuty z `tools/qa/` pozostają lokalne.

Aplikacja po polsku do nauki makroanatomii i jej związków z poznaniem na poziomie studiów magisterskich. Działa w przeglądarce obsługującej WebGL2.

## Uruchomienie

Najprościej: kliknij dwukrotnie `Uruchom Neuroatlas.bat` (wymaga Pythona 3). Skrypt uruchamia serwer i otwiera przeglądarkę. Ręcznie — w tym katalogu uruchom:

```
python -m http.server 8765 --directory dist
```

Otwórz `http://127.0.0.1:8765/`. Nie otwieraj index.html bezpośrednio z dysku, ponieważ moduły i dane wymagają lokalnego serwera HTTP. Wszystkie biblioteki i modele znajdują się lokalnie; aplikacja nie pobiera zewnętrznych skryptów. Linki do literatury wymagają internetu.

## Zakres

- Rzeczywista geometria fsaverage HD: 327 684 wierzchołki, 655 360 trójkątów powierzchni kory; opcjonalny tryb SD: fsaverage5, 40 960 trójkątów. Cieniowanie ambient occlusion z Blendera 5.2; zachowana anatomia, bez wygładzania lub subdividingu zmieniającego kształt.
- 68 parcel kory Desikan–Killiany; granice dobierane do powierzchni na podstawie adnotacji wierzchołków.
- 21 modeli struktur głębokich i przestrzeni płynowych z segmentacji fsaverage aseg.
- 10 schematów dróg istoty białej.
- 99 pozycji atlasu łącznie, z informacjami o anatomii, funkcji, możliwych skutkach uszkodzenia i różnicowaniu.
- Obrót, przesuwanie, zbliżanie, swobodny lot, ukrywanie półkul, przezroczystość, przekroje w trzech płaszczyznach z tkanką MRI i segmentacją aseg (HD: 1 mm, SD: 2 mm), rozsuwanie i niezależna obserwacja półkul z widokiem przyśrodkowym.
- Otwierane przypisy zakotwiczone w modelu 3D.
- 6 ścieżek nauki i 14 pytań z losowaną kolejnością oraz wyjaśnieniami.
- Laboratorium impulsów: animacja na 10 drogach, kamera w trzeciej osobie, pauza, tempo i przewijanie cyklu.
- Widok schematycznego neuronu: mielinizacja i przewodzenie ciągłe, AMPA, GABA-A, GPCR, gap junction, Ca²⁺, pęcherzyki, ATP i sumowanie wejść.
- Materiał PBR, bloom i świetlna smuga. BVH przyspiesza wybieranie struktur w modelu HD.
- Spójny naturalny materiał kory i powierzchni cięcia. Tryby naturalny, atlasowy i MRI obejmują powierzchnie obu półkul, struktury głębokie oraz przekroje. Materiał powierzchni MRI jest próbkowaniem wolumenu na siatce, a nie dodatkowym badaniem.
- Badania: MRI, fMRI/BOLD, EEG i PET — urządzenia 3D, etapy pomiaru, animacje sygnału i ograniczenia interpretacji. Podgląd MRI pochodzi z rzeczywistego szablonu; pozostałe sygnały są syntetyczne.
- Anatomia szczegółowa: sześć grup płatowych, obie półkule, rzeczywiste parcele zakrętów, ich rozsuwanie i opisy; osobny schemat sześciu warstw kory nowej.
- Neuroprzekaźniki: sześć rzeczywistych struktur chemicznych 3D z PubChem, wiązania, funkcje i receptory, pakowanie pęcherzykowe, dyfuzja, wychwyt oraz rozkład acetylocholiny.
- Biofeedback: demonstracje HRV, EEG i EDA, wskaźnik oddechu oraz lokalny import CSV z odstępami RR i obliczeniem średniej częstości oraz RMSSD.
- Responsywny układ; obsługa dotyku oraz przyciski lotu na telefonie.

## Sterowanie

Przeciąganie lewym przyciskiem obraca; kółko myszy przybliża; prawy przycisk przesuwa. Na ekranie dotykowym użyj jednego palca do obrotu i dwóch do zbliżania lub przesuwania.

Swobodny lot: W A S D, góra Q, dół E; Shift przyspiesza, Esc kończy lot. Rozglądaj się myszą. Jeżeli przeglądarka nie zezwala na przechwycenie wskaźnika, przytrzymuj lewy przycisk podczas rozglądania.

Od 70% przezroczystości kliknięcie wybiera struktury wewnętrzne zamiast powierzchni kory. Półkule i warstwy można włączać niezależnie.

## Metoda i ograniczenia

Szablon przedstawia uśrednioną makroanatomię. Dane głębokie zostały wygładzone i zamienione na siatki z krokiem 2 woksele. Współrzędne wolumetryczne przekształcono przez FreeSurfer vox2ras_tkr do powierzchniowego RAS, następnie do układu widoku X=R, Y=S, Z=P. Jedna jednostka sceny odpowiada 40 mm.

Model MRI nie rozdziela subpól hipokampa, jąder wzgórza i pnia, płacików móżdżku ani warstw kory. Warstwy w zakładce anatomii to osobny schemat histologiczny, z umowną grubością i typami komórek, bez danych preparatu. Parcele DK nie są dokładnymi polami Brodmanna lub obszarami funkcjonalnymi. Przekrój łączy odcięcie powierzchni siatki z danymi strukturalnymi brain.mgz i etykietami aseg tego samego szablonu, próbkowanymi co 1 mm w HD lub 2 mm w SD. Trójliniowe próbkowanie wolumenu na GPU zapewnia ciągłe przesuwanie płaszczyzny. Numery etykiet pozostają dyskretne. Dostępna jest animacja przekroju z regulacją tempa i kontrastu MRI, łagodne przesuwanie cięcia i rozsuwanie półkul. Dostępny jest naturalny materiał, obraz MRI lub umowne kolory tkanek. Rozsunięcie półkul jest układem prezentacji z umownym odstępem; móżdżek i struktury pośrodkowe pozostają w miejscu. Drogi są schematycznymi krzywymi, nie traktografią. Brak pełnego konektomu i danych aktywności pojedynczych neuronów.

Opisy stanowią autorskie opracowanie dydaktyczne, nie narzędzie diagnozy. Literatura jest dostępna w aplikacji pod ikoną książki. Quiz zawiera fikcyjne przypadki; jego wynik nie jest oceną kompetencji klinicznych. Wynik sesji jest przechowywany tylko w pamięci bieżącej strony.

## Laboratorium impulsów

Świecąca fala ilustruje miejsce propagacji sygnału, nie pojedynczy elektron. Morfologia dwóch neuronów, rozmiary szczeliny, czasy i wartości napięcia są schematyczne. Jest to demonstracja mechanizmów, nie numeryczna symulacja błony ani dane elektrofizjologiczne. EPSP nie gwarantuje nowego potencjału czynnościowego. Dodatkowe pobudzenie ilustruje rolę sumowania; wpływ GABA zależy od warunków jonowych i przewodnictwa. ATP podtrzymuje gradienty oraz procesy obrotu pęcherzyków.

Animacja obejmuje falę depolaryzacji i repolaryzacji, kanały błonowe, pęcherzyki dokowane przy błonie, napływ Ca²⁺, fuzję i dyfuzję transmitera, prądy postsynaptyczne, wychwyt, białko G i wtórne przekaźniki oraz kanały połączeń szczelinowych. Liczby cząstek nie oznaczają stężeń. Kamera ma trzy kadry i płynnie przechodzi między śledzeniem aksonu, synapsą i komórką postsynaptyczną.

## Nowe pracownie

„Badania” pozwalają przewijać cykl, przechodzić między etapami, wybierać kadry kamery i uruchamiać powolną orbitę. MRI ma ręczne położenie rzeczywistej warstwy w 3D, automatyczne skanowanie i kontrast. fMRI ma trzy przykładowe zadania, EEG wybór elektrody, a aparatura regulację widoczności. BOLD pokazano z opóźnioną odpowiedzią hemodynamiczną; kolor parcel nie jest wynikiem pomiaru aktywacji. Elektrody EEG, skaner i detektory PET mają umowne rozmiary. Liczniki PET nie opisują dawki ani czułości klinicznego urządzenia.

MRI: obraz 2D, tekstura warstwy 3D i płaszczyzna skanowania są aktualizowane w tej samej klatce z jednego numeru warstwy. Automatyczne skanowanie wynika z osi czasu badania, również po przewinięciu przy pauzie. Ręczny suwak zatrzymuje automatyczny ruch warstwy, a „Od początku” przywraca skanowanie. Numer warstwy i czas są widoczne pod obrazem. Czas cyklu jest dydaktyczną ilustracją, nie czasem klinicznej akwizycji.

W „Anatomii szczegółowej” wybierz płat i półkulę, przejdź do zakrętów, a następnie do warstw kory. Kliknięcie rzeczywistej parceli DK lub jej przypisu łagodnie rozwija opis anatomii, funkcji i profilu klinicznego w bocznym inspektorze. „Pełny opis” otwiera osobne okno. Można rozsuwać zakręty, regulować przezroczyste otoczenie, używać przekrojów i standardowych kadrów atlasu. Cięcie łączy rozsunięte parcele, aby zachować zgodność z wolumenem. Schemat warstw dotyczy typowej kory nowej; nie pokazuje allocortex hipokampa ani pełnej cytoarchitektoniki każdego zakrętu.

W „Neuroprzekaźnikach” wybierz model atomowy lub transport. Model ma trzy reprezentacje, przełącznik atomów wodoru, swobodną kamerę i wybieranie atomów. Transport pokazuje dwuwarstwę błonową, gradient H⁺, pakowanie pęcherzyków, dokowanie, dyfuzję, receptory i zakończenie sygnału. Cykl można przewijać i wstrzymywać przez przypisy. Współrzędne przedstawiają pojedynczy konformer PubChem. Atomowe promienie, kolory i skala sceny służą dydaktyce. Protonacja w warunkach synaptycznych może się różnić. Glutaminian jest pokazany jako referencyjny kwas L-glutaminowy. Transportery i białka nie są atomowymi modelami strukturalnymi.

Każda zakładka zapamiętuje własne ustawienia widoczności, cięcia i kamery. Efekty i przypisy nieaktywnej pracowni są wyłączane. „Widok immersyjny” chowa inspektor i rozszerza scenę. Na mniejszych ekranach opis znajduje się pod sceną. Wybór struktury wywołuje krótką linię prowadzącą od modelu do opisu oraz łagodne rozwinięcie tekstu. Preferencja systemowa ograniczonego ruchu wyłącza dekoracyjne animacje.

„Biofeedback” uruchamia demonstrację syntetyczną, bez czujnika. CSV jest analizowany offline, lokalnie. Wymagana jest kolumna `rr_ms`, 10–100 000 odstępów z zakresu 200–2500 ms, plik do 5 MB. Rozdzielacze: przecinek, średnik lub tabulator; wartości liczbowe w milisekundach. RMSSD oblicza się z kolejnych różnic RR; analiza nie koryguje automatycznie artefaktów ani pobudzeń ektopowych. Statyczny import nie jest pomiarem biofeedbacku na żywo. Wskaźnik oddechu nie wyznacza indywidualnej częstości rezonansowej.

Można otwierać pracownie bezpośrednio, np. `/?detail=high&tab=research`, `?tab=detailed`, `?tab=transmitters` lub `?tab=biofeedback`.

## Literatura nowych modułów

- MRI i PET: National Institute of Biomedical Imaging and Bioengineering, https://www.nibib.nih.gov/science-education/science-topics/magnetic-resonance-imaging-mri oraz https://www.nibib.nih.gov/science-education/science-topics/nuclear-medicine
- fMRI: https://www.ncbi.nlm.nih.gov/books/NBK538909/
- EEG: https://www.ninds.nih.gov/health-information/disorders/neurological-diagnostic-tests-and-procedures
- Neurotransmisja: Neuroscience, https://www.ncbi.nlm.nih.gov/books/NBK10795/; Ca²⁺ i fuzja pęcherzyków: https://cshperspectives.cshlp.org/content/4/1/a011353.full
- Struktury 3D: NCBI PubChem, CID 33032, 119, 681, 5202, 187, 439260. Adresy źródeł są zapisane przy każdej cząsteczce w `dist/assets/neurotransmitters.json`.
- HRV biofeedback: Lehrer i Gevirtz, https://pmc.ncbi.nlm.nih.gov/articles/PMC4104929/
- Transport pęcherzykowy i błonowy: https://pmc.ncbi.nlm.nih.gov/articles/PMC3281572/
- Warstwy kory: Neuroscience, https://www.ncbi.nlm.nih.gov/books/NBK10870/

## Źródła geometrii

- Powierzchnie HD FreeSurfer: https://www.freesurfer.net/pub/dist/freesurfer/tutorial_versions_centos6/freesurfer/subjects/fsaverage/surf/
- FreeSurfer / MGH: https://www.freesurfer.net/pub/dist/freesurfer/tutorial_versions_centos6/freesurfer/subjects/fsaverage/mri/
- Nilearn fsaverage5: https://github.com/nilearn/nilearn/tree/main/nilearn/datasets/data/fsaverage5
- Adnotacje DK fsaverage5, Keith Jamison / brainmontageplot: https://github.com/kjamison/brainmontageplot/tree/main/brainmontage/atlases
- Atlas DK: Desikan i in., NeuroImage (2006), https://pubmed.ncbi.nlm.nih.gov/16530430/
- Silnik Three.js 0.180.0: https://threejs.org/

Warunki licencyjne źródeł: `dist/licenses/` i `dist/vendor/THREE-LICENSE.txt`. Zachowaj uznanie autorstwa i dołączone licencje przy redystrybucji.

## Przegląd 10.2026

- Ścieżki względne (`./assets`, `./vendor`), więc aplikacja działa także w podfolderze, np. na GitHub Pages.
- Pasek sterowania (przezroczystość, przekrój, kolory, przypisy) odświeża się po zmianie zakładki.
- Wyszukiwarka: drogi istoty białej mają własny nagłówek.
- Przekroje: przypisy schowane za płaszczyzną cięcia są ukrywane, a wybrany przypis jest przygaszony.
- Ścieżki nauki i quiz: każdy przystanek lub pytanie zaczyna od czystej sceny; quiz ma skróty A–D / 1–4 i Enter.
- Impulsy: panel ma ten sam układ co inne pracownie; suwak przebiegu nie skacze podczas przeciągania.
- Badania: komunikat o wczytywaniu MRI; „Od początku” wznawia odtwarzanie.
- Anatomia szczegółowa: zmiana półkuli zachowuje wybrany zakręt; wybór jest spójny z paskiem stanu.
- Neuroprzekaźniki: opis zmienia się z etapem transportu, legenda atomów z nazwami, przełączniki pokazują stan.
- Biofeedback: import CSV z Excela (BOM, cudzysłowy, średnik, przecinek dziesiętny) i komunikat z numerem błędnego wiersza.
- `dist/readability.css`: większe minimalne rozmiary tekstu, lepszy kontrast, poprawki paska sterowania. Usunięcie linku w `index.html` przywraca poprzedni wygląd.
- Przełącznik HD/SD wraca do bieżącej zakładki.

## Rozbudowa Codex 8 października 2026 — etap 1

Atlas: sekcja Połączenia w opisie struktury, klikalne drogi i partnerzy, nakładki na korę i struktury głębokie; wyłączenie przywraca prezentację. To wybór relacji z literatury, nie konektom ani traktografia.

Badania: Mapa metod, zakresy na osiach logarytmicznych, inwazyjność i osiem przypadków doboru metody. sMRI/DWI, TMS i analiza uszkodzeń opisane osobno, ponieważ ich czas nie jest rozdzielczością pomiaru aktywności. Zakresy są orientacyjne i zależą od aparatury oraz rekonstrukcji.

Neuroprzekaźniki: farmakologia w widoku Transport oraz cztery układy w widoku Projekcje. Dostępne mechanizmy zależą od transmitera; jego zmiana resetuje modulację. Znaczniki jąder pnia i przodomózgowia oraz szlaki są przybliżone. Efekty farmakologiczne są ilustracją jakościową, bez dawek i modelu farmakokinetyki.

Źródła mechanizmów i danych: okno Metoda i literatura oraz bezpośrednie odnośniki przy funkcjach. Kopia sprzed zmian: ../_kopia_przed_codex_2026-10-08/.

## Etap 2 — przekroje i podziały powierzchni

Przekroje: trzy okna 2D z wspólnym celownikiem, podpisem aseg i współrzędnymi powierzchniowego RAS w mm. Kliknięcie lub strzałki przesuwają celownik i cięcie 3D. Wyjaśniona konwencja radiologiczna; kontrast i kolory pochodzą ze wspólnych ustawień.

Anatomia szczegółowa: wybór DK, rzeczywistych adnotacji Yeo2011 (7 sieci) lub dziewięciu progowanych pól Brodmanna ex vivo FreeSurfer. Pola 1, 2, 3a, 3b, 4a, 4p, 6, 44, 45; pozostała powierzchnia bez przypisania. Przy nakładaniu etykiet pierwsza w wymienionej kolejności ma pierwszeństwo. Siatka SD korzysta z indeksów zagnieżdżonych w HD; średnia różnica położenia wynosi około 1 mm. Wybór DK, rozsuwanie zakrętów i cięcia nadal działają.

Pochodzenie, przygotowanie danych i warunki licencji: dist/assets/cortical-labels.json, dist/licenses/CORTICAL-LABELS-SOURCES.txt oraz tools/prepare-parcellations.py. Oryginalne etykiety pobrano z publicznej dystrybucji FreeSurfer fsaverage.

## Etap 3 — cztery tryby Impulsów

Nowe karty Potencjał błonowy i Patologia przewodzenia mają osobne panele, sceny i HUD. Oscyloskop: sumowanie EPSP i IPSP, seria bodźców, próg, AP i refrakcja. Model integrate-and-fire z krokiem 1 ms, tau 120 ms, narzuconym kształtem AP i refrakcją 80 ms; wartości są dydaktyczne.

Porównanie dwóch aksonów: mielina, demielinizacja, lidokaina, TTX i brak mieliny. Umowne czasy nie są danymi klinicznymi ani modelem dawki. TTX pokazuje blokadę kanałów wrażliwych na toksynę.

Dotychczasowe animacje zachowują kadry i kamerę trzeciej osoby. HUD aktualizuje tekst najwyżej 10 razy na sekundę; smuga korzysta z ponownie używanego koloru i pozycji. Synapsa ma nieregularne trajektorie dyfuzji, etap wiązania i odłączania. Przy ograniczonym ruchu animacja zwalnia, a poświata jest wyłączona.

Weryfikacja modelu: tools/model-check.cjs — pojedynczy EPSP, IPSP, AP, refrakcja, sumowanie przestrzenne i czasowe oraz blokada przewodzenia.

## Etap 4 — unaczynienie i sieci funkcjonalne

Nowe zakładki Unaczynienie i udary oraz Sieci funkcjonalne. Unaczynienie obejmuje ACA, MCA i PCA dla obu półkul, klikalny schemat koła Willisa, orientacyjne strefy graniczne i cztery autorskie przypadki. Przypisanie całych parcel DK jest przybliżeniem; nie ma pomiaru perfuzji, terytoriów gałęzi głębokich ani indywidualnych wariantów naczyń.

Sieci korzystają z rzeczywistych danych Yeo7 przygotowanych w etapie 2. Osobna uwaga brzuszna jest schematem na parcelach DK prawej półkuli; Yeo7 nie oddziela jej od sieci istotności. Można nakładać kilka sieci i przełączać umowne zadania. Animacja nie jest fMRI ani pomiarem aktywności osoby. W obu zakładkach działają wspólne przekroje, widoczność i rozsunięcie półkul.

Źródła: Yeo 2011, Menon i Uddin 2010 oraz NIH / StatPearls Stroke Imaging, dostępne w oknie Metoda i literatura.

## Etap 5 — zadania i porównanie gatunków

„Pracownia testów”: interferencja kolor–słowo, łączenie punktów A/B, fluencja literowa / kategorialna i odkrywanie zmiennych reguł sortowania. Każde zadanie ma instrukcję, trening, przebieg właściwy i wynik. Własne bodźce, czasy `performance.now()`, błędy, interferencja i umowny koszt przełączania. Obsługa klawiatury i dotyku. Pauza i przejście do innej zakładki zatrzymują zegar; otwarcie opisu struktury również wstrzymuje zadanie. Ostatnie wyniki właściwe można zobaczyć przez „Wyniki tej sesji”; są przechowywane wyłącznie w pamięci strony. To materiał edukacyjny bez norm i walidacji klinicznej. Fluencja nie ma słownika ani automatycznej walidacji kategorii.

„Anatomia porównawcza”: człowiek, makak rezus, pies, kot i szczur; dwa modele jednocześnie, równa skala widoku lub orientacyjne proporcje rozmiarów. Ludzkie powierzchnie wykorzystują istniejące fsaverage / aseg. Rzeczywista uproszczona maska szczura pochodzi z Waxholm Space v4, udostępniona jako siatka przez DANDI, CC BY 4.0. Makak, pies i kot to autorskie schematy; nie są rozciągniętą ludzką siatką. Znaczniki zwierzęcych obszarów i pofałdowanie schematów nie wyznaczają granic atlasowych. Siatka szczura obejmuje maskę całego mózgu z częścią ogonową, a nie tylko powierzchnię kory.

Tabela zawiera wartości z konkretnych próbek literaturowych, liczby neuronów kory, opis pofałdowania i modalności sensorycznych. Nie połączono nieporównywalnych wartości EQ; brak danych w tym zestawieniu jest oznaczony. Brak wybranej liczby neuronów kory makaka nie oznacza braku badań. Dla człowieka i szczura tryb proporcji wykorzystuje wspólny przelicznik mm; pozostałe schematy skalowane są pierwiastkiem sześciennym stosunku mas, bez twierdzenia o rzeczywistej geometrii. Wielkość i liczba neuronów nie tworzą rankingu inteligencji.

Nowe adresy: `?tab=vascular`, `?tab=networks`, `?tab=tests`, `?tab=comparative`, każdy również z `&detail=low` lub `&detail=high`. Wszystkie zasoby aplikacji są lokalne; linki do publikacji otwierają się dopiero po ich wybraniu. Licencje i dokładne pochodzenie nowych danych: `dist/licenses/CORTICAL-LABELS-SOURCES.txt`, `dist/licenses/ANIMAL-MESH-SOURCES.txt` i metadane w `dist/assets/`.

## Odbiór rozbudowy

Pełny opis funkcji, plików, źródeł, ograniczeń i dalszych kroków: [ROZBUDOWA.md](ROZBUDOWA.md).

Testy: `tools/browser-check.cjs` przechodzi wszystkie 13 zakładek w SD i HD, zbiera błędy / ostrzeżenia aplikacji i wykonuje zrzuty. `tools/stage5-check.cjs` kończy treningi i przebiegi właściwe wszystkich czterech zadań w obu rozdzielczościach. `tools/final-check.cjs` sprawdza bezpośrednie adresy nowych zakładek, klawiaturę, dotykowe cele, lokalne wyniki, przywracanie ustawień i kliknięcie wokselu hipokampa. `tools/model-check.cjs` weryfikuje mechanikę potencjału błonowego i przewodzenia. Raporty JSON i obejrzane zrzuty: `tools/qa/`. Szerokości 1440, 1000 i 400 px; konsola bez błędów aplikacji, brak poziomego przepełnienia. Ostrzeżenia sterownika WebGL przy renderowaniu programowym nie są błędami aplikacji.

Skrypty przeglądarkowe wymagają Node.js, Playwright i Chrome / Chromium; adres testowy to `http://127.0.0.1:8877`. Ścieżkę Chrome można ustawić przez `NEUROATLAS_CHROME`. Skrypty przygotowania danych korzystają z Pythona i NumPy. Narzędzia nie są zależnościami działającej aplikacji; `dist/` pozostaje statycznym projektem bez budowania.

## Sterowanie i rozłożenie całego mózgu

Atlas zaczyna bez zaznaczenia. Kliknięcie tła, ponowne kliknięcie zaznaczonej struktury / pozycji w spisie, zamknięcie jej opisu lub Esc usuwa wybór i przywraca wcześniejszy kadr. „Widok ogólny”, Home oraz dwuklik tła zapewniają powrót do pełnego kadru bieżącej pracowni. Reset pozostaje w tej zakładce; zachowuje metodę badania, ustawienia zadania i parametry animacji. W Atlasie przywraca cały nieoznaczony mózg. W Przekrojach zachowuje cięcie, jeśli nie trwa rozłożenie części.

LPM obraca, PPM lub Shift+LPM przesuwa, kółko / środkowy przycisk reguluje zoom. Zoom zmierza do miejsca pod kursorem. PPM, środkowy przycisk i przeciągnięcie zakończone w punkcie startu nie wybierają struktury. Przeciągnięcie myszą lub kółko odłącza automatyczne podążanie w Impulsach. Dwuklik struktury w Atlasie / Przekrojach ją zbliża. Pracownia testów pozostaje widokiem zadania, bez zbędnego resetu kamery.

Przekroje → „Rozłóż cały mózg”: płynne rozłożenie 68 parcel DK i 21 struktur aseg. Części korzystają z istniejących rzeczywistych siatek; położenie w katalogu jest umowne. Można wybrać część przez klik lub listę, przybliżyć ją i odznaczyć bez składania całego układu. „Złóż mózg” / „Widok ogólny” przywraca złożony model. Podczas rozłożenia cięcia i drogi są schowane. To podział makroanatomiczny, bez segmentacji wszystkich jąder, warstw i komórek.

Impulsy → Neuron i synapsa → „Akson i jony”: płynna kamera oraz smuga połączone z wyraźnym przeskokiem znacznika między przewężeniami. Na⁺ (pomarańczowy) przemieszcza się lokalnie do wnętrza, K⁺ (niebieski) na zewnątrz, Ca²⁺ (fioletowy) przy zakończeniu. Przełącznik „Jony i kanały” reguluje widoczność szczegółów. Zachowano pompę 3 Na⁺ / 2 K⁺, pęcherzyki, fuzję i synapsę. Znacznik ilustruje regenerację AP; jego ruch nie jest podróżą pojedynczego jonu przez akson. Ograniczony ruch nadal spowalnia animację i wyłącza poświatę.

## Uruchamianie właściwej kopii

W kopii na dysku plik `Otwórz poprawiony Neuroatlas.bat` w katalogu nadrzędnym uruchamia `Neuroatlas/Uruchom Neuroatlas.bat`. Po sklonowaniu repozytorium uruchom bezpośrednio `Uruchom Neuroatlas.bat`. Skrypt `tools/serve.py` ustala folder względem swojego położenia i otwiera adres dopiero po utworzeniu serwera. Preferuje port 8765, a gdy jest zajęty, wybiera wolny port — nie otwiera istniejącej starej kopii. Adres i folder są widoczne w oknie. Kod strony ma kontrolę pamięci podręcznej; obrazy i duże dane zachowują zwykłe buforowanie. Skrypt nie zatrzymuje innych serwerów. Python może pochodzić z instalacji systemowej albo lokalnego środowiska Codex.

Test sterowania: `tools/controls-check.cjs`, wyniki `tools/qa/controls.json`. Adres serwera do testów można wskazać przez `NEUROATLAS_URL`; domyślnie pozostaje 8877. Test modelu dodatkowo sprawdza monotoniczność, zatrzymanie i przeskok znacznika Ranviera. Sprawdzono też konflikt portów launchera i zgodność serwowanej strony z plikiem w tym folderze.

## Aktualizowanie GitHub Pages

Po zapisaniu i zatwierdzeniu zmian w `main` uruchom w PowerShell:

```powershell
.\tools\publish-pages.ps1
```

Skrypt tworzy commit strony z dokładnej zawartości `HEAD:dist`, zachowuje historię gałęzi `gh-pages` i wysyła obie gałęzie. Nie wykonuje force push. Repozytorium musi już mieć ustawione GitHub Pages dla `gh-pages` / katalogu głównego. Kod projektu i opublikowana strona zachowują licencje swoich źródeł; pliki w `dist/licenses/` oraz `dist/vendor/THREE-LICENSE.txt` pozostają częścią publikacji.
