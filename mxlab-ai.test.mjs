import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMXLABAIInput,
  normalizeGeneratedTitles,
  parseMXLABAIOutput,
} from './mxlab-ai.js';

const sample = `Polo Ralph Lauren Camicia Uomo Manica Corta Bianca XL

Polo Ralph Lauren Camicia Uomo Bianca XL

Polo Ralph Lauren Camicia Uomo Manica Corta Bianca Cotone XL

DESCRIZIONE

Misure: 54 cm Spalle - 79 cm Lunghezza - 27 cm Manica - 62 cm Petto

Materiale: 100% Cotone

Taglia: XL

Colore: Bianco

Condizioni: Ottimo stato

Spedizione veloce 🚚 o ritiro a mano a Burago di Molgora 📍

Scrivimi per info, misure o altro

Prezzo trattabile!

#PoloRalphLauren #CamiciaUomo #CamiciaBianca #ManicaCorta`;

test('costruisce il brief con istruzioni complete e dati prioritari', () => {
  const brief = buildMXLABAIInput({ code: 'MX-1', title: 'Polo bianca', size: 'XL' }, '54 cm Spalle', 8);
  assert.match(brief, /Analizza prima le immagini/);
  assert.match(brief, /54 cm Spalle/);
  assert.match(brief, /Numero di fotografie allegate: 8/);
});

test('interpreta il formato finale MXLAB', () => {
  const result = parseMXLABAIOutput(sample);
  assert.equal(result.titles.length, 3);
  assert.equal(result.titles[1], 'Polo Ralph Lauren Camicia Uomo Bianca XL');
  assert.match(result.description, /Materiale: 100% Cotone/);
  assert.deepEqual(result.warnings, []);
});

test('rimuove etichette facoltative dai titoli e applica i limiti', () => {
  const result = parseMXLABAIOutput(`Titolo Vinted: ${'A '.repeat(80)}\nTitolo Wallapop/Subito: Titolo breve\nTitolo eBay: Titolo esteso\nDESCRIZIONE\nMateriale: Cotone (Etichetta composizione assente)\n#Cotone #Vintage #SecondHand`);
  assert.ok(result.titles[0].length <= 100);
  assert.equal(result.titles[1], 'Titolo breve');
});

test('rifiuta le istruzioni copiate al posto del risultato', () => {
  assert.throws(() => parseMXLABAIOutput('Agisci come esperto di reselling\nOBIETTIVO\nDESCRIZIONE'), /istruzioni/);
});

test('normalizza soltanto set completi di tre titoli', () => {
  assert.deepEqual(normalizeGeneratedTitles(['Uno', 'Due', 'Tre']), ['Uno', 'Due', 'Tre']);
  assert.deepEqual(normalizeGeneratedTitles(['Uno']), []);
});
