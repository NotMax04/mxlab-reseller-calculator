import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMXLABPriceAIInput,
  normalizeVintedAnalysis,
  parseMXLABPriceAIOutput,
} from './vinted-price-ai.js';

const sample = `STATO: OK
PREZZO_TARGET: 16 €
PREZZO_PIU_FREQUENTE: 15 €
PREZZO_PONDERATO: 16,5 €
FASCIA_CENTRALE: 14-18 €
ANNUNCI_LETTI: 28
ANNUNCI_VALIDI: 19
ANNUNCI_SCARTATI: 9
AFFIDABILITA: ALTA
MOTIVO: La maggior parte dei comparabili validi si concentra tra 14 e 18 euro, con maggiore interesse sui prezzi da 15 a 17 euro.`;

test('costruisce un prompt completo con dati articolo e regole anti-duplicato', () => {
  const prompt = buildMXLABPriceAIInput({
    code: 'MX-0042',
    brand: 'OVS',
    category: 'Blusa',
    size: 'L',
    condition: 'Ottime',
    listing: { generatedTitles: ['OVS Blusa Donna Catene Pois L'], baseDescription: 'Colore: Nero, Rosso, Bianco' },
  });
  assert.match(prompt, /deduplica/i);
  assert.match(prompt, /PESO DEI CUORI/);
  assert.match(prompt, /OVS Blusa Donna Catene Pois L/);
  assert.match(prompt, /mediana ponderata/i);
});

test('interpreta il risultato strutturato dell’analisi video', () => {
  const result = parseMXLABPriceAIOutput(sample);
  assert.equal(result.status, 'ok');
  assert.equal(result.target, 16);
  assert.equal(result.weighted, 16.5);
  assert.deepEqual([result.rangeMin, result.rangeMax], [14, 18]);
  assert.equal(result.validCount, 19);
  assert.equal(result.confidence, 'Alta');
});

test('accetta un video insufficiente senza inventare il target', () => {
  const result = parseMXLABPriceAIOutput(`STATO: INSUFFICIENTE
PREZZO_TARGET: 0 €
PREZZO_PIU_FREQUENTE: 0 €
PREZZO_PONDERATO: 0 €
FASCIA_CENTRALE: 0-0 €
ANNUNCI_LETTI: 4
ANNUNCI_VALIDI: 2
ANNUNCI_SCARTATI: 2
AFFIDABILITA: BASSA
MOTIVO: Il video contiene troppo pochi comparabili leggibili.`);
  assert.equal(result.status, 'insufficient');
  assert.equal(result.target, 0);
});

test('rifiuta le istruzioni copiate al posto del risultato', () => {
  assert.throws(() => parseMXLABPriceAIOutput('AGISCI COME ANALISTA PREZZI VINTED\nOUTPUT OBBLIGATORIO'), /istruzioni/);
});

test('normalizza i dati di analisi salvati', () => {
  const normalized = normalizeVintedAnalysis({ target: '16,50', confidence: 'Alta', validCount: '19', status: 'ok' });
  assert.equal(normalized.target, 16.5);
  assert.equal(normalized.validCount, 19);
  assert.equal(normalized.status, 'ok');
});
