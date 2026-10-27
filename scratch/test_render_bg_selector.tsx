import React from 'react';
import { renderToString } from 'react-dom/server';
import { BackgroundSelector } from '../src/components/BackgroundSelector';
import { DEFAULT_BG_SETTINGS, DEFAULT_MASK_BRUSH } from '../src/types/analysis';

try {
  const html = renderToString(
    <BackgroundSelector
      currentType="preserve"
      onSelectType={() => {}}
      customBgImage={null}
      onCustomBgUploaded={() => {}}
      customBgPreviewUrl={null}
      bgSettings={DEFAULT_BG_SETTINGS}
      onUpdateBgSettings={() => {}}
      bgRemovalMode="remove"
      brushSettings={DEFAULT_MASK_BRUSH}
    />
  );
  console.log('RENDER SUCCESSFUL! HTML length:', html.length);
} catch (e) {
  console.error('RENDER ERROR:', e);
}
