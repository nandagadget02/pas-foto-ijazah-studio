/**
 * Automated Verification Script for AI Recommendation Presets
 * (Save, Reuse, Export, Import, Restore, Validation, Persistence)
 */

import {
  AIRecommendationPresetService,
} from '../src/services/aiRecommendationPresetService';
import {
  AdjustmentParams,
  AIRecommendationPreset,
  PhotoAnalysisResult,
  ExportedAIPresetFile,
} from '../src/types/analysis';

// Node polyfill for localStorage
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

// Polyfill global environment
if (typeof window === 'undefined') {
  (global as any).window = global;
}
(global as any).localStorage = new LocalStorageMock();

async function runTests() {
  console.log('--- STARTING AI RECOMMENDATION PRESET AUTOMATED VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`\x1b[32m✔ [PASS]\x1b[0m ${testName}`);
      passed++;
    } else {
      console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Initial presets check
  console.log('\n[TEST GROUP 1] Built-in Presets Initialization');
  const initialPresets = await AIRecommendationPresetService.getPresets();
  assert(initialPresets.length >= 3, 'Initial presets loaded with at least 3 defaults');
  const naturalPreset = initialPresets.find((p) => p.name.includes('Natural'));
  const shadowPreset = initialPresets.find((p) => p.name.includes('Shadow Recovery'));
  const contrastPreset = initialPresets.find((p) => p.name.includes('Kontras Lembut'));
  assert(Boolean(naturalPreset), 'Natural preset exists');
  assert(Boolean(shadowPreset), 'Shadow Recovery preset exists');
  assert(Boolean(contrastPreset), 'Kontras Lembut preset exists');
  assert(naturalPreset?.isSystem === true, 'Built-in presets are marked as isSystem=true');

  // 2. Save recommendation from Analysis (Gemini / Local)
  console.log('\n[TEST GROUP 2] Save Preset From Analysis');
  const mockAnalysis: PhotoAnalysisResult = {
    sourceMode: 'grayscale',
    subject: {
      exposureEV: 0.35,
      brightness: 5,
      contrast: 8,
      highlights: -10,
      shadows: 22,
      whites: 5,
      blacks: -4,
      sharpening: 15,
      noiseProtection: 10,
      faceDetail: 12,
      eyeDetail: 14,
      hairDetail: 8,
      skinProtection: 16,
    },
    background: {
      exposureEV: 0,
      brightness: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      sharpening: 0,
      noiseProtection: 0,
    },
    global: {
      exposure: 'normal',
      contrast: 'normal',
      sharpness: 'good',
      noise: 'low',
      clipping: 'none',
      dynamicRange: 'wide',
      aspectRatio: '3:4',
    },
    recommendation: {
      targetTone: 'natural',
      exposureRecommendation: 'Tambahkan eksposur +0.35 EV',
      temperature: 0,
      tint: 0,
      summary: 'Wajah agak gelap, pulihkan bayangan dan detail mata.',
      highlightsHandling: 'Pertahankan detail terang',
      shadowsHandling: 'Angkat bayangan +22',
      sharpeningRecommendation: 'Ketajaman halus +15',
    },
    analysisSource: 'gemini',
    usedModel: 'gemini-2.5-flash-lite',
  };

  const savedPreset = await AIRecommendationPresetService.saveFromAnalysis(
    'Pas Foto Ijazah — Custom Warm',
    mockAnalysis,
    'Catatan pengujian preset Gemini AI'
  );

  assert(Boolean(savedPreset.id), 'Saved preset has a valid stable ID');
  assert(savedPreset.name === 'Pas Foto Ijazah — Custom Warm', 'Preset name matches');
  assert(savedPreset.source === 'gemini', 'Preset source is gemini');
  assert(savedPreset.parameters.exposureEV === 0.35, 'ExposureEV parameter matches analysis subject');
  assert(savedPreset.parameters.shadows === 22, 'Shadows parameter matches analysis subject');
  assert(savedPreset.parameters.eyeDetail === 14, 'Eye detail parameter matches analysis subject');
  assert(savedPreset.parameters.skinProtection === 16, 'Skin protection parameter matches analysis subject');
  assert(savedPreset.targetTone === 'natural', 'TargetTone saved as natural');

  // Verify it exists in full list
  const listAfterSave = await AIRecommendationPresetService.getPresets();
  const retrieved = listAfterSave.find((p) => p.id === savedPreset.id);
  assert(Boolean(retrieved), 'Retrieved preset from store by ID');

  // 3. Export to JSON
  console.log('\n[TEST GROUP 3] Export Presets to JSON');
  const exportAllJson = AIRecommendationPresetService.generateExportJSON(listAfterSave);
  const parsedAllExport: ExportedAIPresetFile = JSON.parse(exportAllJson);
  assert(parsedAllExport.schemaVersion === 1, 'Exported JSON has valid schemaVersion 1');
  assert(parsedAllExport.format === 'PAS_FOTO_IJAZAH_AI_PRESETS', 'Exported JSON has format PAS_FOTO_IJAZAH_AI_PRESETS');
  assert(Array.isArray(parsedAllExport.presets), 'Exported JSON presets is an array');
  assert(parsedAllExport.presetCount === parsedAllExport.presets.length, 'Exported presetCount matches array length');
  assert(parsedAllExport.presets.length >= 4, 'Includes default presets and newly saved preset');

  // Export selected only
  const exportSelectedJson = AIRecommendationPresetService.generateExportJSON([savedPreset]);
  const parsedSelected: ExportedAIPresetFile = JSON.parse(exportSelectedJson);
  assert(parsedSelected.presetCount === 1, 'Exported single selected preset presetCount is 1');
  assert(parsedSelected.presets[0].id === savedPreset.id, 'Exported single preset ID matches');

  // 4. Import Validation & Conflict Handling
  console.log('\n[TEST GROUP 4] Import Validation & Conflict Handling');

  // 4a. Corrupted file test
  let invalidParsed: any = null;
  try {
    invalidParsed = JSON.parse('invalid { json');
  } catch {
    invalidParsed = null;
  }
  const invalidJsonTest = AIRecommendationPresetService.validateImport(invalidParsed);
  assert(!invalidJsonTest.valid, 'Corrupted JSON correctly rejected');
  assert(Boolean(invalidJsonTest.error), 'Validation error returned for corrupted JSON');

  // 4b. Missing schema test
  const missingSchemaTest = AIRecommendationPresetService.validateImport({ hello: 'world' });
  assert(!missingSchemaTest.valid, 'JSON without presets array rejected');

  // 4c. Valid JSON preview & categorization
  const validImportResult = AIRecommendationPresetService.validateImport(parsedAllExport, listAfterSave);
  assert(validImportResult.valid, 'Valid exported JSON validated successfully');
  assert((validImportResult.summary?.toSkip ?? 0) > 0, 'Existing presets correctly categorized as toSkip (identical)');

  // 4d. Import with conflict mode: 'overwrite'
  // Create a modified copy of savedPreset
  const modifiedPreset: AIRecommendationPreset = {
    ...savedPreset,
    name: 'Pas Foto Ijazah — Custom Warm (Updated)',
    parameters: {
      ...savedPreset.parameters,
      contrast: 25,
    },
  };

  const importOverwriteResult = await AIRecommendationPresetService.applyImport([modifiedPreset], 'overwrite');
  assert(importOverwriteResult.updated === 1, 'Overwrite mode updated 1 matching preset');
  const updatedPreset = await AIRecommendationPresetService.getPresetById(savedPreset.id);
  assert(updatedPreset?.name === 'Pas Foto Ijazah — Custom Warm (Updated)', 'Preset name updated successfully');
  assert(updatedPreset?.parameters.contrast === 25, 'Preset parameter contrast updated to 25');

  // 4e. Import with conflict mode: 'add'
  const importAddResult = await AIRecommendationPresetService.applyImport([modifiedPreset], 'add');
  assert(importAddResult.added === 1, 'Add mode created a new copy with new ID');
  const allAfterAdd = await AIRecommendationPresetService.getPresets();
  const addedCopy = allAfterAdd.find((p) => p.name.includes('(Impor)') || p.name.includes('(Salinan)'));
  assert(Boolean(addedCopy), 'New preset created without overwriting existing');

  // 4f. Import with conflict mode: 'skip'
  const importSkipResult = await AIRecommendationPresetService.applyImport([modifiedPreset], 'skip');
  assert(importSkipResult.skipped === 1, 'Skip mode skipped duplicate without modifying');

  // 5. Update and Delete Preset
  console.log('\n[TEST GROUP 5] Update & Delete Operations');
  if (addedCopy) {
    const updated = await AIRecommendationPresetService.updatePreset(addedCopy.id, {
      notes: 'Updated notes via test',
    });
    assert(updated?.notes === 'Updated notes via test', 'Preset notes successfully updated');

    const deleted = await AIRecommendationPresetService.deletePreset(addedCopy.id);
    assert(deleted === true, 'Preset successfully deleted');
    const checkDeleted = await AIRecommendationPresetService.getPresetById(addedCopy.id);
    assert(checkDeleted === null, 'Deleted preset no longer retrievable');
  }

  // System presets cannot be deleted
  try {
    await AIRecommendationPresetService.deletePreset('system_preset_natural');
    assert(false, 'System preset cannot be deleted');
  } catch (err: any) {
    assert(err.message.includes('tidak dapat dihapus'), 'System preset cannot be deleted (threw expected error)');
  }

  // 6. Parameter Clamping & Safety
  console.log('\n[TEST GROUP 6] Parameter Clamping & Safety');
  const outOfRangeParams: AdjustmentParams = {
    exposureEV: 999, // Should clamp to 2
    brightness: -500, // Should clamp to -50
    contrast: 300, // Should clamp to 50
    highlights: -200, // Should clamp to -50
    shadows: 150, // Should clamp to 50
    whites: -99,
    blacks: 99,
    sharpening: 500, // Should clamp to 50
    noiseProtection: -10,
    faceDetail: 99,
    eyeDetail: 100, // Should clamp to 30
    hairDetail: 8,
    skinProtection: 100, // Should clamp to 30
    saturation: 0,
    temperature: 5500,
    tint: 0,
  };

  const clampedPreset = await AIRecommendationPresetService.savePreset({
    name: 'Clamped Safety Test',
    source: 'local',
    parameters: outOfRangeParams,
    targetTone: 'natural',
  });

  assert(clampedPreset.parameters.exposureEV === 1.0, 'ExposureEV clamped to maximum +1.0');
  assert(clampedPreset.parameters.brightness === -25, 'Brightness clamped to minimum -25');
  assert(clampedPreset.parameters.contrast === 25, 'Contrast clamped to maximum +25');
  assert(clampedPreset.parameters.eyeDetail === 25, 'Eye detail clamped to maximum +25');
  assert(clampedPreset.parameters.skinProtection === 25, 'Skin protection clamped to maximum +25');

  // Clean up test preset
  await AIRecommendationPresetService.deletePreset(clampedPreset.id);

  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL AI RECOMMENDATION PRESET TESTS PASSED SUCCESSFULLY!');
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
