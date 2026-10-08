export const TRANSMITTERS = {
  glutamate: {
    name: "Glutaminian",
    formula: "C₅H₉NO₄ · model kwasu L-glutaminowego",
    receptors: "AMPA, NMDA, kainianowe; mGluR",
    pack: "VGLUT",
    clear: "EAAT · neurony i glej",
    function:
      "Najważniejszy szybki przekaźnik pobudzający w wielu obwodach. Uczestniczy w plastyczności i uczeniu; skutek zależy od receptorów, obwodu i stanu błony.",
  },
  gaba: {
    name: "GABA",
    formula: "C₄H₉NO₂",
    receptors: "GABA-A · kanał anionowy; GABA-B · GPCR",
    pack: "VGAT / VIAAT",
    clear: "GAT · wychwyt neurony / glej",
    function:
      "Reguluje pobudliwość i synchronizację sieci. Hamowanie może wynikać z hiperpolaryzacji lub bocznikowania; znak odpowiedzi zależy także od gradientów jonowych.",
  },
  dopamine: {
    name: "Dopamina",
    formula: "C₈H₁₁NO₂",
    receptors: "D1-podobne i D2-podobne · GPCR",
    pack: "VMAT2",
    clear: "DAT · wychwyt; metabolizm m.in. MAO / COMT",
    function:
      "Moduluje uczenie o wyniku działania, motywację, selekcję zachowania i kontrolę ruchu. Układy nigrostriatalny, mezolimbiczny i mezokortykalny pełnią różne role.",
  },
  serotonin: {
    name: "Serotonina · 5-HT",
    formula: "C₁₀H₁₂N₂O",
    receptors: "Rodziny 5-HT; 5-HT3 jonotropowy, pozostałe GPCR",
    pack: "VMAT2",
    clear: "SERT · wychwyt; metabolizm MAO",
    function:
      "Moduluje szerokie sieci związane m.in. z czuwaniem, afektem, przetwarzaniem awersyjnym i elastycznością zachowania. Poszczególne receptory mają odmienne efekty.",
  },
  acetylcholine: {
    name: "Acetylocholina",
    formula: "C₇H₁₆NO₂⁺",
    receptors: "Nikotynowe · kanały; muskarynowe · GPCR",
    pack: "VAChT",
    clear: "Acetylocholinoesteraza; wychwyt choliny CHT1",
    function:
      "W korze i hipokampie wpływa na uwagę, kodowanie informacji i stan sieci. Jej działanie zależy od typu receptora i miejsca w obwodzie.",
  },
  noradrenaline: {
    name: "Noradrenalina",
    formula: "C₈H₁₁NO₃",
    receptors: "α1, α2, β · GPCR",
    pack: "VMAT2",
    clear: "NET · wychwyt; metabolizm MAO / COMT",
    function:
      "Układ miejsca sinawego uczestniczy w regulacji czuwania, uwagi i wzmocnienia odpowiedzi sieci. Znaczenie ma dynamika aktywności fazowej i tonicznej.",
  },
};
